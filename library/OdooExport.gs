/**
 * OdooExport - Module de gestion de l'export vers Odoo
 */

/**
 * Prépare l'onglet actif pour l'export vers Odoo
 */
function prepareForExport() {
  return prepareForSync('export');
}

/**
 * Traite un lot de données pour l'export
 */
function processExportBatch(sheetName, rowsIndices) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    var sheetId = sheet.getSheetId().toString();
    var model = getTabMapping(sheetId);
    
    // Récupérer la config Odoo
    var config = template_getOdooConfig();
    if (!config.uid) {
        var authObj = testConnection(config);
        if (authObj.success && authObj.uid) {
            config.uid = authObj.uid;
        } else {
             throw new Error("Impossible de se connecter à Odoo: " + (authObj.message || "Erreur inconnue"));
        }
    }

    var mappings = getColumnMappings(sheetId);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Trouver la colonne ID Externe (soit par mapping 'xml_id', soit par nom exact)
    var idColIndex = -1;
    for (var colName in mappings) {
      if (mappings[colName] === 'xml_id') {
        idColIndex = headers.indexOf(colName);
        break;
      }
    }
    if (idColIndex === -1) {
      idColIndex = headers.indexOf("ID Externe");
    }
    
    var results = {
      successCount: 0,
      errorCount: 0,
      createdCount: 0,
      updatedCount: 0,
      errors: [],
      updates: [],
      logs: [],  // Logs visibles dans l'UI
      stop: false
    };

    // Récupérer les métadonnées des champs pour la résolution intelligente
    var fieldMeta = {};
    try {
      fieldMeta = getFields(config, model);
      results.logs.push('ℹ️ Analyse des types de champs Odoo réussie');
    } catch(e) {
      Logger.log("Erreur getFields: " + e.message);
      results.logs.push('⚠️ Impossible de récupérer les types de champs (la résolution auto des relations sera limitée)');
    }
    
    var relationCache = {}; // Cache pour éviter les recherches Odoo répétées
    
    if (idColIndex === -1) throw new Error("Colonne 'ID Externe' introuvable.");
    
    var range = sheet.getDataRange();
    var values = range.getValues();
    
    // Log de diagnostic initial
    var mappedFields = Object.keys(mappings).filter(function(k) { return mappings[k] && mappings[k] !== 'xml_id' && mappings[k] !== ''; });
    results.logs.push('🔍 Traitement de ' + rowsIndices.length + ' lignes avec ' + mappedFields.length + ' colonnes mappées');
    
    // Build field to header reverse mapping
    var fieldToHeader = {};
    for (var col in mappings) { if (mappings[col]) fieldToHeader[mappings[col]] = col; }

    // --- DEEP EXPORT : Pré-scan des dépendances ---
    try {
      ensureRelationalDependencies(config, model, rowsIndices, mappings, headers, fieldMeta, values, relationCache, fieldToHeader, results);
    } catch(e) {
      results.logs.push('⚠️ Erreur lors du pré-scan des dépendances: ' + e.message);
    }
    
    // Pour chaque ligne du lot (mais on s'arrête si stop=true)
    for (var i = 0; i < rowsIndices.length; i++) {
        var index = rowsIndices[i];
        var rowData = values[index + 1];
        var rowNumber = index + 2;
        
        try {
          var record = {};
          var externalId = rowData[idColIndex];
          
          for (var j = 0; j < headers.length; j++) {
            var colName = headers[j];
            var fieldName = mappings[colName];
            
            if (fieldName && fieldName !== 'xml_id' && fieldName !== '' && j !== idColIndex) {
              var val = rowData[j];
              if (val !== "") {
                 record[fieldName] = val;
              }
            }
          }
          
          if (Object.keys(record).length === 0) {
             // Skip empty rows with warning
             results.logs.push('⚠️ Ligne ' + rowNumber + ': Ignorée (aucun champ mappé ou toutes les valeurs vides)');
             continue;
          }
          
          // Build field to header reverse mapping for handleMissingRelation
          var fieldToHeaderLocal = {};
          for (var col in mappings) { if (mappings[col]) fieldToHeaderLocal[mappings[col]] = col; }
          
          // Résolution intelligente des relations (Many2one / Many2many)
          resolveRelationalValues(config, record, fieldMeta, relationCache, fieldToHeaderLocal);
          
          // Log what we're about to do
          var recordName = record.name || record.display_name || 'ID ' + rowNumber;
          
          var odooId = null;
          
          if (externalId && externalId.toString().trim() !== "") {
             var xmlIdFull = externalId.toString().trim();
             var module = 'odoo_rdd_export';
             var name = xmlIdFull;
             
             if (xmlIdFull.indexOf('.') !== -1) {
               var parts = xmlIdFull.split('.');
               module = parts[0];
               name = parts.slice(1).join('.');
             }

             // Check if record exists
             var res = odooSearchRead(config, 'ir.model.data', 
                 [['module', '=', module], ['name', '=', name]], 
                 ['res_id', 'model']
             );
             
             if (res && res.length > 0 && res[0].model === model) {
                 // Update existing record
                 odooId = res[0].res_id;
                 results.logs.push('🔄 Ligne ' + rowNumber + ': Mise à jour de "' + recordName + '"');
                 odooWrite(config, model, [odooId], record);
                 results.updatedCount++;
             } else {
                 // Create new record (external ID exists but not linked)
                 results.logs.push('➕ Ligne ' + rowNumber + ': Création de "' + recordName + '" (ID externe fourni)');
                 odooId = odooCreate(config, model, record);
                 createXmlId(config, model, odooId, externalId);
                 results.createdCount++; 
             }
          } else {
             // Create new record without external ID
             results.logs.push('➕ Ligne ' + rowNumber + ': Création de "' + recordName + '"');
             odooId = odooCreate(config, model, record);
             results.createdCount++;
             var newXmlId = 'export_' + model.replace(/\./g, '_') + '_' + new Date().getTime() + '_' + rowNumber;
             createXmlId(config, model, odooId, newXmlId);
             
             results.updates.push({
                 row: rowNumber,
                 col: idColIndex + 1,
                 value: newXmlId
             });
          }
          
          results.successCount++;
          
        } catch (e) {
          results.errorCount++;
          var cleanMsg = condenseOdooError(e.message);
          
          // Log plus détaillé pour le debug
          var errorDetail = "Ligne " + rowNumber + ": " + cleanMsg;
          if (Object.keys(record).length > 0) {
            errorDetail += " (Champs envoyés: " + Object.keys(record).join(', ') + ")";
          }
          
          results.errors.push(errorDetail);
          results.logs.push("❌ " + errorDetail);
          
          results.stop = true;
          break; 
        }
    }
    
    if (results.updates.length > 0) {
        results.updates.forEach(function(u) {
            sheet.getRange(u.row, u.col).setValue(u.value);
        });
    }
    
    return results;
    
  } catch (e) {
    var errorMsg = condenseOdooError(e.message);
    return {
        error: "Erreur globale batch: " + errorMsg,
        logs: ["❌ Erreur système: " + errorMsg],
        stop: true
    };
  }
}

/**
 * Résout intelligemment les valeurs des champs relationnels (noms -> IDs)
 */
function resolveRelationalValues(config, record, fieldMeta, cache, fieldToHeader) {
  for (var fieldName in record) {
    var val = record[fieldName];
    if (val === null || val === undefined || val === '') continue;
    
    var meta = fieldMeta[fieldName];
    if (!meta) continue;
    
    // On trim systématiquement les chaînes venant du GS
    if (typeof val === 'string') val = val.trim();
    
    try {
      if (meta.type === 'many2one' && typeof val === 'string' && isNaN(val)) {
        // C'est un nom dans un Many2one -> on cherche l'ID
        var foundIds = resolveNameListToIds(config, meta.relation, [val], cache);
        if (foundIds.length > 0) {
          record[fieldName] = foundIds[0];
        } else {
          // Si pas trouvé ici, le pré-scan a normalement déjà agi
          Logger.log("Relation toujours manquante après pré-scan: " + meta.relation + " pour " + val);
        }
      } 
      else if (meta.type === 'many2many' && typeof val === 'string') {
        // C'est potentiellement une liste séparée par des virgules
        var names = val.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s !== ""; });
        // Si c'est déjà des IDs numériques, on ne cherche pas
        if (names.length > 0 && !isNaN(names[0])) continue;
        
        var ids = resolveNameListToIds(config, meta.relation, names, cache);
        
        if (ids.length > 0) {
          // Odoo commande Many2many: [(6, 0, [ids])] (remplacer le contenu)
          record[fieldName] = [[6, 0, ids]];
        }
      }
      else if (meta.type === 'selection' && typeof val === 'string') {
        // Résolution des types Selection (ex: 'Contact' -> 'contact')
        var options = meta.selection || [];
        for (var k = 0; k < options.length; k++) {
          var pair = options[k]; // [key, label]
          if (pair[1].toLowerCase() === val.toLowerCase() || pair[0].toLowerCase() === val.toLowerCase()) {
            record[fieldName] = pair[0];
            break;
          }
        }
      }
    } catch(e) {
      Logger.log("Erreur résolution relation " + fieldName + ": " + e.message);
    }
  }
}

/**
 * Pré-scanne le lot pour identifier et créer les dépendances relationnelles manquantes
 */
function ensureRelationalDependencies(config, model, rowsIndices, mappings, headers, fieldMeta, values, relationCache, fieldToHeader, results) {
  var missingByModel = {}; // { model: { header: [names] } }
  
  // 1. Collecter tous les noms mentionnés dans les champs Many2one/Many2many
  for (var i = 0; i < rowsIndices.length; i++) {
    var index = rowsIndices[i];
    var rowData = values[index + 1];
    
    for (var j = 0; j < headers.length; j++) {
      var colName = headers[j];
      var fieldName = mappings[colName];
      if (!fieldName || !fieldMeta[fieldName]) continue;
      
      var meta = fieldMeta[fieldName];
      var val = rowData[j];
      if (!val || typeof val !== 'string') continue;
      
      if (meta.type === 'many2one' || meta.type === 'many2many') {
        var names = (meta.type === 'many2many') ? 
                    val.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s !== ""; }) : 
                    [val.trim()];
        
        if (names.length === 0 || !isNaN(names[0])) continue; // Skip numeric IDs
        
        missingByModel[meta.relation] = missingByModel[meta.relation] || { header: colName, names: [] };
        names.forEach(function(n) {
          if (missingByModel[meta.relation].names.indexOf(n) === -1) {
            missingByModel[meta.relation].names.push(n);
          }
        });
      }
    }
  }
  
  // 2. Vérifier ce qui manque REELLEMENT dans Odoo
  for (var relModel in missingByModel) {
    try {
      var entry = missingByModel[relModel];
      var foundIds = resolveNameListToIds(config, relModel, entry.names, relationCache);
      
      // Filtrer les noms qui n'ont pas été résolus
      var trulyMissing = entry.names.filter(function(name) {
        return !relationCache[relModel] || !relationCache[relModel][name.toLowerCase()];
      });
      
      if (trulyMissing.length > 0) {
        results.logs.push('📦 ' + trulyMissing.length + ' dépendances manquantes identifiées pour ' + entry.header + ' (' + relModel + ')');
        
        // 1. Sync Odoo -> GS d'abord pour être sûr de ne pas recréer ce qui existe déjà
        var relSheet = findOrCreateSheetForModel(config, relModel, entry.header);
        syncOdooRecordsToSheet(config, relModel, relSheet, results);
        
        // 2. Refaire une recherche par nom dans le cache rafraîchi par la sync (Odoo-first)
        resolveNameListToIds(config, relModel, trulyMissing, relationCache);
        
        // 3. Filtrer à nouveau : ce qui manque vraiment après sync Odoo
        var stillMissing = trulyMissing.filter(function(name) {
          return !relationCache[relModel] || !relationCache[relModel][name.toLowerCase()];
        });
        
        if (stillMissing.length > 0) {
          handleMissingRelationBulk(config, relModel, stillMissing, entry.header, results, relSheet);
        }
        
        // 4. Rafraîchir le cache final après l'export auto
        resolveNameListToIds(config, relModel, trulyMissing, relationCache);
      }
    } catch(e) {
      Logger.log("Erreur ensureRelationalDependencies for " + relModel + ": " + e.message);
    }
  }
}

/**
 * Gère les relations manquantes en bloc : injecte dans l'onglet et lance un export auto
 */
function handleMissingRelationBulk(config, model, names, headerName, results, providedSheet) {
  if (!names || names.length === 0) return;
  
  try {
    // 1. Trouver ou créer l'onglet
    var sheet = providedSheet || findOrCreateSheetForModel(config, model, headerName);
    if (!sheet) return;
    
    // 2. Récupérer les données existantes (Nom est en col 2)
    var lastRow = sheet.getLastRow();
    var existingNames = [];
    if (lastRow > 1) {
      var nameValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      existingNames = nameValues.map(function(row) { return String(row[0]).trim().toLowerCase(); });
    }
    
    // 3. Filtrer les nouveaux
    var toAdd = names.filter(function(n) { return !existingNames.includes(n.toLowerCase()); });
    
    if (toAdd.length > 0) {
      var newRows = toAdd.map(function(name) { return ["", name]; }); // ID Externe vide
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 2).setValues(newRows);
      
      results.logs.push('📝 ' + toAdd.length + ' nouveaux enregistrements ajoutés dans l\'onglet "' + sheet.getName() + '"');
      
      // 5. AUTO-EXPORT de l'onglet de dépendance
      results.logs.push('🚀 Lancement de l\'export automatique pour "' + sheet.getName() + '"...');
      
      // On récupère les indices des lignes à exporter
      var indices = [];
      for (var k = 0; k < toAdd.length + (lastRow > 1 ? lastRow - 1 : 0); k++) { indices.push(k); }
      
      var subResults = processExportBatch(sheet.getName(), indices);
      
      if (subResults.error) {
        results.logs.push('❌ Échec de l\'export auto pour "' + sheet.getName() + '": ' + subResults.error);
      } else {
        results.logs.push('✅ Export auto terminé pour "' + sheet.getName() + '" (' + subResults.successCount + ' succès)');
      }
    }
  } catch(e) {
    Logger.log("Erreur handleMissingRelationBulk: " + e.message);
    results.logs.push('❌ Erreur lors de la gestion bulk de ' + headerName + ': ' + e.message);
  }
}

/**
 * Trouve un onglet mappé au modèle ou en crée un nouveau
 */
function findOrCreateSheetForModel(config, model, headerName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Chercher dans le mapping existant
  var modelsMapping = readSmartTable('ODOO_MODELS');
  var mapping = modelsMapping.find(function(m) { return m['Modèle Odoo'] === model; });
  
  var sheet;
  if (mapping && mapping['ID Onglet']) {
    sheet = getSheetById(mapping['ID Onglet']);
  }
  
  // Si pas d'onglet, on le crée
  if (!sheet) {
    var sheetName = headerName || model.replace(/\./g, '_');
    var baseName = sheetName;
    var counter = 1;
    while (ss.getSheetByName(sheetName)) {
      sheetName = baseName + "_" + counter++;
    }
    
    sheet = ss.insertSheet(sheetName);
    var idOnglet = sheet.getSheetId().toString();
    
    // Créer les entêtes
    sheet.getRange(1, 1, 1, 2).setValues([["ID Externe", "Nom"]]).setFontWeight('bold');
    
    // Enregistrer le mapping
    saveTabMapping(idOnglet, model);
    saveColumnMapping(idOnglet, "ID Externe", "xml_id");
    saveColumnMapping(idOnglet, "Nom", "name");
    
    // Synchroniser immédiatement les données existantes d'Odoo
    syncOdooRecordsToSheet(config, model, sheet);
    
    Logger.log("Nouvel onglet créé pour " + model + ": " + sheetName);
  }
  
  return sheet;
}

/**
 * Synchronise les enregistrements d'Odoo vers l'onglet Google Sheets
 */
function syncOdooRecordsToSheet(config, model, sheet, results) {
  if (!sheet) return;
  
  try {
    var idOnglet = sheet.getSheetId().toString();
    var mappings = getColumnMappings(idOnglet);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Identifier les colonnes xml_id et name
    var idColIndex = -1, nameColIndex = -1;
    for (var j = 0; j < headers.length; j++) {
      if (mappings[headers[j]] === 'xml_id') idColIndex = j;
      if (mappings[headers[j]] === 'name') nameColIndex = j;
    }
    
    if (nameColIndex === -1) return; // Impossible de mapper sans Nom
    
    // 1. Récupérer tous les records d'Odoo pour ce modèle
    var odooRecords = odooSearchRead(config, model, [], ['id', 'display_name']);
    if (!odooRecords || odooRecords.length === 0) return;
    
    // 2. Récupérer les XML IDs correspondants (si possible)
    var xmlIds = {};
    try {
      var irModelData = odooSearchRead(config, 'ir.model.data', [
        ['model', '=', model],
        ['res_id', 'in', odooRecords.map(function(r) { return r.id; })]
      ], ['res_id', 'module', 'name']);
      
      irModelData.forEach(function(d) {
        xmlIds[d.res_id] = d.module + "." + d.name;
      });
    } catch(e) {
      Logger.log("Impossible de récupérer les XML IDs pour " + model);
    }
    
    // 3. Lire les données locales actuelles
    var lastRow = sheet.getLastRow();
    var localData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
    var localMap = {}; // { name.toLowerCase(): rowIndex }
    localData.forEach(function(row, idx) {
      var name = String(row[nameColIndex]).trim().toLowerCase();
      if (name) localMap[name] = idx;
    });
    
    // 4. Fusionner : Mettre à jour l'ID externe ou ajouter les nouveaux
    var toAppend = [];
    var updateCount = 0;
    
    odooRecords.forEach(function(r) {
      var name = r.display_name.trim();
      var xid = xmlIds[r.id] || "";
      var localIdx = localMap[name.toLowerCase()];
      
      if (localIdx !== undefined) {
        // Déjà présent : on s'assure que l'ID externe est là s'il manquait
        if (idColIndex !== -1 && !localData[localIdx][idColIndex] && xid) {
          sheet.getRange(localIdx + 2, idColIndex + 1).setValue(xid);
          updateCount++;
        }
      } else {
        // Nouveau record venant d'Odoo
        var newRow = new Array(headers.length).fill("");
        if (idColIndex !== -1) newRow[idColIndex] = xid;
        newRow[nameColIndex] = name;
        toAppend.push(newRow);
      }
    });
    
    if (toAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, headers.length).setValues(toAppend);
    }
    
    if (results && (toAppend.length > 0 || updateCount > 0)) {
       results.logs.push('🔄 Synchronisation miroir terminée pour "' + sheet.getName() + '" : ' + toAppend.length + ' ajoutés, ' + updateCount + ' mis à jour.');
    }
  } catch(e) {
    Logger.log("Erreur syncOdooRecordsToSheet for " + model + ": " + e.message);
  }
}

/**
 * Condense les messages d'erreur Odoo pour l'utilisateur
 */
function condenseOdooError(msg) {
    if (!msg) return "Erreur inconnue";
    
    // Remove "Erreur Odoo: " prefix if present
    if (msg.indexOf('Erreur Odoo: ') === 0) {
        msg = msg.substring(13); // "Erreur Odoo: ".length = 13
    }
    
    // Si c'est déjà court et sans traceback
    if (msg.length < 150 && msg.indexOf('Traceback') === -1 && msg.indexOf('File "') === -1) {
        return cleanupErrorMessage(msg);
    }

    // Extraction des erreurs Python connues
    var errorPatterns = [
        /ValidationError:\s*'([^']+)'/i,
        /ValidationError:\s*"([^"]+)"/i,
        /ValidationError:\s*(.+?)(?:\n|$)/i,
        /ValueError:\s*(.+?)(?:\n|$)/i,
        /required field.*?'([^']+)'/i,
        /missing required field.*?'([^']+)'/i,
        /Wrong value for.*?'([^']+)'.*?'([^']+)'/i,
        /Error:\s*'([^']+)'/i,
        /Error:\s*"([^"]+)"/i
    ];
    
    for (var i = 0; i < errorPatterns.length; i++) {
        var match = msg.match(errorPatterns[i]);
        if (match) {
            var extracted = match[1] || match[0];
            if (match[2]) {
                extracted = extracted + ": " + match[2];
            }
            return cleanupErrorMessage(extracted);
        }
    }
    
    if (msg.indexOf('singleton') !== -1 && msg.indexOf('Expected singleton') !== -1) {
        return "Erreur de données: valeur unique attendue (vérifiez le format des champs relationnels)";
    }
    
    var lines = msg.split('\n');
    for (var j = 0; j < lines.length; j++) {
        var line = lines[j].trim();
        if (line && 
            line.indexOf('Traceback') === -1 && 
            line.indexOf('File "') === -1 &&
            line.indexOf('line ') === -1 &&
            line.length > 10) {
            return cleanupErrorMessage(line.substring(0, 200));
        }
    }
    
    return cleanupErrorMessage(msg.substring(0, 150) + "...");
}

/**
 * Nettoie le message d'erreur pour l'affichage
 */
function cleanupErrorMessage(msg) {
    msg = msg.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    msg = msg.replace(/\s+/g, ' ').trim();
    return msg;
}

function createXmlId(config, model, resId, xmlId) {
    var payload = {
        'name': xmlId,
        'module': 'odoo_rdd_export',
        'model': model,
        'res_id': resId,
        'noupdate': false
    };
    try {
        odooCreate(config, 'ir.model.data', payload);
    } catch(e) {
        Logger.log("Erreur création xml_id (peut-être existant): " + e.message);
    }
}
