/**
 * TemplateLogic - Logique métier du Template
 */

// ===== LIFECYCLE HOOKS =====

function template_onEdit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    var sheetName = sheet.getName();
    
    if (range.getRow() === 2 && sheetName !== 'Paramètres' && sheetName !== 'Log' && sheetName !== 'Rapport Tests') {
      var col = range.getColumn();
      var header = sheet.getRange(1, col).getValue();
      var value = range.getValue();
      
      if (header && value) {
        var fieldMatch = value.match(/\((.*?)\)/);
        if (fieldMatch && fieldMatch[1]) {
          var fieldName = fieldMatch[1];
          if (typeof saveColumnMapping === 'function') {
            saveColumnMapping(sheetName, header, fieldName);
          }
        }
      }
    }
  } catch (error) {
    Logger.log('Erreur dans onEdit: ' + error.toString());
  }
}

function template_onOpen(e) {
  try {
    if (!e || !e.authMode || e.authMode === ScriptApp.AuthMode.NONE) {
      template_createOnOpenTrigger();
      return;
    }
    
    template_ensureParamsSheet();
    
    var config = template_getOdooConfig();
    var configComplete = config.url && config.database && config.user && config.apiKey;
    
    var ui = SpreadsheetApp.getUi();
    template_createOdooMenu(null);
    
    if (!configComplete) {
      ui.alert(
        'Configuration requise',
        'Veuillez configurer la connexion Odoo.\n\nUtilisez le menu "Odoo RDD > Configuration" pour accéder au formulaire de configuration.',
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    Logger.log('Erreur dans onOpen: ' + error.toString());
    try {
      var ui = SpreadsheetApp.getUi();
      if (ui) template_createOdooMenu(null);
    } catch (e) {}
  }
}

function template_createOnOpenTrigger() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'onOpen') {
        try {
          ScriptApp.deleteTrigger(trigger);
        } catch (e) {}
      }
    });
    
    ScriptApp.newTrigger('onOpen').onOpen().create();
    Logger.log('Trigger installable créé');
  } catch (error) {
    Logger.log('Erreur lors de la création du trigger: ' + error.toString());
  }
}

// ===== PARAMETERS MANAGEMENT =====

function template_ensureParamsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  
  if (!paramsSheet) {
    paramsSheet = ss.insertSheet('Paramètres');
    
    // Headers for PARAMETERS table (A1:B1)
    paramsSheet.getRange('A1').setValue('Paramètre');
    paramsSheet.getRange('B1').setValue('Valeur');
    paramsSheet.getRange('A2').setValue('Odoo URL');
    paramsSheet.getRange('A3').setValue('Odoo Database');
    paramsSheet.getRange('A4').setValue('Odoo User');
    paramsSheet.getRange('A5').setValue('Odoo API Key');
    paramsSheet.getRange('A6').setValue('Google AI API Key');
    paramsSheet.getRange('A1:B1').setFontWeight('bold');
    
    // Headers for ODOO_MODELS table (D1:E1)
    paramsSheet.getRange('D1').setValue('Onglets');
    paramsSheet.getRange('E1').setValue('Modèle Odoo');
    paramsSheet.getRange('D1:E1').setFontWeight('bold');
    
    // Headers for ODOO_FIELDS table (G1:J1)
    paramsSheet.getRange('G1').setValue('Onglet');
    paramsSheet.getRange('H1').setValue('Colonne');
    paramsSheet.getRange('I1').setValue('Entête');
    paramsSheet.getRange('J1').setValue('Champ Odoo');
    paramsSheet.getRange('G1:J1').setFontWeight('bold');
    
    // Headers for ODOO_CACHE table (L1:M1)
    paramsSheet.getRange('L1').setValue('models');
    paramsSheet.getRange('M1').setValue('fields');
    paramsSheet.getRange('L1:M1').setFontWeight('bold');
    
    // Column widths
    paramsSheet.setColumnWidth(1, 200);  // A
    paramsSheet.setColumnWidth(2, 300);  // B
    paramsSheet.setColumnWidth(4, 150);  // D
    paramsSheet.setColumnWidth(5, 200);  // E
    paramsSheet.setColumnWidth(7, 120);  // G
    paramsSheet.setColumnWidth(8, 120);  // H
    paramsSheet.setColumnWidth(9, 150);  // I
    paramsSheet.setColumnWidth(10, 150); // J
    paramsSheet.setColumnWidth(12, 200); // L
    paramsSheet.setColumnWidth(13, 500); // M
  }
  
  try {
    paramsSheet.hideSheet();
  } catch (e) {}
}

function template_getOdooConfig() {
  try {
    var url = getParameter('Odoo URL') || '';
    var database = getParameter('Odoo Database') || '';
    var user = getParameter('Odoo User') || '';
    var apiKey = getParameter('Odoo API Key') || '';
    var googleAiKey = getParameter('Google AI API Key') || '';
    
    return {
      url: normalizeOdooUrl(url),
      database: database,
      user: user,
      apiKey: apiKey,
      googleAiKey: googleAiKey
    };
  } catch (e) {
    Logger.log('Erreur dans template_getOdooConfig: ' + e.toString());
    return { url: '', database: '', user: '', apiKey: '' };
  }
}

function template_saveConfig(config) {
  try {
    if (!config.url || !config.database || !config.user || !config.apiKey) {
      return { success: false, message: 'Configuration Odoo incomplète.' };
    }
    
    config.url = normalizeOdooUrl(config.url);
    
    template_ensureParamsSheet();
    
    setParameter('Odoo URL', config.url);
    setParameter('Odoo Database', config.database);
    setParameter('Odoo User', config.user);
    setParameter('Odoo API Key', config.apiKey);
    setParameter('Google AI API Key', config.googleAiKey || '');
    
    var testResult = template_testOdooConnection(config);
    var errorFields = template_identifyErrorFields(config, testResult);
    
    var message = 'Configuration enregistrée avec succès.';
    if (testResult && testResult.success) {
      message += '\n\n✅ Connexion à Odoo réussie!\n\nVeuillez recharger le document pour mettre à jour le menu.';
    } else {
      message += '\n\n❌ La connexion a échoué. Veuillez vérifier les paramètres.\n\nVeuillez recharger le document après correction pour mettre à jour le menu.';
    }
    
    return {
      success: true,
      message: message,
      connectionTest: testResult,
      errorFields: errorFields
    };
  } catch (error) {
    Logger.log('Erreur dans saveConfig: ' + error.toString());
    return {
      success: false,
      message: 'Erreur lors de l\'enregistrement: ' + error.toString()
    };
  }
}

function template_testOdooConnection(config) {
  try {
    if (!config) {
      config = template_getOdooConfig();
    }
    if (!config.url || !config.database || !config.user || !config.apiKey) {
      return {
        success: false,
        message: 'Paramètres incomplets.'
      };
    }
    config.url = normalizeOdooUrl(config.url);
    
    if (typeof testConnection === 'function') {
      return testConnection(config);
    } else {
      return { success: false, message: 'Fonction testConnection introuvable dans la librairie.' };
    }
  } catch (error) {
    return { success: false, message: 'Erreur lors du test: ' + error.toString() };
  }
}

function template_identifyErrorFields(config, testResult) {
  var errorFields = {};
  if (!config.url || !config.url.trim()) errorFields.url = true;
  if (!config.database || !config.database.trim()) errorFields.database = true;
  if (!config.user || !config.user.trim()) errorFields.user = true;
  if (!config.apiKey || !config.apiKey.trim()) errorFields.apiKey = true;
  
  if (testResult && !testResult.success) {
    if (testResult.errorType === 'database') {
      errorFields.database = true;
    } else if (testResult.errorType === 'credentials') {
      errorFields.user = true;
      errorFields.apiKey = true;
    } else if (testResult.errorType === 'connection' || testResult.errorType === 'url') {
      errorFields.url = true;
    } 
    
    if (testResult.errorFields) {
      for (var f in testResult.errorFields) {
        errorFields[f] = true;
      }
    }
  }
  return errorFields;
}

// ===== UI SERVICE (Fusionné depuis UIService.gs) =====

function template_showConfigSidebar(errorFields) {
  PropertiesService.getUserProperties().setProperty('SIDEBAR_MODE', 'CONFIG');
  if (errorFields) {
    PropertiesService.getUserProperties().setProperty('SIDEBAR_CONFIG_ERRORS', JSON.stringify(errorFields));
  }
  return createUnifiedSidebar();
}

function template_showContextualMappingSidebar() {
  PropertiesService.getUserProperties().setProperty('SIDEBAR_MODE', 'MAPPING');
  return createUnifiedSidebar();
}

function template_showFormattingSidebar() {
  PropertiesService.getUserProperties().setProperty('SIDEBAR_MODE', 'FORMATTING');
  return createUnifiedSidebar();
}

function createUnifiedSidebar() {
  Logger.log('createUnifiedSidebar called');
  try {
    var html = HtmlService.createHtmlOutputFromFile('UnifiedSidebar');
    html.setTitle('Odoo RDD')
      .setWidth(400);
    Logger.log('UnifiedSidebar created successfully');
    return html;
  } catch (e) {
    Logger.log('ERROR in createUnifiedSidebar: ' + e.toString());
    return HtmlService.createHtmlOutput('<h3>Erreur chargement Sidebar</h3><p>' + e.toString() + '</p>')
      .setTitle('Erreur')
      .setWidth(400);
  }
}

function getSidebarMode() {
  var mode = PropertiesService.getUserProperties().getProperty('SIDEBAR_MODE') || 'CONFIG';
  var errorsJson = PropertiesService.getUserProperties().getProperty('SIDEBAR_CONFIG_ERRORS');
  
  var result = {
    mode: mode,
    configErrors: errorsJson ? JSON.parse(errorsJson) : {},
    config: null
  };
  
  if (mode === 'CONFIG') {
    result.config = template_getOdooConfig();
  }
  
  // Nettoyer les erreurs après lecture
  PropertiesService.getUserProperties().deleteProperty('SIDEBAR_CONFIG_ERRORS');
  
  return result;
}

/**
 * Applique le formatage standard à l'onglet actif.
 */
function formatActiveSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // 0. Suppression des lignes et colonnes vides
    var maxRows = sheet.getMaxRows();
    var lastRow = sheet.getLastRow();
    if (maxRows > lastRow && lastRow > 0) {
      sheet.deleteRows(lastRow + 1, maxRows - lastRow);
    }
    
    var maxCols = sheet.getMaxColumns();
    var lastCol = sheet.getLastColumn();
    if (maxCols > lastCol && lastCol > 0) {
      sheet.deleteColumns(lastCol + 1, maxCols - lastCol);
    }

    // 1. Supprimer les bordures sur toute la plage utilisée
    var range = sheet.getDataRange();
    if (range.getNumRows() > 0) {
      range.setBorder(false, false, false, false, false, false);
      
      // 2. Police par défaut (sans serif), taille 10
      range.setFontFamily('Roboto'); // Plus proche du thème standard que Arial
      range.setFontSize(10);
      
      // 3. Figer la première ligne
      sheet.setFrozenRows(1);
      
      // 4. En-tête (Ligne 1) : Gras, Fond Noir, Texte Blanc
      var headerRange = sheet.getRange(1, 1, 1, range.getLastColumn());
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#000000');
      headerRange.setFontColor('#ffffff');
      
      // 5. Mise en place des filtres
      if (sheet.getFilter()) {
        sheet.getFilter().remove();
      }
      range.createFilter();
      
      return { success: true, message: "Mise en forme appliquée avec succès." };
    }
    return { success: false, message: "L'onglet est vide." };
  } catch (e) {
    Logger.log('Error in formatActiveSheet: ' + e.toString());
    return { success: false, message: "Erreur lors du formatage: " + e.toString() };
  }
}

// ===== MENU =====

function template_createOdooMenu(statusEmoji) {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.createMenu('Odoo RDD').addToUi();
    ui.createMenu('🟢 Odoo RDD').addToUi();
    ui.createMenu('🔴 Odoo RDD').addToUi();
  } catch (e) {}
  
  var menuName = statusEmoji ? statusEmoji + ' Odoo RDD' : 'Odoo RDD';
  
  ui.createMenu(menuName)
    .addItem('Configuration', 'showConfigSidebar')
    .addItem('Autoriser l\'IA', 'activateAIAuthorizationFromMenu')
    .addSeparator()
    .addSubMenu(ui.createMenu('Traitement des données')
      .addItem('💡 Mapping', 'showContextualMappingSidebar')
      .addSeparator()
      .addItem('Dédoublonnage', 'showPlaceholder')
      .addItem('Formatage', 'showFormattingSidebar')
      .addItem('Enrichissement', 'showEnrichmentSidebar')
      .addItem('Validation', 'showPlaceholder'))
    .addSubMenu(ui.createMenu('Odoo Sync')
      .addItem('Echantillon onglet', 'showPlaceholder')
      .addItem('Echantillon global', 'showPlaceholder')
      .addItem('Importation', 'showPlaceholder'))
    .addSubMenu(ui.createMenu('Outils')
      .addItem('Tester la connexion', 'testConnectionFromMenu')
      .addItem('Debug: Lister modèles', 'debugGetModels')
      .addItem('Debug: Test Config Sidebar', 'debug_TestConfigSidebarGeneration')
      .addItem('Réparation', 'showPlaceholder'))
    .addToUi();
}

function debug_TestConfigSidebarGeneration() {
  Logger.log('=== START DEBUG SIDEBAR ===');
  try {
    var html = template_showConfigSidebar();
    Logger.log('Output Type: ' + (html ? html.toString() : 'null'));
    if (html) {
       var content = html.getContent();
       Logger.log('HTML Content length: ' + content.length);
       Logger.log('HTML Content start: ' + content.substring(0, 100));
    }
  } catch(e) {
    Logger.log('*** ERROR GENERATING SIDEBAR: ' + e.toString() + ' ***');
    Logger.log('Stack: ' + e.stack);
  }
  Logger.log('=== END DEBUG SIDEBAR ===');
}

// ===== TESTING & DEBUGGING =====

function template_testConnectionFromMenu() {
  var config = template_getOdooConfig();
  var testResult = template_testOdooConnection(config);
  var ui = SpreadsheetApp.getUi();
  
  if (testResult.success) {
    ui.alert(
      'Test de connexion Odoo',
      '✅ Connexion réussie!\n\nL\'instance Odoo est accessible.',
      ui.ButtonSet.OK
    );
  } else {
    var errorFields = template_identifyErrorFields(config, testResult);
    var errorMessage = testResult.message || 'Erreur de connexion';
    ui.alert(
      'Test de connexion Odoo',
      '❌ Connexion échouée\n\n' + errorMessage,
      ui.ButtonSet.OK
    );
    var html = template_showConfigSidebar(errorFields);
    ui.showSidebar(html);
  }
}

function template_showConnectionResult(result) {
  var ui = SpreadsheetApp.getUi();
  var title = 'Configuration Odoo';
  var msg = result.message || 'Opération terminée.';
  
  if (result.connectionTest && result.connectionTest.success) {
    title = 'Connexion Réussie';
  } else {
    title = 'Attention';
  }
  
  ui.alert(title, msg, ui.ButtonSet.OK);
}

function template_activateAIAuthorization() {
  try {
    var url = "https://generativelanguage.googleapis.com/";
    UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    try {
      var ui = SpreadsheetApp.getUi();
      ui.alert('IA Activée', 'L\'autorisation pour l\'IA a été validée avec succès.', ui.ButtonSet.OK);
    } catch (e) {}
    
    return { success: true, message: "L'autorisation pour l'IA a été validée." };
  } catch (e) {
    return { success: false, message: "Erreur lors de l'activation : " + e.toString() };
  }
}

// ===== ENRICHMENT SIDEBAR =====

function template_showEnrichmentSidebar() {
  PropertiesService.getUserProperties().setProperty('SIDEBAR_MODE', 'ENRICHMENT');
  return createUnifiedSidebar();
}

function enrichment_checkBackup() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    var backupName = 'BACKUP_' + activeSheet.getName();
    var backupSheet = ss.getSheetByName(backupName);
    return backupSheet !== null;
  } catch (e) {
    Logger.log('Error in enrichment_checkBackup: ' + e.toString());
    return false;
  }
}

function enrichment_saveBackup() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    var backupName = 'BACKUP_' + activeSheet.getName();
    
    // Supprimer le backup existant s'il existe
    var existingBackup = ss.getSheetByName(backupName);
    if (existingBackup) {
      ss.deleteSheet(existingBackup);
    }
    
    // Créer une copie
    var backup = activeSheet.copyTo(ss);
    backup.setName(backupName);
    backup.hideSheet();
    
    return { success: true, message: 'Backup créé avec succès : ' + backupName };
  } catch (e) {
    Logger.log('Error in enrichment_saveBackup: ' + e.toString());
    return { success: false, message: 'Erreur lors de la création du backup : ' + e.toString() };
  }
}

function enrichment_restoreBackup() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    var originalName = activeSheet.getName();
    var originalIndex = activeSheet.getIndex();
    var backupName = 'BACKUP_' + originalName;
    var backupSheet = ss.getSheetByName(backupName);
    
    if (!backupSheet) {
      return { success: false, message: 'Aucun backup trouvé pour cet onglet.' };
    }
    
    // 1. Dupliquer le backup
    var restoredSheet = backupSheet.copyTo(ss);
    
    // 2. Supprimer l'onglet original
    // Note: On change le nom de l'onglet original d'abord pour éviter les conflits de noms si besoin
    activeSheet.setName(originalName + '_OLD_' + new Date().getTime());
    ss.deleteSheet(activeSheet);
    
    // 3. Configurer le nouvel onglet
    restoredSheet.setName(originalName);
    restoredSheet.showSheet();
    
    // 4. Replacer l'onglet à sa position d'origine
    ss.setActiveSheet(restoredSheet);
    ss.moveActiveSheet(originalIndex);
    
    return { success: true, message: 'Backup rétabli avec succès (onglet remplacé).' };
  } catch (e) {
    Logger.log('Error in enrichment_restoreBackup: ' + e.toString());
    return { success: false, message: 'Erreur lors du rétablissement : ' + e.toString() };
  }
}

function enrichment_populateStates() {
  try {
    var config = template_getOdooConfig();
    var apiKey = config.googleAiKey;
    
    if (!apiKey) {
      return { success: false, message: 'Clé API Google AI manquante. Configurez-la dans Odoo RDD > Configuration.' };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    var sheetName = activeSheet.getName();
    
    // Récupérer le mapping des champs
    var mappings = readSmartTable('ODOO_FIELDS');
    var sheetMappings = mappings.filter(function(m) { return m['Onglet'] === sheetName; });
    
    if (sheetMappings.length === 0) {
      return { success: false, message: 'Vous devez d\'abord mapper les champs disponibles avec ceux d\'Odoo via le menu "Odoo RDD > Traitement des données > Mapping".' };
    }
    
    // Trouver les colonnes d'adresse
    var addressFields = {
      street: null, street2: null, zip: null, city: null, state: null, country: null
    };
    
    var headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    
    for (var i = 0; i < sheetMappings.length; i++) {
      var mapping = sheetMappings[i];
      var odooField = mapping['Champ Odoo'];
      var colName = mapping['Entête'];  // Use header name instead of column letter
      var colIndex = headers.indexOf(colName);
      
      if (colIndex >= 0) {
        if (odooField === 'street') addressFields.street = colIndex + 1;
        else if (odooField === 'street2') addressFields.street2 = colIndex + 1;
        else if (odooField === 'zip') addressFields.zip = colIndex + 1;
        else if (odooField === 'city') addressFields.city = colIndex + 1;
        else if (odooField === 'state_id') addressFields.state = colIndex + 1;
        else if (odooField === 'country_id') addressFields.country = colIndex + 1;
      }
    }
    
    if (!addressFields.state) {
      return { success: false, message: 'Vous devez créer une colonne État si elle n\'existe pas, et mapper les champs disponibles avec ceux d\'Odoo via le menu "Odoo RDD > Traitement des données > Mapping".' };
    }
    
    // Récupérer les données d'adresse
    var lastRow = activeSheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: 'Aucune donnée à traiter.' };
    }
    
    var addresses = [];
    for (var row = 2; row <= lastRow; row++) {
      var addr = {
        row: row,
        street: addressFields.street ? activeSheet.getRange(row, addressFields.street).getDisplayValue() : '',
        street2: addressFields.street2 ? activeSheet.getRange(row, addressFields.street2).getDisplayValue() : '',
        zip: addressFields.zip ? activeSheet.getRange(row, addressFields.zip).getDisplayValue() : '',
        city: addressFields.city ? activeSheet.getRange(row, addressFields.city).getDisplayValue() : '',
        country: addressFields.country ? activeSheet.getRange(row, addressFields.country).getDisplayValue() : ''
      };
      addresses.push(addr);
    }
    
    // Préparer le prompt pour Gemini
    var prompt = "Pour chaque adresse ci-dessous, identifie l'état/province dans sa langue d'origine, suivi du code pays entre parenthèses (ex: North Carolina (US), Baden-Württemberg (DE), Andhra Pradesh (IN)). Réponds UNIQUEMENT avec un tableau JSON où chaque élément contient {\"index\": <numéro>, \"state\": \"<état (CODE)\"}. Si l'état ne peut pas être déterminé, utilise une chaîne vide.\n\nAdresses:\n" + JSON.stringify(addresses.map(function(a, i) { 
      return {index: i, street: a.street, street2: a.street2, zip: a.zip, city: a.city, country: a.country}; 
    }));
    
    var url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey;
    var payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8000 }
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    // Log for debugging
    Logger.log('Gemini API Response Code: ' + responseCode);
    Logger.log('Gemini API Response: ' + responseText.substring(0, 500));
    
    if (responseCode !== 200) {
      return { success: false, message: 'Erreur API (Code ' + responseCode + '): ' + responseText.substring(0, 200) };
    }
    
    var result = JSON.parse(responseText);
    
    // Check for API errors
    if (result.error) {
      return { success: false, message: 'Erreur API: ' + (result.error.message || JSON.stringify(result.error)) };
    }
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      // Provide more detail about what we received
      var debugInfo = 'Réponse API inattendue. ';
      if (result.candidates && result.candidates[0]) {
        if (result.candidates[0].finishReason) {
          debugInfo += 'Raison: ' + result.candidates[0].finishReason + '. ';
        }
        if (result.candidates[0].safetyRatings) {
          debugInfo += 'Filtres de sécurité activés. ';
        }
      }
      Logger.log('Full API response: ' + JSON.stringify(result));
      return { success: false, message: debugInfo + 'Consultez les logs pour plus de détails.' };
    }
    
    var aiText = result.candidates[0].content.parts[0].text.trim();
    // Extraire le JSON de la réponse
    var jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: false, message: 'Réponse IA invalide : ' + aiText.substring(0, 100) };
    }
    
    var states = JSON.parse(jsonMatch[0]);
    
    // Peupler la colonne État
    for (var i = 0; i < states.length; i++) {
      if (states[i].state) {
        activeSheet.getRange(addresses[states[i].index].row, addressFields.state).setValue(states[i].state);
      }
    }
    
    return { success: true, message: states.length + ' états peuplés avec succès.' };
    
  } catch (e) {
    Logger.log('Error in enrichment_populateStates: ' + e.toString());
    return { success: false, message: 'Erreur : ' + e.toString() };
  }
}

function enrichment_populateCountries() {
  try {
    var config = template_getOdooConfig();
    var apiKey = config.googleAiKey;
    
    if (!apiKey) {
      return { success: false, message: 'Clé API Google AI manquante. Configurez-la dans Odoo RDD > Configuration.' };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    var sheetName = activeSheet.getName();
    
    // Récupérer le mapping des champs
    var mappings = readSmartTable('ODOO_FIELDS');
    var sheetMappings = mappings.filter(function(m) { return m['Onglet'] === sheetName; });
    
    if (sheetMappings.length === 0) {
      return { success: false, message: 'Vous devez d\'abord mapper les champs disponibles avec ceux d\'Odoo via le menu "Odoo RDD > Traitement des données > Mapping".' };
    }
    
    // Trouver les colonnes d'adresse
    var addressFields = {
      street: null, street2: null, zip: null, city: null, country: null
    };
    
    var headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    
    for (var i = 0; i < sheetMappings.length; i++) {
      var mapping = sheetMappings[i];
      var odooField = mapping['Champ Odoo'];
      var colName = mapping['Entête'];  // Use header name instead of column letter
      var colIndex = headers.indexOf(colName);
      
      if (colIndex >= 0) {
        if (odooField === 'street') addressFields.street = colIndex + 1;
        else if (odooField === 'street2') addressFields.street2 = colIndex + 1;
        else if (odooField === 'zip') addressFields.zip = colIndex + 1;
        else if (odooField === 'city') addressFields.city = colIndex + 1;
        else if (odooField === 'country_id') addressFields.country = colIndex + 1;
      }
    }
    
    if (!addressFields.country) {
      return { success: false, message: 'Colonne Pays introuvable dans le mapping.' };
    }
    
    // Récupérer les données d'adresse
    var lastRow = activeSheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: 'Aucune donnée à traiter.' };
    }
    
    var addresses = [];
    for (var row = 2; row <= lastRow; row++) {
      var addr = {
        row: row,
        street: addressFields.street ? activeSheet.getRange(row, addressFields.street).getDisplayValue() : '',
        street2: addressFields.street2 ? activeSheet.getRange(row, addressFields.street2).getDisplayValue() : '',
        zip: addressFields.zip ? activeSheet.getRange(row, addressFields.zip).getDisplayValue() : '',
        city: addressFields.city ? activeSheet.getRange(row, addressFields.city).getDisplayValue() : ''
      };
      addresses.push(addr);
    }
    
    // Préparer le prompt pour Gemini
    var prompt = "Pour chaque adresse ci-dessous, identifie le pays en français. Réponds UNIQUEMENT avec un tableau JSON où chaque élément contient {\"index\": <numéro>, \"country\": \"<pays en français>\"}.\n\nAdresses:\n" + JSON.stringify(addresses.map(function(a, i) { 
      return {index: i, street: a.street, street2: a.street2, zip: a.zip, city: a.city}; 
    }));
    
    var url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey;
    var payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8000 }
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    // Log for debugging
    Logger.log('Gemini API Response Code: ' + responseCode);
    Logger.log('Gemini API Response: ' + responseText.substring(0, 500));
    
    if (responseCode !== 200) {
      return { success: false, message: 'Erreur API (Code ' + responseCode + '): ' + responseText.substring(0, 200) };
    }
    
    var result = JSON.parse(responseText);
    
    // Check for API errors
    if (result.error) {
      return { success: false, message: 'Erreur API: ' + (result.error.message || JSON.stringify(result.error)) };
    }
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      // Provide more detail about what we received
      var debugInfo = 'Réponse API inattendue. ';
      if (result.candidates && result.candidates[0]) {
        if (result.candidates[0].finishReason) {
          debugInfo += 'Raison: ' + result.candidates[0].finishReason + '. ';
        }
        if (result.candidates[0].safetyRatings) {
          debugInfo += 'Filtres de sécurité activés. ';
        }
      }
      Logger.log('Full API response: ' + JSON.stringify(result));
      return { success: false, message: debugInfo + 'Consultez les logs pour plus de détails.' };
    }
    
    var aiText = result.candidates[0].content.parts[0].text.trim();
    // Extraire le JSON de la réponse
    var jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: false, message: 'Réponse IA invalide : ' + aiText.substring(0, 100) };
    }
    
    var countries = JSON.parse(jsonMatch[0]);
    
    // Peupler la colonne Pays
    for (var i = 0; i < countries.length; i++) {
      if (countries[i].country) {
        activeSheet.getRange(addresses[countries[i].index].row, addressFields.country).setValue(countries[i].country);
      }
    }
    
    return { success: true, message: countries.length + ' pays peuplés avec succès.' };
    
  } catch (e) {
    Logger.log('Error in enrichment_populateCountries: ' + e.toString());
    return { success: false, message: 'Erreur : ' + e.toString() };
  }
}

function enrichment_formatPhones() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    var sheetName = activeSheet.getName();
    
    // Récupérer le mapping pour trouver la colonne téléphone
    var mappings = readSmartTable('ODOO_FIELDS');
    var sheetMappings = mappings.filter(function(m) { return m['Onglet'] === sheetName; });
    
    if (sheetMappings.length === 0) {
      return { success: false, message: 'Vous devez d\'abord mapper les champs disponibles avec ceux d\'Odoo.' };
    }
    
    var headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    var phoneCol = null;
    var countryCol = null;
    
    for (var i = 0; i < sheetMappings.length; i++) {
      var mapping = sheetMappings[i];
      var odooField = mapping['Champ Odoo'];
      var colName = mapping['Entête'];  // Use header name instead of column letter
      var colIndex = headers.indexOf(colName);
      
      if (colIndex >= 0) {
        if (odooField === 'phone' || odooField === 'mobile') phoneCol = colIndex + 1;
        else if (odooField === 'country_id') countryCol = colIndex + 1;
      }
    }
    
    if (!phoneCol) {
      return { success: false, message: 'Colonne téléphone introuvable dans le mapping.' };
    }
    
    // Charger la table des codes pays
    var countryCodes = readSmartTable('TAB_PAYS');
    
    var lastRow = activeSheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: 'Aucune donnée à traiter.' };
    }
    
    var formatted = 0;
    for (var row = 2; row <= lastRow; row++) {
      var phone = activeSheet.getRange(row, phoneCol).getDisplayValue().toString().trim();
      
      // Si commence par =, on nettoie
      if (phone.startsWith('=')) {
        phone = phone.substring(1).trim();
      }
      
      if (!phone) continue;
      
      var country = countryCol ? activeSheet.getRange(row, countryCol).getDisplayValue().toString().trim() : 'France';
      
      // Trouver l'indicatif du pays
      var countryData = countryCodes.find(function(c) {
        return c['Code du pays'] === country || c['Nom du pays'] === country;
      });
      
      // Utiliser 'Indice' s'il existe, sinon fallback sur 'Code du pays' (si numérique) ou 33
      var countryCode = '33';
      if (countryData) {
        countryCode = countryData['Indice'] || (isNaN(parseInt(countryData['Code du pays'])) ? '33' : countryData['Code du pays']);
      }
      
      // Nettoyer le numéro
      var cleanNum = phone.replace(/\D/g, '');
      if (!cleanNum) continue;
      
      // Retirer le zéro initial si présent
      cleanNum = cleanNum.replace(/^0/, '');
      
      // Ajouter l'indicatif si pas déjà présent
      var formattedPhone = '';
      if (cleanNum.indexOf(countryCode) === 0) {
        formattedPhone = '+' + cleanNum;
      } else {
        formattedPhone = '+' + countryCode + cleanNum;
      }
      
      activeSheet.getRange(row, phoneCol).setValue(formattedPhone);
      formatted++;
    }
    
    return { success: true, message: formatted + ' numéros formatés avec succès.' };
    
  } catch (e) {
    Logger.log('Error in enrichment_formatPhones: ' + e.toString());
    return { success: false, message: 'Erreur : ' + e.toString() };
  }
}

