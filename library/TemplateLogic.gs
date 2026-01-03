/**
 * TemplateLogic - Logique métier du Template
 * Version nettoyée - Fusion UIService + suppression code obsolète
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
    
    return {
      url: normalizeOdooUrl(url),
      database: database,
      user: user,
      apiKey: apiKey
    };
  } catch (e) {
    Logger.log('Erreur dans template_getOdooConfig: ' + e.toString());
    return { url: '', database: '', user: '', apiKey: '' };
  }
}

function template_saveConfig(config) {
  try {
    if (!config.url || !config.database || !config.user || !config.apiKey) {
      return { success: false, message: 'Configuration incomplète.' };
    }
    
    config.url = normalizeOdooUrl(config.url);
    
    template_ensureParamsSheet();
    
    setParameter('Odoo URL', config.url);
    setParameter('Odoo Database', config.database);
    setParameter('Odoo User', config.user);
    setParameter('Odoo API Key', config.apiKey);
    
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
    .addSeparator()
    .addSubMenu(ui.createMenu('Traitement des données')
      .addItem('💡 Mapping', 'showContextualMappingSidebar')
      .addSeparator()
      .addItem('Dédoublonnage', 'showPlaceholder')
      .addItem('Formatage', 'showFormattingSidebar')
      .addItem('Enrichissement', 'showPlaceholder')
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
