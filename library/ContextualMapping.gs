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
  var excludedSheets = ['Paramètres', 'Configuration'];
  
  sheets.forEach(function(s) {
    var name = s.getName();
    if (excludedSheets.indexOf(name) === -1 && !name.startsWith('Log_')) {
      availableSheets.push(name);
    }
  });
  
  if (availableSheets.indexOf(sheetName) === -1 && availableSheets.length > 0) {
    sheetName = availableSheets[0];
  }
  
  var idOnglet = getSheetId(sheetName);
  
  // 2. Modèle actuellement mappé (Lecture locale) - Utilise l'ID
  var currentModel = getTabMapping(idOnglet);
  
  // 3. Colonnes de l'onglet source
  var columns = getSheetColumns(sheetName);
  
  // 4. Mappings existants pour cet onglet - Utilise l'ID
  var existingMappings = getColumnMappings(idOnglet);
  
  // 5. Identifier les entêtes non mappés (ni champ Odoo ni "-- ne pas importer --")
  var unmappedHeaders = [];
  columns.forEach(function(header) {
    var mapping = existingMappings[header];
    // Si undefined ou null (pas dans le dictionnaire), c'est non mappé
    if (mapping === undefined || mapping === null) {
      unmappedHeaders.push(header);
    }
    // Si "" (chaîne vide), c'est "-- ne pas importer --", donc mappé
  });
  
  return {
    sheetName: sheetName,
    sheetId: idOnglet,
    availableSheets: availableSheets,
    currentModel: currentModel,
    columns: columns,
    existingMappings: existingMappings,
    unmappedHeaders: unmappedHeaders  // Nouveauté : liste des entêtes à mapper
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
    if (!config.url || !config.apiKey) {
      return { source: 'error', models: [], error: 'Configuration Odoo incomplète.' };
    }
    
    var odooModels = getModels(config, {excludeTech: true});
    
    // Mise à jour du cache en arrière-plan
    updateModelsCache(odooModels);
    
    return { source: 'odoo', models: odooModels };
  } catch (e) {
    Logger.log('Erreur chargement modèles Odoo: ' + e.toString());
    return { source: 'error', models: [], error: 'Connexion Odoo impossible : ' + e.message };
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
    if (!config.url || !config.apiKey) {
      Logger.log('Configuration Odoo incomplète pour le chargement des champs.');
      return [];
    }
    
    var rawFields = getFields(config, modelName);
    var formattedFields = formatFieldsForUI(rawFields);
    
    // Mise à jour du cache
    updateFieldsCache(modelName, formattedFields);
    
    return formattedFields;
  } catch (e) {
    Logger.log('Erreur chargement champs Odoo pour ' + modelName + ': ' + e.toString());
    // Retourner un tableau vide au lieu de crasher la sidebar
    return [];
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
    // Nettoyer les anciennes associations avant d'enregistrer la nouvelle
    cleanupOrphanMappings();

    var idOnglet = getSheetId(sheetName);
    if (!idOnglet) throw new Error("ID d'onglet introuvable pour " + sheetName);
    
    saveTabMapping(idOnglet, modelName);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Onglet introuvable");
    
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) return { success: true, message: "Onglet vide, rien à mapper" };
    
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    for (var colName in columnMappings) {
      if (!colName) continue; // On sauvegarde TOUS les champs, même si mapping vide (exclure)
      
      var fieldId = columnMappings[colName] || "";
      var colIndex = headers.indexOf(colName);
      
      if (colIndex !== -1) {
        var letter = getColumnLetter(colIndex + 1);
        setOdooField(idOnglet, letter, colName, fieldId);
      }
    }
    
    return { success: true, message: "Mapping sauvegardé avec succès" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Convertit un index de colonne (1-based) en lettre (ex: 1->A, 27->AA)
 */
function getColumnLetter(colIndex) {
  var temp, letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
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

/**
 * Appelle Gemini pour suggérer des mappings
 */
function getAiMappingSuggestions(headers, odooFields) {
  Logger.log("=== AI MAPPING START ===");
  console.log("=== AI MAPPING START ===");
  Logger.log("Headers count: " + headers.length);
  console.log("Headers count: " + headers.length);
  Logger.log("Odoo fields count: " + odooFields.length);
  console.log("Odoo fields count: " + odooFields.length);
  
  try {
    // 1. Récupération de la clé API
    Logger.log("Step 1: Retrieving API Key...");
    console.log("Step 1: Retrieving API Key...");
    var apiKey = getParameter('Google AI API Key');
    if (!apiKey) {
      Logger.log("ERROR: API Key manquante");
      console.error("ERROR: API Key manquante");
      throw new Error("Clé API Google AI manquante dans les paramètres.");
    }
    Logger.log("API Key found: " + apiKey.substring(0, 10) + "...");
    console.log("API Key found: " + apiKey.substring(0, 10) + "...");
    
    // 2. Préparation des données
    Logger.log("Step 2: Preparing data...");
    console.log("Step 2: Preparing data...");
    var simplifiedFields = odooFields.map(f => ({id: f.id, text: f.text}));
    Logger.log("Simplified fields prepared");
    console.log("Simplified fields prepared");
    
    // 3. Construction du prompt
    Logger.log("Step 3: Building prompt...");
    console.log("Step 3: Building prompt...");
    var prompt = "En tant qu'expert Odoo, suggère les associations les plus probables entre les entêtes de colonnes d'un tableur et les champs techniques d'un modèle Odoo.\n\n" +
                 "Entêtes du tableur : " + JSON.stringify(headers) + "\n\n" +
                 "Champs Odoo disponibles (id et label) : " + JSON.stringify(simplifiedFields) + "\n\n" +
                 "Règles :\n" +
                 "1. Propose uniquement des associations pertinentes.\n" +
                 "2. Si aucune correspondance n'est évidente, laisse le champ vide.\n" +
                 "3. Réponds UNIQUEMENT avec un objet JSON plat : {\"nom_entete\": \"id_champ_odoo\", ...}";
    
    Logger.log("Prompt length: " + prompt.length + " characters");
    console.log("Prompt length: " + prompt.length + " characters");

    // 4. Récupération de l'URL du moteur
    Logger.log("Step 4: Getting AI Engine URL...");
    console.log("Step 4: Getting AI Engine URL...");
    var baseUrl = getParameter('AI Engine URL') || "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";
    Logger.log("AI Engine URL: " + baseUrl);
    console.log("AI Engine URL: " + baseUrl);
    var url = baseUrl + "?key=" + apiKey;

    // 5. Préparation de la requête
    Logger.log("Step 5: Preparing request payload...");
    console.log("Step 5: Preparing request payload...");
    var payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    };
    
    var payloadStr = JSON.stringify(payload);
    Logger.log("Payload size: " + payloadStr.length + " bytes");
    console.log("Payload size: " + payloadStr.length + " bytes");

    var options = {
      method: "post",
      contentType: "application/json",
      payload: payloadStr,
      muteHttpExceptions: true
    };

    // 6. Appel à l'API
    Logger.log("Step 6: Calling Gemini API...");
    console.log("Step 6: Calling Gemini API...");
    Logger.log("URL: " + baseUrl);
    console.log("URL: " + baseUrl);
    
    var startTime = new Date().getTime();
    var response = UrlFetchApp.fetch(url, options);
    var endTime = new Date().getTime();
    var duration = (endTime - startTime) / 1000;
    
    Logger.log("Step 7: Response received in " + duration + " seconds");
    console.log("Step 7: Response received in " + duration + " seconds");
    
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    Logger.log("Response Code: " + responseCode);
    console.log("Response Code: " + responseCode);
    Logger.log("Response length: " + responseText.length + " bytes");
    console.log("Response length: " + responseText.length + " bytes");
    
    // 7. Vérification du code de réponse
    if (responseCode !== 200) {
      Logger.log("ERROR Response: " + responseText);
      console.error("ERROR Response: " + responseText);
      throw new Error("Erreur Gemini (Code " + responseCode + "): " + responseText);
    }

    // 8. Parsing de la réponse
    Logger.log("Step 8: Parsing response...");
    console.log("Step 8: Parsing response...");
    var result = JSON.parse(responseText);
    
    Logger.log("Response structure check:");
    console.log("Response structure check:");
    Logger.log("- Has candidates: " + (result.candidates ? "YES" : "NO"));
    console.log("- Has candidates: " + (result.candidates ? "YES" : "NO"));
    if (result.candidates && result.candidates[0]) {
      Logger.log("- Has content: " + (result.candidates[0].content ? "YES" : "NO"));
      console.log("- Has content: " + (result.candidates[0].content ? "YES" : "NO"));
      if (result.candidates[0].content && result.candidates[0].content.parts) {
        Logger.log("- Has parts: YES");
        console.log("- Has parts: YES");
        Logger.log("- Parts count: " + result.candidates[0].content.parts.length);
        console.log("- Parts count: " + result.candidates[0].content.parts.length);
      }
    }
    
    if (result.candidates && result.candidates[0] && result.candidates[0].content) {
      var aiText = result.candidates[0].content.parts[0].text;
      Logger.log("AI Response Text Raw: " + aiText);
      console.log("AI Response Text Raw: " + aiText);
      
      // Nettoyage du markdown éventuel (```json ... ```)
      aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      Logger.log("AI Response Text Cleaned: " + aiText);
      console.log("AI Response Text Cleaned: " + aiText);
      
      var suggestions = JSON.parse(aiText);
      Logger.log("Suggestions parsed successfully");
      console.log("Suggestions parsed successfully");
      Logger.log("Suggestions count: " + Object.keys(suggestions).length);
      console.log("Suggestions count: " + Object.keys(suggestions).length);
      Logger.log("=== AI MAPPING SUCCESS ===");
      console.log("=== AI MAPPING SUCCESS ===");
      
      return suggestions;
    }
    
    Logger.log("WARNING: No suggestions in response");
    console.warn("WARNING: No suggestions in response");
    Logger.log("Full response: " + JSON.stringify(result));
    console.log("Full response: " + JSON.stringify(result));
    Logger.log("=== AI MAPPING END (NO SUGGESTIONS) ===");
    console.log("=== AI MAPPING END (NO SUGGESTIONS) ===");
    return {};
    
  } catch (e) {
    Logger.log("=== AI MAPPING ERROR ===");
    console.error("=== AI MAPPING ERROR ===");
    Logger.log("Error message: " + e.message);
    console.error("Error message: " + e.message);
    Logger.log("Error stack: " + e.stack);
    console.error("Error stack: " + e.stack);
    throw e;
  }
}
