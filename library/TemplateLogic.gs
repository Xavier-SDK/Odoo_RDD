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
    paramsSheet.getRange('A7').setValue('AI Engine URL');
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
    var aiEngineUrl = getParameter('AI Engine URL') || 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';
    
    return {
      url: normalizeOdooUrl(url),
      database: database,
      user: user,
      apiKey: apiKey,
      googleAiKey: googleAiKey ? googleAiKey.trim() : '',
      aiEngineUrl: aiEngineUrl
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
    setParameter('AI Engine URL', config.aiEngineUrl);
    
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

function template_showExportSidebar() {
  PropertiesService.getUserProperties().setProperty('SIDEBAR_MODE', 'EXPORT');
  return createUnifiedSidebar();
}

function template_showImportSidebar() {
  PropertiesService.getUserProperties().setProperty('SIDEBAR_MODE', 'IMPORT');
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
    .addSubMenu(ui.createMenu('Traitement des données')
      .addItem('Mapping', 'showContextualMappingSidebar')
      .addItem('Dédoublonnage', 'showPlaceholder')
      .addItem('Formatage', 'formatActiveSheet')
      .addItem('Enrichissement', 'showEnrichmentSidebar')
      .addItem('Fusionner', 'enrichment_mergeTabs'))
    .addItem('Export vers Odoo', 'showExportSidebar')
    .addItem('Import depuis Odoo', 'showImportSidebar')
    .addSeparator()
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
    var sheetId = activeSheet.getSheetId().toString();
    var sheetMappings = mappings.filter(function(m) { return String(m['ID Onglet']) === sheetId; });
    
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
    
    // Récupérer les données d'adresse en bloc pour performance
    var lastRow = activeSheet.getLastRow();
    var lastCol = activeSheet.getLastColumn();
    if (lastRow < 2) {
      return { success: false, message: 'Aucune donnée à traiter.' };
    }
    
    var dataRange = activeSheet.getRange(1, 1, lastRow, lastCol);
    var dataValues = dataRange.getValues();
    var displayValues = dataRange.getDisplayValues();
    var dataFormulas = dataRange.getFormulas();
    
    var addresses = [];
    for (var i = 1; i < lastRow; i++) { // i=1 correspond à la ligne 2 (index 1 dans la matrice)
      var row = i + 1;
      
      // Fonction interne pour récupérer une valeur propre ou extraite d'une formule en cas d'erreur
      var getV = function(colIndex) {
        if (!colIndex) return '';
        var c = colIndex - 1;
        var val = dataValues[i][c].toString().trim();
        var disp = displayValues[i][c].trim();
        var formula = dataFormulas[i][c];
        
        // Si erreur (#...), on tente de sauver le contenu de la formule
        if (disp.startsWith('#') && formula) {
          return formula.replace(/^=['"]?/, '').replace(/['"]?$/, '').trim();
        }
        return disp || val;
      };
      
      var addr = {
        row: row,
        street: getV(addressFields.street),
        street2: getV(addressFields.street2),
        zip: getV(addressFields.zip),
        city: getV(addressFields.city),
        country: getV(addressFields.country)
      };
      
      // Filter: Uniquement les lignes avec un minimum d'info
      if (addr.street || addr.street2 || addr.city || addr.zip) {
        addresses.push(addr);
      }
    }
    
    if (addresses.length === 0) {
      return { success: true, message: 'Aucune adresse à traiter (lignes vides).' };
    }
    
    // Paramètres de batching
    var BATCH_SIZE = 30;
    var updatedCount = 0;
    var totalBatches = Math.ceil(addresses.length / BATCH_SIZE);
    
    // Créer des matrices pour la mise à jour en bloc
    var stateRange = activeSheet.getRange(2, addressFields.state, lastRow - 1, 1);
    var stateValues = stateRange.getValues();
    var cityRange = addressFields.city ? activeSheet.getRange(2, addressFields.city, lastRow - 1, 1) : null;
    var cityValues = cityRange ? cityRange.getValues() : null;
    
    for (var b = 0; b < addresses.length; b += BATCH_SIZE) {
      var currentBatchNum = Math.floor(b / BATCH_SIZE) + 1;
      var percent = Math.round((currentBatchNum / totalBatches) * 100);
      _updateProgress(percent, "Lot " + currentBatchNum + " / " + totalBatches);
      
      var progressVal = Math.round((currentBatchNum / totalBatches) * 10);
      // Toasts supprimés au profit de la sidebar
      
      var batch = addresses.slice(b, b + BATCH_SIZE);
      
      // Préparer le prompt pour ce batch - Corrigé pour inclure la ville
      var prompt = "Pour chaque adresse ci-dessous, identifie l'état/province (suivi du code pays entre parenthèses, ex: North Carolina (US)) ET corrige/normalise le nom de la ville. \n" +
                   "Indique le nom du pays en FRANÇAIS si possible. \n" +
                   "Réponds UNIQUEMENT avec un tableau JSON où chaque élément contient {\"index\": <numéro>, \"state\": \"<état (CODE) (PAYS)>\", \"city\": \"<ville corrigée>\"}.\n\n" +
                   "Adresses:\n" + JSON.stringify(batch.map(function(a, i) { 
        return {index: i, street: a.street, street2: a.street2, zip: a.zip, city: a.city, country: a.country}; 
      }));
      
      var baseUrl = getParameter('AI Engine URL');
      var url = baseUrl + "?key=" + apiKey;

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
      
      Logger.log('Batch ' + (b/BATCH_SIZE + 1) + ' - Response Code: ' + responseCode);
      
      if (responseCode !== 200) {
        Logger.log('Erreur Batch ' + (b/BATCH_SIZE + 1) + ': ' + responseText);
        continue;
      }
      
      var result = JSON.parse(responseText);
      
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        Logger.log('Réponse Batch ' + (b/BATCH_SIZE + 1) + ' vide ou invalide.');
        continue;
      }
      
      var aiText = result.candidates[0].content.parts[0].text.trim();
      var results = _extractJsonArray(aiText);
      
      if (!results) {
        Logger.log('Parsing Batch ' + (b/BATCH_SIZE + 1) + ' échoué.');
        continue;
      }
      
      // Peupler les matrices avec les résultats du batch
      for (var i = 0; i < results.length; i++) {
        var resData = results[i];
        if (resData.index >= 0 && resData.index < batch.length) {
          var actualRow = batch[resData.index].row;
          
          // Mise à jour État
          if (resData.state) {
            stateValues[actualRow - 2][0] = resData.state;
          }
          
          // Mise à jour Ville (si la colonne existe)
          if (resData.city && cityValues) {
            cityValues[actualRow - 2][0] = resData.city;
          }
          
          updatedCount++;
        }
      }
    }
    
    // Mise à jour en bloc finale
    stateRange.setValues(stateValues);
    if (cityRange && cityValues) {
      cityRange.setValues(cityValues);
    }
    
    _updateProgress(100, "Terminé");
    
    return { success: true, message: updatedCount + ' lignes traitées avec succès.' };
    
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
    var sheetId = activeSheet.getSheetId().toString();
    var sheetMappings = mappings.filter(function(m) { return String(m['ID Onglet']) === sheetId; });
    
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
    
    // Récupérer les données d'adresse en bloc pour performance
    var lastRow = activeSheet.getLastRow();
    var lastCol = activeSheet.getLastColumn();
    if (lastRow < 2) {
      return { success: false, message: 'Aucune donnée à traiter.' };
    }
    
    var dataRange = activeSheet.getRange(1, 1, lastRow, lastCol);
    var dataValues = dataRange.getValues();
    var displayValues = dataRange.getDisplayValues();
    var dataFormulas = dataRange.getFormulas();
    
    var addresses = [];
    for (var i = 1; i < lastRow; i++) {
      var row = i + 1;
      
      var getV = function(colIndex) {
        if (!colIndex) return '';
        var c = colIndex - 1;
        var val = dataValues[i][c].toString().trim();
        var disp = displayValues[i][c].trim();
        var formula = dataFormulas[i][c];
        
        if (disp.startsWith('#') && formula) {
          return formula.replace(/^=['"]?/, '').replace(/['"]?$/, '').trim();
        }
        return disp || val;
      };
      
      var addr = {
        row: row,
        street: getV(addressFields.street),
        street2: getV(addressFields.street2),
        zip: getV(addressFields.zip),
        city: getV(addressFields.city)
      };
      
      if (addr.street || addr.street2 || addr.city || addr.zip) {
        addresses.push(addr);
      }
    }
    
    if (addresses.length === 0) {
      return { success: true, message: 'Aucune adresse à traiter (lignes vides).' };
    }
    
    // Paramètres de batching
    var BATCH_SIZE = 50;
    var updatedCount = 0;
    var totalBatches = Math.ceil(addresses.length / BATCH_SIZE);
    
    // Créer des matrices pour la mise à jour en bloc
    var countryRange = activeSheet.getRange(2, addressFields.country, lastRow - 1, 1);
    var countryValues = countryRange.getValues();
    var cityRange = addressFields.city ? activeSheet.getRange(2, addressFields.city, lastRow - 1, 1) : null;
    var cityValues = cityRange ? cityRange.getValues() : null;
    
    for (var b = 0; b < addresses.length; b += BATCH_SIZE) {
      var currentBatchNum = Math.floor(b / BATCH_SIZE) + 1;
      var percent = Math.round((currentBatchNum / totalBatches) * 100);
      _updateProgress(percent, "Lot " + currentBatchNum + " / " + totalBatches);
      
      var progressVal = Math.round((currentBatchNum / totalBatches) * 10);
      // Toasts supprimés au profit de la sidebar
      
      var batch = addresses.slice(b, b + BATCH_SIZE);
      
      // Préparer le prompt pour ce batch
      var prompt = "Pour chaque adresse ci-dessous, identifie le pays en FRANÇAIS (utilisez le nom officiel français) ET corrige/normalise le nom de la ville. \n" +
                   "Réponds UNIQUEMENT avec un tableau JSON où chaque élément contient {\"index\": <numéro>, \"country\": \"<pays en français>\", \"city\": \"<ville corrigée>\"}.\n\n" +
                   "Adresses:\n" + JSON.stringify(batch.map(function(a, i) { 
        return {index: i, street: a.street, street2: a.street2, zip: a.zip, city: a.city}; 
      }));
      
      var baseUrl = getParameter('AI Engine URL');
      var url = baseUrl + "?key=" + apiKey;

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
      
      Logger.log('Batch ' + (b/BATCH_SIZE + 1) + ' - Response Code: ' + responseCode);
      
      if (responseCode !== 200) {
        Logger.log('Erreur Batch ' + (b/BATCH_SIZE + 1) + ': ' + responseText);
        continue;
      }
      
      var result = JSON.parse(responseText);
      
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        Logger.log('Réponse Batch ' + (b/BATCH_SIZE + 1) + ' vide ou invalide.');
        continue;
      }
      
      var aiText = result.candidates[0].content.parts[0].text.trim();
      var results = _extractJsonArray(aiText);
      
      if (!results) {
        Logger.log('Parsing Batch ' + (b/BATCH_SIZE + 1) + ' échoué.');
        continue;
      }
      
      // Charger les codes pays pour le mapping
      var countryCodes = _getPaysData();

      // Peupler les matrices avec les résultats du batch
      for (var i = 0; i < results.length; i++) {
        var resData = results[i];
        if (resData.index >= 0 && resData.index < batch.length) {
          var actualRow = batch[resData.index].row;
          
          // Mise à jour Pays avec recherche du nom français exact
          if (resData.country) {
            var countrySearch = resData.country.trim().toLowerCase();
            var countryMatch = countryCodes.find(function(c) {
              return (c['Nom français'] || '').toLowerCase() === countrySearch || 
                     (c['Nom d\'origine'] || '').toLowerCase() === countrySearch ||
                     (c['Code du pays'] || '').toLowerCase() === countrySearch;
            });
            
            countryValues[actualRow - 2][0] = countryMatch ? countryMatch['Nom français'] : resData.country;
          }
          
          // Mise à jour Ville (si la colonne existe)
          if (resData.city && cityValues) {
            cityValues[actualRow - 2][0] = resData.city;
          }
          
          updatedCount++;
        }
      }
    }
    
    // Mise à jour en bloc finale
    countryRange.setValues(countryValues);
    if (cityRange && cityValues) {
      cityRange.setValues(cityValues);
    }
    
    _updateProgress(100, "Terminé");
    
    return { success: true, message: updatedCount + ' lignes traitées avec succès.' };
    
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
    var sheetId = activeSheet.getSheetId().toString();
    var sheetMappings = mappings.filter(function(m) { return String(m['ID Onglet']) === sheetId; });
    
    if (sheetMappings.length === 0) {
      return { success: false, message: 'Vous devez d\'abord mapper les champs disponibles avec ceux d\'Odoo (Onglet: "' + sheetName + '").' };
    }
    
    var headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    var phoneCols = []; // Tableau pour stocker tous les index de colonnes téléphone/mobile
    var countryCol = null;
    
    for (var i = 0; i < sheetMappings.length; i++) {
      var mapping = sheetMappings[i];
      var odooField = mapping['Champ Odoo'];
      var colName = mapping['Entête'];
      var colIndex = headers.indexOf(colName);
      
      if (colIndex >= 0) {
        if (odooField === 'phone' || odooField === 'mobile') {
          phoneCols.push(colIndex + 1);
        } else if (odooField === 'country_id') {
          countryCol = colIndex + 1;
        }
      }
    }
    
    if (phoneCols.length === 0) {
      return { success: false, message: 'Aucune colonne téléphone ou mobile trouvée dans le mapping.' };
    }
    
    // Charger la table des codes pays
    var countryCodes = _getPaysData();
    
    var lastRow = activeSheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: 'Aucune donnée à traiter.' };
    }
    
    var countryValues = countryCol ? activeSheet.getRange(2, countryCol, lastRow - 1, 1).getValues() : null;
    var totalFormatted = 0;
    
    Logger.log('Processing phone formatting for ' + phoneCols.length + ' columns, lastRow: ' + lastRow);
    
    // Traiter chaque colonne identifiée
    for (var c = 0; c < phoneCols.length; c++) {
      var currentCol = phoneCols[c];
      var phoneRange = activeSheet.getRange(2, currentCol, lastRow - 1, 1);
      var phoneValues = phoneRange.getValues();
      var phoneDisplayValues = phoneRange.getDisplayValues(); // Plus fiable pour détecter #ERROR!
      var phoneFormulas = phoneRange.getFormulas();
      var colUpdated = false;
      
      Logger.log('Column ' + currentCol + ': ' + phoneValues.length + ' rows to process');
      
      for (var i = 0; i < phoneValues.length; i++) {
        if (i % 100 === 0) {
          var totalProgress = Math.round(((c * phoneValues.length + i) / (phoneCols.length * phoneValues.length)) * 100);
          _updateProgress(totalProgress, "Colonne " + (c+1) + "/" + phoneCols.length + " - " + i + "/" + phoneValues.length);
        }
        var rawValue = phoneValues[i][0].toString().trim();
        var displayValue = phoneDisplayValues[i][0].trim();
        var formula = phoneFormulas[i][0].trim();
        var phone = rawValue;
        
        // Si la valeur affichée est une erreur (ex: #ERROR!) ou s'il y a une formule
        if (formula || displayValue.startsWith('#')) {
          // Extraire le contenu de la formule (ex: "=+32..." -> "+32...")
          var extracted = formula;
          if (formula.startsWith('=')) {
            extracted = formula.substring(1);
          } else if (displayValue.startsWith('#') && !formula) {
            // Cas extrême : erreur sans formule apparente dans getFormulas() ? 
            // On tente de voir si la valeur brute contient quelque chose
            extracted = rawValue;
          }
          
          // Retirer les guillemets si présents
          extracted = extracted.replace(/^['"]/, '').replace(/['"]$/, '').trim();
          
          if (extracted.replace(/\D/g, '').length >= 5) {
            phone = extracted;
            Logger.log('Row ' + (i+2) + ': Rescued phone from formula/error: ' + extracted);
          }
        }
        
        // Nettoyage manuel au cas où (prefix =)
        if (phone.startsWith('=')) {
          phone = phone.substring(1).trim();
        }
        
        if (!phone || phone.startsWith('#')) continue;
        
        // 1. Contrôle des lettres : si présent, on supprime le contenu
        if (/[a-zA-Z]/.test(phone)) {
          phoneValues[i][0] = "";
          totalFormatted++;
          colUpdated = true;
          continue;
        }

        // 2. Nettoyage pour compter les chiffres
        var cleanNum = phone.replace(/\D/g, '');
        
        // 3. Contrôle du nombre de chiffres
        if (cleanNum.length === 4) {
          // Si 4 chiffres, on ne touche à rien (probablement un poste interne)
          continue;
        }
        
        if (cleanNum.length < 4 || (cleanNum.length >= 5 && cleanNum.length <= 8)) {
          // Si mal formé (moins de 4 ou entre 5 et 8), on supprime
          phoneValues[i][0] = "";
          totalFormatted++;
          colUpdated = true;
          continue;
        }
        
        // 4. Formatage standard pour les numéros de 9 chiffres ou plus
        var countryRaw = countryValues ? countryValues[i][0].toString().trim() : 'France';
        
        // Trouver l'indicatif du pays et le nom français
        var countryData = countryCodes.find(function(item) {
          var code = (item['Code du pays'] || '').toString().toLowerCase();
          var orig = (item['Nom d\'origine'] || '').toString().toLowerCase();
          var fr = (item['Nom français'] || '').toString().toLowerCase();
          var search = countryRaw.toLowerCase();
          return code === search || orig === search || fr === search;
        });
        
        var countryCode = '33';
        if (countryData) {
          countryCode = (countryData['Indicatif Téléphonique'] || '').toString().replace(/\D/g, '') || '33';
          
          // Mise à jour du pays vers le nom français si nécessaire
          var frenchName = countryData['Nom français'];
          if (frenchName && countryValues[i][0] !== frenchName) {
            countryValues[i][0] = frenchName;
            colUpdated = true; // On marquera que la colonne pays doit être mise à jour
            var countryRange = activeSheet.getRange(i + 2, countryCol);
            countryRange.setValue(frenchName);
          }
        }
        
        // Cas CC + 0 + reste (ex: 320487...)
        if (cleanNum.indexOf(countryCode) === 0 && cleanNum.charAt(countryCode.length) === '0' && cleanNum.length > countryCode.length + 1) {
          cleanNum = countryCode + cleanNum.substring(countryCode.length + 1);
        } else {
          cleanNum = cleanNum.replace(/^0/, '');
        }
        
        if (!cleanNum) continue;
        
        var formattedPhone = '';
        if (cleanNum.indexOf(countryCode) === 0) {
          formattedPhone = '+' + cleanNum;
        } else {
          formattedPhone = '+' + countryCode + cleanNum;
        }
        
        // Comparaison avec displayValue pour être sûr de corriger l'erreur visuelle
        if (displayValue !== formattedPhone) {
          phoneValues[i][0] = formattedPhone;
          totalFormatted++;
          colUpdated = true;
        }
      }
      
      // Écriture en bloc pour cette colonne si elle a été modifiée
      if (colUpdated) {
        phoneRange.setValues(phoneValues);
        Logger.log('Column ' + currentCol + ': Updated ' + totalFormatted + ' rows');
      }
    }
    
    _updateProgress(100, "Terminé");
    return { success: true, message: totalFormatted + ' numéros formatés avec succès dans ' + phoneCols.length + ' colonnes.' };
    
  } catch (e) {
    Logger.log('Error in enrichment_formatPhones: ' + e.toString());
    _updateProgress(0, "Erreur");
    return { success: false, message: 'Erreur : ' + e.toString() };
  }
}

/**
 * Valide et corrige les adresses en utilisant l'API Google Address Validation.
 * Boucle sur toutes les lignes de l'onglet actif et normalise les adresses.
 */
function enrichment_validateAddresses() {
  try {
    var config = template_getOdooConfig();
    var apiKey = config.googleAiKey;
    
    if (!apiKey) {
      return { success: false, message: 'Clé API Google manquante. Configurez-la dans Odoo RDD > Configuration.' };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    var sheetName = activeSheet.getName();
    
    // Récupérer le mapping des champs
    var mappings = readSmartTable('ODOO_FIELDS');
    var sheetId = activeSheet.getSheetId().toString();
    var sheetMappings = mappings.filter(function(m) { return String(m['ID Onglet']) === sheetId; });
    
    if (sheetMappings.length === 0) {
      return { success: false, message: 'Vous devez d\'abord mapper les champs disponibles avec ceux d\'Odoo via le menu "Odoo RDD > Traitement des données > Mapping".' };
    }
    
    // Trouver les colonnes d'adresse
    var addressFields = {
      street: null, street2: null, zip: null, city: null, country: null, state: null
    };
    
    var headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    
    for (var i = 0; i < sheetMappings.length; i++) {
      var mapping = sheetMappings[i];
      var odooField = mapping['Champ Odoo'];
      var colName = mapping['Entête'];
      var colIndex = headers.indexOf(colName);
      
      if (colIndex >= 0) {
        if (odooField === 'street') addressFields.street = colIndex + 1;
        else if (odooField === 'street2') addressFields.street2 = colIndex + 1;
        else if (odooField === 'zip') addressFields.zip = colIndex + 1;
        else if (odooField === 'city') addressFields.city = colIndex + 1;
        else if (odooField === 'country_id') addressFields.country = colIndex + 1;
        else if (odooField === 'state_id') addressFields.state = colIndex + 1;
      }
    }
    
    if (!addressFields.street && !addressFields.city && !addressFields.zip) {
      return { success: false, message: 'Aucune colonne d\'adresse n\'a été mappée. Mappez au minimum street, city ou zip.' };
    }
    
    // Récupérer les données d'adresse
    var lastRow = activeSheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: 'Aucune donnée à traiter.' };
    }
    
    var addresses = [];
    
    for (var i = 2; i <= lastRow; i++) {
      var addr = {
        row: i,
        street: addressFields.street ? activeSheet.getRange(i, addressFields.street).getValue().toString().trim() : '',
        street2: addressFields.street2 ? activeSheet.getRange(i, addressFields.street2).getValue().toString().trim() : '',
        zip: addressFields.zip ? activeSheet.getRange(i, addressFields.zip).getValue().toString().trim() : '',
        city: addressFields.city ? activeSheet.getRange(i, addressFields.city).getValue().toString().trim() : '',
        country: addressFields.country ? activeSheet.getRange(i, addressFields.country).getValue().toString().trim() : ''
      };
      
      // Ne traiter que les lignes avec au moins une information d'adresse
      if (addr.street || addr.city || addr.zip) {
        addresses.push(addr);
      }
    }
    
    if (addresses.length === 0) {
      return { success: true, message: 'Aucune adresse à traiter (lignes vides).' };
    }
    
    // Traitement par lots optimisé
    var BATCH_SIZE = 50; // Groupes de 50 pour meilleures performances
    var validatedCount = 0;
    var ignoredCount = 0;
    var totalBatches = Math.ceil(addresses.length / BATCH_SIZE);
    
    var batchesToProcess = totalBatches;
    
    for (var b = 0; b < batchesToProcess * BATCH_SIZE && b < addresses.length; b += BATCH_SIZE) {
      var currentBatchNum = Math.floor(b / BATCH_SIZE) + 1;
      var percent = Math.round((currentBatchNum / batchesToProcess) * 100);
      _updateProgress(percent, "Lot " + currentBatchNum + " / " + totalBatches);
      
      var progressVal = Math.round((percent / 100) * 10);
      // Toasts supprimés au profit de la sidebar
      
      var batch = addresses.slice(b, Math.min(b + BATCH_SIZE, addresses.length));
      var firstRowInBatch = batch[0].row;
      var lastRowInBatch = batch[batch.length - 1].row;
      var rowCount = lastRowInBatch - firstRowInBatch + 1;
      
      Logger.log('Traitement du lot ' + currentBatchNum + ': Lignes ' + firstRowInBatch + ' à ' + lastRowInBatch);
      
      // Préparer les structures pour stocker les mises à jour en mémoire
      var batchUpdates = [];
      
      // Traiter chaque adresse du lot EN MÉMOIRE
      for (var j = 0; j < batch.length; j++) {
        var addr = batch[j];
        try {
          var validatedAddress = validateAddressWithGoogle(addr, apiKey);
          if (validatedAddress) {
            batchUpdates.push({
              row: addr.row,
              data: validatedAddress
            });
            validatedCount++;
          } else {
            ignoredCount++;
          }
        } catch (e) {
          Logger.log('Erreur ligne ' + addr.row + ': ' + e.toString());
          ignoredCount++;
        }
        // Pause plus longue pour éviter les rate limits (250ms)
        Utilities.sleep(250);
      }
      
      // MISE À JOUR EN MASSE par colonne pour ce batch
      if (batchUpdates.length > 0) {
        var fieldsToUpdate = ['street', 'street2', 'zip', 'city', 'country', 'state'];
        fieldsToUpdate.forEach(function(fieldKey) {
          var colIndex = addressFields[fieldKey];
          if (colIndex) {
            // Lire toute la colonne pour la plage du batch
            var range = activeSheet.getRange(firstRowInBatch, colIndex, rowCount, 1);
            var values = range.getValues();
            
            // Mettre à jour les valeurs dans l'array 2D
            var hasChanges = false;
            batchUpdates.forEach(function(update) {
              var rowIndexInArray = update.row - firstRowInBatch;
              var rawValue = values[rowIndexInArray][0] ? values[rowIndexInArray][0].toString() : '';
              var newValue = update.data[fieldKey] ? update.data[fieldKey].toString() : '';
              
              // Nettoyer l'ancienne valeur pour la comparaison (Sheets masque parfois l'apostrophe)
              var cleanOldValue = rawValue.startsWith("'") ? rawValue.substring(1) : rawValue;
              
              // Spécifique au Code Postal : on prépare le format texte
              var valueToWrite = newValue;
              if (fieldKey === 'zip' && newValue && !newValue.startsWith("'")) {
                valueToWrite = "'" + newValue;
              }
              
              // On met à jour si la valeur a changé (sans l'apostrophe) ou si le champ était vide
              if (newValue !== undefined && newValue !== null && (newValue !== cleanOldValue || (newValue !== '' && cleanOldValue === ''))) {
                values[rowIndexInArray][0] = valueToWrite;
                hasChanges = true;
                Logger.log('Ligne ' + update.row + ' [' + fieldKey + ']: ' + cleanOldValue + ' -> ' + newValue);
              }
            });
            
            // Écrire tout d'un coup pour cette colonne
            if (hasChanges) {
              range.setValues(values);
            }
          }
        });
        Logger.log('Lot ' + currentBatchNum + ': Mise à jour de ' + batchUpdates.length + ' lignes effectuée.');
      }
      
      var percent = Math.round((currentBatchNum / totalBatches) * 100);
      _updateProgress(percent, "Lot " + currentBatchNum + " / " + totalBatches);
    }
    
    _updateProgress(100, "Terminé");
    
    return { 
      success: true, 
      message: validatedCount + ' adresses validées et corrigées. ' + ignoredCount + ' adresses ignorées.'
    };
    
  } catch (e) {
    Logger.log('Error in enrichment_validateAddresses: ' + e.toString());
    _updateProgress(0, "Erreur");
    return { success: false, message: 'Erreur : ' + e.toString() };
  }
}

/**
 * Valide une adresse unique avec l'API Google Address Validation
 * @param {Object} addressData - Objet contenant les champs d'adresse (street, street2, zip, city, country)
 * @param {string} apiKey - Clé API Google
 * @return {Object|null} Adresse normalisée ou null si non reconnue
 */
function validateAddressWithGoogle(addressData, apiKey) {
  try {
    // Construire les addressLines
    var addressLines = [];
    if (addressData.street) addressLines.push(addressData.street);
    if (addressData.street2) addressLines.push(addressData.street2);
    
    // Convertir le nom du pays en code ISO si nécessaire
    var regionCode = getCountryCode(addressData.country);
    
    // Construire la requête
    var url = 'https://addressvalidation.googleapis.com/v1:validateAddress?key=' + apiKey;
    
    var payload = {
      address: {
        regionCode: regionCode || 'FR', // Défaut France si non spécifié
        locality: addressData.city || '',
        postalCode: addressData.zip || '',
        addressLines: addressLines
      }
    };
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode !== 200) {
      Logger.log('Erreur API Address Validation (HTTP ' + responseCode + '): ' + responseText);
      return null;
    }
    
    var result = JSON.parse(responseText);
    
    // Vérifier si l'adresse a été traitée (même partiellement)
    if (!result.result || !result.result.address) {
      Logger.log('Ligne ' + (addressData.row || '?') + ': Aucun résultat retourné par Google.');
      return null;
    }
    
    var verdict = result.result.verdict || {};
    var address = result.result.address;
    var components = address.addressComponents || [];
    var postalAddress = address.postalAddress || {};
    
    // LOGIQUE DE VALIDATION ASSOUPLIE : On accepte dès qu'on a une rue ou un point d'intérêt
    var acceptedGranularity = ['PREMISE', 'SUB_PREMISE', 'PREMISE_PROXIMITY', 'POINT_OF_INTEREST', 'ROUTE', 'STREET_ADDRESS'];
    var isAcceptable = acceptedGranularity.indexOf(verdict.validationGranularity) !== -1 || verdict.addressComplete === true;
    
    if (!isAcceptable) {
       Logger.log('Ligne ' + (addressData.row || '?') + ': Ignorée car trop imprécise (' + (verdict.validationGranularity || 'UNKNOWN') + ')');
       return null;
    }

    var normalizedAddress = {
      street: '',
      street2: '',
      zip: '',
      city: '',
      state: '',
      country: ''
    };

    // 1. EXTRACTION INTELLIGENTE DE LA VILLE
    var cityTypes = ['locality', 'postal_town', 'sublocality_level_1', 'administrative_area_level_3'];
    var foundCity = '';
    
    for (var t = 0; t < cityTypes.length; t++) {
      var comp = components.find(function(c) { return c.componentType === cityTypes[t]; });
      if (comp && comp.componentName && comp.componentName.text) {
        var text = comp.componentName.text;
        if (!/^\d+$/.test(text.replace(/\s/g, ''))) {
          foundCity = text;
          break;
        }
      }
    }
    normalizedAddress.city = foundCity || postalAddress.locality || '';

    // 2. EXTRAIRE L'ÉTAT (administrative_area_level_1)
    var stateComp = components.find(function(c) { return c.componentType === 'administrative_area_level_1'; });
    if (stateComp) normalizedAddress.state = stateComp.componentName.text;

    // 3. EXTRAIRE LE PAYS (Nom complet si possible)
    var countryComp = components.find(function(c) { return c.componentType === 'country'; });
    normalizedAddress.country = countryComp ? countryComp.componentName.text : (postalAddress.regionCode || '');

    // 4. EXTRAIRE LE CODE POSTAL
    var zipComp = components.find(function(c) { return c.componentType === 'postal_code'; });
    normalizedAddress.zip = zipComp ? zipComp.componentName.text : (postalAddress.postalCode || '');

    // 5. RECONSTRUIRE LA RUE
    if (postalAddress.addressLines && postalAddress.addressLines.length > 0) {
      normalizedAddress.street = postalAddress.addressLines[0];
      if (postalAddress.addressLines.length > 1) {
        normalizedAddress.street2 = postalAddress.addressLines.slice(1).join(', ');
      }
    }

    if (normalizedAddress.city !== addressData.city || normalizedAddress.zip !== addressData.zip) {
      Logger.log('Ligne ' + (addressData.row || '?') + ': Corrigée -> ' + normalizedAddress.city + ' (' + normalizedAddress.zip + ')');
    }
    
    return normalizedAddress;
    
  } catch (e) {
    Logger.log('Erreur dans validateAddressWithGoogle: ' + e.toString());
    return null;
  }
}

/**
 * Valide et complète les numéros SIRET via l'API SIRENE
 */
function enrichment_validateSiret() {
  _clearLogs();
  _updateProgress(0, "Initialisation...");
  _addLog("⏳ Démarrage du processus SIRENE...");
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    var sheetId = activeSheet.getSheetId().toString();
    
    _addLog("🔍 Lecture du mappage ODOO_FIELDS...");
    // Récupérer le mapping des champs
    var mappings = readSmartTable('ODOO_FIELDS');
    var sheetMappings = mappings.filter(function(m) { return String(m['ID Onglet']) === sheetId; });
    
    if (sheetMappings.length === 0) {
      _addLog("❌ Aucun mappage trouvé pour cet onglet.");
      return { success: false, message: 'Veuillez d\'abord mapper les champs Odoo.' };
    }
    
    _addLog("📊 Analyse de la structure de la feuille...");
    // Détecter les colonnes nécessaires
    var fields = { name: null, vat: null, zip: null, city: null, country: null };
    var headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    
    sheetMappings.forEach(function(m) {
      var odooField = m['Champ Odoo'];
      var colIndex = headers.indexOf(m['Entête']);
      if (colIndex >= 0) {
        if (odooField === 'name') fields.name = colIndex + 1;
        else if (odooField === 'vat' || odooField === 'siret') fields.vat = colIndex + 1;
        else if (odooField === 'zip') fields.zip = colIndex + 1;
        else if (odooField === 'city') fields.city = colIndex + 1;
        else if (odooField === 'country_id') fields.country = colIndex + 1;
      }
    });
    
    if (!fields.name || !fields.vat) {
      _addLog("❌ Champs requis (Nom/VAT) non mappés.");
      return { success: false, message: 'Mappage manquant : "name" (Nom) et "vat" (SIRET) sont requis.' };
    }
    
    var lastRow = activeSheet.getLastRow();
    if (lastRow < 2) return { success: false, message: 'Aucune donnée.' };
    
    _addLog("📥 Lecture de " + (lastRow-1) + " lignes...");
    var data = activeSheet.getRange(2, 1, lastRow - 1, activeSheet.getLastColumn()).getValues();
    var updates = [];
    var countCorrected = 0;
    var countFilled = 0;
    
    _updateProgress(0, "Démarrage SIRENE...");
    _addLog("ℹ️ Début du traitement SIRENE pour " + data.length + " lignes.");
    
    // Traitement par lots optimisé
    var BATCH_SIZE = 50;
    var totalBatches = Math.ceil(data.length / BATCH_SIZE);
    
    for (var b = 0; b < data.length; b += BATCH_SIZE) {
        var currentBatchNum = Math.floor(b / BATCH_SIZE) + 1;
        var rowCount = Math.min(BATCH_SIZE, data.length - b);
        var batch = data.slice(b, b + rowCount);
        
        _updateProgress(Math.round((b / data.length) * 100), "Lot " + currentBatchNum + "/" + totalBatches);
        
        // Lire les colonnes SIRET et NOM actuelles pour ce lot
        var siretRange = activeSheet.getRange(b + 2, fields.vat, rowCount, 1);
        var siretValues = siretRange.getValues();
        var nameRange = fields.name ? activeSheet.getRange(b + 2, fields.name, rowCount, 1) : null;
        var nameValues = nameRange ? nameRange.getValues() : null;
        var hasChanges = false;
        
        for (var i = 0; i < batch.length; i++) {
            var rowData = batch[i];
            
            var currentName = fields.name ? rowData[fields.name - 1].toString().trim() : '';
            var rawSiret = fields.vat ? rowData[fields.vat - 1].toString().trim() : '';
            var cleanedSiret = rawSiret.replace(/\s/g, '');
            
            var zip = fields.zip ? rowData[fields.zip - 1].toString().trim() : '';
            var city = fields.city ? rowData[fields.city - 1].toString().trim() : '';
            var country = fields.country ? rowData[fields.country - 1].toString().trim().toUpperCase() : '';
            
            // Filtre France
            var isFrance = (country === 'FR' || country === 'FRANCE' || country === '' || country === '1'); 
            if (!isFrance || (!currentName && !cleanedSiret)) continue;
            
            var result = _lookupSirene(currentName, cleanedSiret, zip, city);
            
            if (result && result.siret) {
                var newSiret = result.siret;
                var apiName = result.name || '';
                
                // 1. Mise à jour du SIRET (si changé OU si présentait des espaces)
                if (cleanedSiret !== newSiret || rawSiret !== newSiret) {
                    if (!cleanedSiret) {
                        countFilled++;
                        _addLog("✅ Trouvé pour " + currentName + " : " + newSiret);
                    } else if (cleanedSiret !== newSiret) {
                        countCorrected++;
                        _addLog("🔄 Corrigé pour " + currentName + " : " + newSiret);
                    } else {
                        // C'est juste un nettoyage d'espaces
                        _addLog("✨ Nettoyage SIRET : " + currentName);
                    }
                    siretValues[i][0] = "'" + newSiret; // Forcer texte
                    hasChanges = true;
                }
                
                // 2. Mise à jour du NOM (si on a un nom API et qu'il diffère)
                if (apiName && nameValues && currentName !== apiName) {
                    _addLog("🏢 Nom officiel : " + apiName);
                    nameValues[i][0] = apiName;
                    hasChanges = true;
                }
            }
            
            Utilities.sleep(100);
        }
        
        // Écriture en une seule fois du lot si changements
        if (hasChanges) {
            siretRange.setValues(siretValues);
            if (nameRange && nameValues) nameRange.setValues(nameValues);
            _addLog("📥 Lot " + currentBatchNum + " : Mise à jour effectuée.");
        }
    }
    
    _updateProgress(100, "Terminé");
    return { 
        success: true, 
        message: 'Traitement SIRENE terminé. ' + countFilled + ' SIRET renseignés, ' + countCorrected + ' SIRET corrigés.' 
    };
    
  } catch (e) {
    Logger.log('Erreur enrichment_validateSiret: ' + e.toString());
    _updateProgress(0, "Erreur");
    return { success: false, message: e.toString() };
  }
}

/**
 * Interroge l'API Recherche Entreprises
 * @private
 */
function _lookupSirene(name, currentSiret, zip, city) {
    var baseUrl = 'https://recherche-entreprises.api.gouv.fr/search?';
    
    // 1. Tenter d'abord de valider le SIRET actuel s'il existe
    if (currentSiret && currentSiret.length === 14) {
        try {
            var url = baseUrl + 'q=' + currentSiret + '&limite=1';
            Logger.log('Connexion SIRENE (Validation) : ' + url);
            var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            if (resp.getResponseCode() === 200) {
                var json = JSON.parse(resp.getContentText());
                if (json.results && json.results.length > 0) {
                    var found = json.results[0];
                    if (found.matching_etablissements && found.matching_etablissements[0].siret === currentSiret) {
                        return { siret: currentSiret, valid: true };
                    }
                }
            } else {
                _addLog("⚠️ API SIRENE Error " + resp.getResponseCode() + " sur SIRET " + currentSiret);
            }
        } catch (e) {}
    }
    
    // 2. Si SIRET absent ou non trouvé, chercher par Nom + Adresse
    try {
        var query = encodeURIComponent(name + ' ' + zip + ' ' + city);
        var url = baseUrl + 'q=' + query + '&limite=1';
        _addLog("🌐 Connexion API SIRENE : " + name);
        var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        
        if (resp.getResponseCode() === 200) {
            var json = JSON.parse(resp.getContentText());
            if (json.results && json.results.length > 0) {
                var result = json.results[0];
                if (result.matching_etablissements && result.matching_etablissements.length > 0) {
                    return { siret: result.matching_etablissements[0].siret, valid: true };
                }
            } else {
                _addLog("❓ Aucun résultat pour : " + name);
            }
        } else {
             _addLog("⚠️ API Error " + resp.getResponseCode() + " sur " + name);
        }
    } catch (e) {
        Logger.log('Erreur _lookupSirene (' + name + '): ' + e.toString());
    }
    
    return null;
}

/**
 * Convertit un nom de pays en code ISO 2 lettres
 * @param {string} countryName - Nom du pays (français ou anglais)
 * @return {string} Code ISO 2 lettres
 */
function getCountryCode(countryName) {
  if (!countryName) return 'FR';
  
  var name = countryName.toString().trim().toUpperCase();
  
  // Si c'est déjà un code à 2 lettres, on le retourne
  if (name.length === 2) return name;
  
  // Table de correspondance des pays les plus courants
  var countryMap = {
    'FRANCE': 'FR',
    'BELGIUM': 'BE',
    'BELGIQUE': 'BE',
    'GERMANY': 'DE',
    'ALLEMAGNE': 'DE',
    'SPAIN': 'ES',
    'ESPAGNE': 'ES',
    'ITALY': 'IT',
    'ITALIE': 'IT',
    'UNITED KINGDOM': 'GB',
    'ROYAUME-UNI': 'GB',
    'NETHERLANDS': 'NL',
    'PAYS-BAS': 'NL',
    'SWITZERLAND': 'CH',
    'SUISSE': 'CH',
    'PORTUGAL': 'PT',
    'LUXEMBOURG': 'LU',
    'AUSTRIA': 'AT',
    'AUTRICHE': 'AT',
    'UNITED STATES': 'US',
    'ÉTATS-UNIS': 'US',
    'CANADA': 'CA'
  };
  
  return countryMap[name] || 'FR';
}

/**
 * Récupère la progression actuelle depuis le cache (appelé par le sidebar)
 */
function getProgress() {
  var cache = CacheService.getUserCache();
  var progress = cache.get('odoo_rdd_progress');
  if (progress) {
    return JSON.parse(progress);
  }
  return { percent: 0, status: 'Initialisation...' };
}

/**
 * Met à jour la progression dans le cache
 * @private
 */
function _updateProgress(percent, status) {
  var cache = CacheService.getUserCache();
  var progress = { percent: percent, status: status };
  
  // Récupérer les derniers logs s'ils existent
  var logs = cache.get('odoo_rdd_logs');
  if (logs) {
    progress.logs = JSON.parse(logs);
  }
  
  cache.put('odoo_rdd_progress', JSON.stringify(progress), 600);
}

/**
 * Ajoute un message de log dans la file (cache)
 * @private
 */
function _addLog(message) {
  var cache = CacheService.getUserCache();
  var logsJson = cache.get('odoo_rdd_logs');
  var logs = logsJson ? JSON.parse(logsJson) : [];
  
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");
  logs.push("[" + timestamp + "] " + message);
  
  // Garder seulement les 5 derniers logs
  if (logs.length > 5) logs.shift();
  
  cache.put('odoo_rdd_logs', JSON.stringify(logs), 600);
  Logger.log(message);
}

/**
 * Efface les logs dans le cache
 * @private
 */
function _clearLogs() {
    var cache = CacheService.getUserCache();
    cache.remove('odoo_rdd_logs');
    cache.remove('odoo_rdd_progress');
}

/**
 * Extrait un tableau JSON d'une chaîne de texte (robuste aux blocs markdown)
 * @param {string} text 
 * @return {Array|null}
 */
function _extractJsonArray(text) {
  if (!text) return null;
  
  // 1. Nettoyer les blocs markdown JSON si présents
  var cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  
  // 2. Tenter de trouver le premier [ et le dernier ]
  var start = cleanText.indexOf('[');
  var end = cleanText.lastIndexOf(']');
  
  if (start !== -1 && end !== -1 && end > start) {
    var jsonStr = cleanText.substring(start, end + 1);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      Logger.log('Erreur parsing JSON extrait: ' + e.toString());
      // Fallback: Si tronqué, on peut tenter de fermer l'array (si le dernier objet est presque fini)
      try {
         // Si ça finit par { "index": x, "state": " 
         // on peut tenter un patchwork, mais c'est risqué. Mieux vaut échouer proprement.
         return null;
      } catch (e2) { return null; }
    }
  }
  
  return null;
}

/**
 * Fusionne les onglets associés au même modèle Odoo
 */
function enrichment_mergeTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  try {
    // 1. Charger les associations Modèles Odoo
    var modelMappings = readSmartTable('ODOO_MODELS');
    if (!modelMappings || modelMappings.length === 0) {
      ui.alert('Information', "Il n'existe pas au moins 2 onglets associés à un même modèle Odoo.", ui.ButtonSet.OK);
      return;
    }
    
    // 2. Grouper les onglets par modèle
    var groups = {};
    modelMappings.forEach(function(m) {
      var model = m['Modèle Odoo'];
      var idOnglet = m['ID Onglet'];
      if (!model || !idOnglet) return;
      
      var sheet = getSheetById(idOnglet);
      if (sheet) {
        if (!groups[model]) groups[model] = [];
        groups[model].push({ id: idOnglet, name: sheet.getName(), sheet: sheet });
      }
    });
    
    // 3. Filtrer pour ne garder que ceux à fusionner (>= 2 onglets)
    var groupsToMerge = [];
    for (var model in groups) {
      if (groups[model].length >= 2) {
        groupsToMerge.push({ model: model, sheets: groups[model] });
      }
    }
    
    if (groupsToMerge.length === 0) {
      ui.alert('Information', "Il n'existe pas au moins 2 onglets associés à un même modèle Odoo.", ui.ButtonSet.OK);
      return;
    }
    
    var totalGroups = groupsToMerge.length;
    var totalSheetsToMerge = 0;
    groupsToMerge.forEach(function(g) { totalSheetsToMerge += (g.sheets.length - 1); });
    
    var currentMergedCount = 0;
    Logger.log('Starting merge for ' + totalGroups + ' models, total source sheets: ' + totalSheetsToMerge);
    
    // 4. Traitement par lot
    for (var g = 0; g < groupsToMerge.length; g++) {
      var group = groupsToMerge[g];
      var target = group.sheets[0];
      var targetSheet = target.sheet;
      
      Logger.log('Merging group for model ' + group.model + ' into ' + target.name);
      
      for (var s = 1; s < group.sheets.length; s++) {
        var source = group.sheets[s];
        var sourceSheet = source.sheet;
        if (!sourceSheet) continue;
        
        var progress = Math.round((currentMergedCount / totalSheetsToMerge) * 100);
        _updateProgress(progress, "Fusion de " + source.name + " dans " + target.name);
        
        _mergeTwoSheets(targetSheet, sourceSheet);
        
        // Nettoyage Paramètres - Utilise l'ID
        deleteFromSmartTable('ODOO_MODELS', {'ID Onglet': source.id});
        deleteFromSmartTable('ODOO_FIELDS', {'ID Onglet': source.id});
        
        // Suppression Onglet
        ss.deleteSheet(sourceSheet);
        currentMergedCount++;
      }
    }
    
    _updateProgress(100, "Terminé");
    ui.alert('Succès', "Fusion terminée. " + currentMergedCount + " onglet(s) ont été fusionnés avec succès.", ui.ButtonSet.OK);
    
  } catch (e) {
    Logger.log('Error in enrichment_mergeTabs: ' + e.toString());
    _updateProgress(0, "Erreur");
    ui.alert('Erreur', "Une erreur est survenue lors de la fusion : " + e.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Fusionne sourceSheet dans targetSheet en respectant les mappings Odoo
 * @private
 */
function _mergeTwoSheets(targetSheet, sourceSheet) {
  var targetId = targetSheet.getSheetId().toString();
  var sourceId = sourceSheet.getSheetId().toString();
  var targetName = targetSheet.getName();
  
  var targetLastCol = targetSheet.getLastColumn();
  var targetHeaders = targetLastCol > 0 ? targetSheet.getRange(1, 1, 1, targetLastCol).getValues()[0] : [];
  
  var sourceLastCol = sourceSheet.getLastColumn();
  var sourceHeaders = sourceLastCol > 0 ? sourceSheet.getRange(1, 1, 1, sourceLastCol).getValues()[0] : [];
  
  var targetMappings = getOdooFields(targetId); // Utilise l'ID
  var sourceMappings = getOdooFields(sourceId); // Utilise l'ID
  
  var sourceLastRow = sourceSheet.getLastRow();
  if (sourceLastRow < 2) return; 
  
  var targetLastRow = targetSheet.getLastRow();
  var startRowAtTarget = targetLastRow + 1;
  
  // 1. Préparer les index cibles pour matching rapide
  var targetFieldToCol = {}; // fieldId -> 1-based index
  var targetHeaderToCol = {}; // headerLowerCase -> 1-based index
  
  targetHeaders.forEach(function(h, i) {
    if (!h) return;
    var headerStr = h.toString();
    var fieldId = targetMappings[headerStr];
    if (fieldId) targetFieldToCol[fieldId] = i + 1;
    targetHeaderToCol[headerStr.toLowerCase()] = i + 1;
  });
  
  // 2. Boucler sur les colonnes de la source
  for (var srcIdx = 0; srcIdx < sourceHeaders.length; srcIdx++) {
    var header = sourceHeaders[srcIdx];
    if (!header || header === "") continue;
    
    var headerStr = header.toString();
    var fieldId = sourceMappings[headerStr];
    var targetCol = null;
    
    // LOGIQUE DE MATCHING
    // a. Match par Field ID Odoo (priorité)
    if (fieldId && targetFieldToCol[fieldId]) {
      targetCol = targetFieldToCol[fieldId];
    } 
    // b. Match par Nom d'entête (insensible à la casse)
    else if (targetHeaderToCol[headerStr.toLowerCase()]) {
      targetCol = targetHeaderToCol[headerStr.toLowerCase()];
    }
    // c. Sinon, créer une nouvelle colonne dans l'onglet cible
    else {
      targetCol = targetSheet.getLastColumn() + 1;
      targetSheet.getRange(1, targetCol).setValue(headerStr);
      targetHeaderToCol[headerStr.toLowerCase()] = targetCol;
      
      // Si la colonne source avait un mapping, on le transfère vers la nouvelle colonne cible
      if (fieldId) {
        var letter = getColumnLetter(targetCol);
        setOdooField(targetId, letter, headerStr, fieldId); // Utilise l'ID
        targetFieldToCol[fieldId] = targetCol;
      }
    }
    
    // 3. Déplacement des données d'un bloc (ligne 2 à la fin)
    var sourceData = sourceSheet.getRange(2, srcIdx + 1, sourceLastRow - 1, 1).getValues();
    targetSheet.getRange(startRowAtTarget, targetCol, sourceData.length, 1).setValues(sourceData);
  }
}

