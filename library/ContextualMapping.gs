/**
 * ContextualMapping - Gestion de la sidebar contextuelle de mapping
 * Version optimisée avec Lazy Loading et Cache Persistant
 */

/**
 * 1. CHARGEMENT INITIAL (Rapide)
 * Récupère uniquement les infos locales : liste des onglets et modèle actuel.
 * Ne contacte PAS Odoo.
 * @param {String} targetSheetName - (Optionnel) Onglet spécifique ciblé
 */
function getInitialMappingData(targetSheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = ss.getActiveSheet();
  var sheetName = targetSheetName || activeSheet.getName();
  
  // 1. Liste des onglets valides
  var sheets = ss.getSheets();
  var availableSheets = [];
  var excludedSheets = ['Admin Logs', 'Paramètres', 'Configuration'];
  
  sheets.forEach(function(s) {
    var name = s.getName();
    if (excludedSheets.indexOf(name) === -1 && !name.startsWith('Log_')) {
      availableSheets.push(name);
    }
  });
  
  // Si l'onglet demandé n'est pas dans la liste (ex: Paramètres), prendre le premier dispo
  if (availableSheets.indexOf(sheetName) === -1 && availableSheets.length > 0) {
    sheetName = availableSheets[0];
  }
  
  // 2. Modèle actuellement mappé (Lecture locale)
  var currentModel = getTabMapping(sheetName);
  
  // 3. Colonnes de l'onglet source
  var columns = getSheetColumns(sheetName);
  
  // 4. Mappings existants pour cet onglet
  Logger.log('getInitialMappingData - sheetName: ' + sheetName);
  var existingMappings = getColumnMappings(sheetName);
  Logger.log('getInitialMappingData - existingMappings: ' + JSON.stringify(existingMappings));
  
  return {
    sheetName: sheetName,
    availableSheets: availableSheets,
    currentModel: currentModel,
    columns: columns,
    existingMappings: existingMappings
  };
}

/**
 * 2. CHARGEMENT DES MODÈLES (Asynchrone)
 * Tente le cache d'abord, sinon appelle Odoo
 * @param {Boolean} forceRefresh - Forcer l'appel Odoo
 */
function getContextualModels(forceRefresh) {
  // 1. Essayer le cache si pas de force refresh
  if (!forceRefresh) {
    var cachedModels = getModelsFromCache();
    if (cachedModels && cachedModels.length > 0) {
      return { source: 'cache', models: cachedModels };
    }
  }
  
  // 2. Appel Odoo
  try {
    var config = template_getOdooConfig();
    var odooModels = getModels(config, {excludeTech: true});
    
    // Mise à jour du cache en arrière-plan
    updateModelsCache(odooModels);
    
    return { source: 'odoo', models: odooModels };
  } catch (e) {
    Logger.log('Erreur chargement modèles Odoo: ' + e);
    return { source: 'error', models: [], error: e.message };
  }
}

/**
 * 3. CHARGEMENT DES CHAMPS (Asynchrone)
 * Tente le cache d'abord, sinon appelle Odoo
 * @param {String} modelName - Nom du modèle
 * @param {Boolean} forceRefresh - Forcer l'appel Odoo
 */
function getModelFields(modelName, forceRefresh) {
  if (!modelName) return [];

  // 1. Essayer le cache
  if (!forceRefresh) {
    var cachedFields = getFieldsFromCache(modelName);
    if (cachedFields && cachedFields.length > 0) {
      return cachedFields;
    }
  }
  
  // 2. Appel Odoo
  try {
    var config = template_getOdooConfig();
    var rawFields = getFields(config, modelName);
    var formattedFields = formatFieldsForUI(rawFields);
    
    // Mise à jour du cache
    updateFieldsCache(modelName, formattedFields);
    
    return formattedFields;
  } catch (e) {
    Logger.log('Erreur chargement champs Odoo: ' + e);
    throw e;
  }
}


/**
 * Récupère les en-têtes de colonnes d'un onglet
 * @param {String} sheetName - Nom de l'onglet
 * @return {Array} Liste des noms de colonnes
 */
function getSheetColumns(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return [];
  
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Filtrer les colonnes vides
  return headers.filter(function(header) {
    return header && header.toString().trim() !== '';
  });
}

/**
 * Logique de matching intelligent entre nom de colonne et champ Odoo
 * (Copie de la logique précédente)
 */
function matchColumnToField(columnName, fields) {
  if (!columnName || !fields || fields.length === 0) return null;
  
  var normalizedColumn = normalizeForMatching(columnName);
  
  var commonMappings = {
    'nom': 'name', 'name': 'name', 'prénom': 'firstname', 'prenom': 'firstname',
    'email': 'email', 'e-mail': 'email', 'mail': 'email',
    'téléphone': 'phone', 'telephone': 'phone', 'phone': 'phone', 'tel': 'phone',
    'mobile': 'mobile',
    'adresse': 'street', 'address': 'street', 'rue': 'street', 'street': 'street',
    'ville': 'city', 'city': 'city',
    'code postal': 'zip', 'codepostal': 'zip', 'zip': 'zip',
    'pays': 'country_id', 'country': 'country_id',
    'société': 'company_id', 'societe': 'company_id', 'company': 'company_id',
    'date': 'date',
    'référence': 'ref', 'reference': 'ref', 'ref': 'ref',
    'commentaire': 'comment', 'comment': 'comment', 'notes': 'note', 'note': 'note'
  };
  
  if (commonMappings[normalizedColumn]) {
    var mappedFieldId = commonMappings[normalizedColumn];
    var exactMatch = fields.find(function(f) { return f.id === mappedFieldId; });
    if (exactMatch) return exactMatch.id;
  }
  
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (field.string && normalizeForMatching(field.string) === normalizedColumn) return field.id;
  }
  
  for (var i = 0; i < fields.length; i++) {
    if (normalizeForMatching(fields[i].id) === normalizedColumn) return fields[i].id;
  }
  
  for (var j = 0; j < fields.length; j++) {
    var f = fields[j];
    if (f.string) {
      var norm = normalizeForMatching(f.string);
      if (normalizedColumn.indexOf(norm) !== -1 || norm.indexOf(normalizedColumn) !== -1) return f.id;
    }
  }
  
  for (var k = 0; k < fields.length; k++) {
    var f = fields[k];
    var norm = normalizeForMatching(f.id);
    if (normalizedColumn.indexOf(norm) !== -1 || norm.indexOf(normalizedColumn) !== -1) return f.id;
  }
  
  return null;
}

function normalizeForMatching(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Sauvegarde le mapping complet (contexte, modèle, colonnes)
 */
function saveContextualMapping(sheetName, modelName, columnMappings) {
  try {
    saveTabMapping(sheetName, modelName);
    
    for (var colName in columnMappings) {
      saveColumnMapping(sheetName, colName, columnMappings[colName]);
    }
    
    return { success: true, message: "Mapping sauvegardé avec succès" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Teste les données par rapport au mapping
 */
function testMappingData(sheetName, modelName, columnMappings) {
  // Réimplémentation de la logique de test (simplifiée pour le fichier)
  // ... (Garder la logique existante de `ContextualMapping.gs` précédent)
  // Pour éviter de perdre le code de test, je vais devoir récupérer l'ancien code.
  // Comme je suis en train d'écraser le fichier, je dois m'assurer de réinclure testMappingData
  
  // NOTE: Je vais utiliser multi_replace ou être prudent.
  // Mieux vaut réécrire le fichier complet avec le contenu précédent de testMappingData
  
  // ... [Code de testMappingData à insérer ici]
  return _internal_testMappingData(sheetName, modelName, columnMappings);
}

// Fonction interne pour garder le code propre
function _internal_testMappingData(sheetName, modelName, columnMappings) {
   // ... (Logique de validation step 354)
   // Je vais copier la logique depuis step 354
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "Onglet introuvable" };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: false, message: "Pas assez de données" };
    
    // Headers ligne 1
    var headers = data[0];
    
    // Identifier les index des colonnes mappées
    var colIndices = {};
    for (var colName in columnMappings) {
        var idx = headers.indexOf(colName);
        if (idx !== -1) {
            colIndices[colName] = idx;
        }
    }
    
    // Récupérer types de champs via cache/odoo
    var fields = getModelFields(modelName, false);
    var fieldTypes = {};
    fields.forEach(function(f) { fieldTypes[f.id] = f; });
    
    var errors = {};
    for (var mapCol in columnMappings) errors[mapCol] = [];
    
    var rowsToTest = Math.min(data.length - 1, 10);
    var errorCount = 0;
    
    for (var i = 1; i <= rowsToTest; i++) {
        var row = data[i];
        for (var colName in columnMappings) {
            var fieldId = columnMappings[colName];
            var colIdx = colIndices[colName];
            var value = row[colIdx];
            var fieldInfo = fieldTypes[fieldId];
            
            if (fieldInfo) {
                var error = validateValue(value, fieldInfo);
                if (error) {
                   errors[colName].push("Ligne " + (i+1) + ": " + error);
                   errorCount++;
                }
            }
        }
    }
    
    return {
        success: true,
        message: "Test terminé sur " + rowsToTest + " lignes",
        errorCount: errorCount,
        errors: errors
    };
}

function validateValue(value, fieldInfo) {
    if (fieldInfo.required && (value === "" || value === null)) return "Requis";
    
    switch(fieldInfo.type) {
        case 'integer':
            if (value !== "" && isNaN(parseInt(value))) return "Entier attendu";
            break;
        case 'float':
        case 'monetary':
            if (value !== "" && isNaN(parseFloat(value))) return "Nombre attendu";
            break;
        case 'date':
            if (value !== "" && !(value instanceof Date) && isNaN(Date.parse(value))) return "Date attendue";
            break;
        case 'boolean':
             // Google Sheets booléens sont TRUE/FALSE
             break;
    }
    return null;
}
