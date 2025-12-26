/**
 * TemplateLogic - Logique métier du Template déplacée dans la bibliothèque
 */

function template_onEdit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    var sheetName = sheet.getName();
    
    // On ne surveille que la ligne 2 des onglets de données
    if (range.getRow() === 2 && sheetName !== 'Paramètres' && sheetName !== 'Log' && sheetName !== 'Rapport Tests') {
      var col = range.getColumn();
      var header = sheet.getRange(1, col).getValue();
      var value = range.getValue();
      
      if (header && value) {
        // Extraire l'ID du champ technique (entre parenthèses ou via parsing)
        // Le format est "Label (field_name) [type]"
        var fieldMatch = value.match(/\((.*?)\)/);
        if (fieldMatch && fieldMatch[1]) {
          var fieldName = fieldMatch[1];
          // Appel interne à la fonction de mapping (supposée être dans DataMapping.gs)
          if (typeof saveColumnMapping === 'function') {
            saveColumnMapping(sheetName, header, fieldName);
          } else {
             // Fallback pour la référence globale
             console.log("saveColumnMapping function not found internally");
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
    // Créer le trigger installable si nécessaire
    if (!e || !e.authMode || e.authMode === ScriptApp.AuthMode.NONE) {
      template_createOnOpenTrigger();
      return; // Sortir, le trigger sera exécuté à la prochaine ouverture
    }
    
    // Initialiser l'onglet Paramètres
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
    // Note: ScriptApp.newTrigger dans une librairie crée le trigger pour la librairie.
    // L'utilisateur devra peut-être l'autoriser explicitement.
    // Pour l'instant, on garde la logique telle quelle.
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'onOpen') {
        try {
          ScriptApp.deleteTrigger(trigger);
        } catch (e) {}
      }
    });
    
    // Attention: ceci déclenchera 'onOpen' du Template si exécuté dans le contexte du scripts container ?
    // Non, ça déclenche la fonction du script qui appelle.
    // On suppose que le Template a une fonction 'onOpen'.
    ScriptApp.newTrigger('onOpen').onOpen().create();
    Logger.log('Trigger installable créé');
  } catch (error) {
    Logger.log('Erreur lors de la création du trigger: ' + error.toString());
  }
}

function template_ensureParamsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  
  if (!paramsSheet) {
    paramsSheet = ss.insertSheet('Paramètres');
    paramsSheet.getRange('A1').setValue('Paramètre');
    paramsSheet.getRange('B1').setValue('Valeur');
    paramsSheet.getRange('A2').setValue('Odoo URL');
    paramsSheet.getRange('A3').setValue('Odoo Database');
    paramsSheet.getRange('A4').setValue('Odoo User');
    paramsSheet.getRange('A5').setValue('Odoo API Key');
    paramsSheet.getRange('A1:B1').setFontWeight('bold');
    paramsSheet.setColumnWidth(1, 200);
    paramsSheet.setColumnWidth(2, 300);
  }
  
  try {
    paramsSheet.hideSheet();
  } catch (e) {}
}

function template_getOdooConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  
  if (!paramsSheet) {
    return { url: '', database: '', user: '', apiKey: '' };
  }
  
  var url = (paramsSheet.getRange('B2').getValue() || '').toString().trim();
  var database = (paramsSheet.getRange('B3').getValue() || '').toString().trim();
  var user = (paramsSheet.getRange('B4').getValue() || '').toString().trim();
  var apiKey = (paramsSheet.getRange('B5').getValue() || '').toString().trim();
  
  // Utilisation de normalizeOdooUrl qui devrait être disponible dans OdooConnection.gs
  return {
    url: normalizeOdooUrl(url), // Fonction globale ou locale à la lib
    database: database,
    user: user,
    apiKey: apiKey
  };
}

function template_saveConfig(config) {
  try {
    // Validation via DataValidation.gs (interne)
    var validation;
    if (typeof validateConfig === 'function') {
      validation = validateConfig(config);
    } else {
       // Fallback
       if (!config.url || !config.database || !config.user || !config.apiKey) {
         return { success: false, message: 'Configuration incomplète.' };
       }
       validation = { isValid: true, sanitizedConfig: config, errors: {} };
    }
    
    if (!validation.isValid) {
      var errorFields = {};
      for (var field in validation.errors) {
        if (validation.errors.hasOwnProperty(field)) {
          errorFields[field] = true;
        }
      }
      return {
        success: false,
        message: 'Erreur de validation de sécurité.',
        validationErrors: validation.errors,
        errorFields: errorFields
      };
    }
    
    config = validation.sanitizedConfig;
    config.url = normalizeOdooUrl(config.url);
    
    template_ensureParamsSheet();
    var paramsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Paramètres');
    
    paramsSheet.getRange('B2').setValue(config.url || '');
    paramsSheet.getRange('B3').setValue(config.database || '');
    paramsSheet.getRange('B4').setValue(config.user || '');
    paramsSheet.getRange('B5').setValue(config.apiKey || '');
    paramsSheet.hideSheet();
    
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
    
    // Appel à la fonction de test interne (OdooConnection.gs)
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
    
    // Toujours fusionner les erreur spécifiques rapportées par la fonction de test
    if (testResult.errorFields) {
      for (var f in testResult.errorFields) {
        errorFields[f] = true;
      }
    }
  }
  return errorFields;
}

function template_showConfigSidebar(errorFields) {
  var config = template_getOdooConfig();
  config.errorFields = errorFields || {};
  return createConfigSidebar(config); // Appel Interne UIService
}

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
      .addItem('Mapping Onglets', 'showTabMappingSidebar')
      .addItem('Mapping Colonnes', 'showColumnMappingSidebar')
      .addSeparator()
      .addItem('Dédoublonnage', 'showPlaceholder')
      .addItem('Formatage', 'showPlaceholder')
      .addItem('Enrichissement', 'showPlaceholder')
      .addItem('Validation', 'showPlaceholder'))
    .addSubMenu(ui.createMenu('Odoo Sync')
      .addItem('Echantillon onglet', 'showPlaceholder')
      .addItem('Echantillon global', 'showPlaceholder')
      .addItem('Importation', 'showPlaceholder'))
    .addSubMenu(ui.createMenu('Outils')
      .addItem('Tester la connexion', 'testConnectionFromMenu')
      .addItem('Debug: Lister modèles', 'debugGetModels')
      .addItem('Réparation', 'showPlaceholder'))
    .addToUi();
}

function template_showTabMappingSidebar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets().filter(function(s) { 
    return s.getName() !== 'Paramètres' && s.getName() !== 'Log' && s.getName() !== 'Rapport Tests'; 
  }).map(function(s) { return s.getName(); });
  
  var config = template_getOdooConfig();
  var models = [];
  try {
    if (typeof getModels === 'function') {
      models = getModels(config, { excludeTech: true });
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('Erreur: ' + e.toString());
  }
  
  return createTabMappingSidebar(sheets, models); // Interne UIService
}

function template_showColumnMappingSidebar() {
  var activeSheet = SpreadsheetApp.getActiveSheet();
  var sheetName = activeSheet.getName();
  
  if (sheetName === 'Paramètres' || sheetName === 'Log' || sheetName === 'Rapport Tests') {
    SpreadsheetApp.getUi().alert('Sélectionnez un onglet de données pour mapper les colonnes.');
    return null;
  }
  
  var modelName = null;
  if (typeof getTabMapping === 'function') {
     modelName = getTabMapping(sheetName);
  }
  
  if (!modelName) {
    SpreadsheetApp.getUi().alert('Veuillez d\'abord mapper cet onglet à un modèle Odoo via "Mapping Onglets".');
    return null;
  }
  
  var config = template_getOdooConfig();
  var fields = [];
  try {
    if (typeof getFields === 'function' && typeof formatFieldsForUI === 'function') {
      var rawFields = getFields(config, modelName);
      fields = formatFieldsForUI(rawFields);
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('Erreur: ' + e.toString());
    return null;
  }
  
  return createColumnMappingSidebar(sheetName, modelName, fields); // Interne UIService
}

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

function template_saveTabMappingBridge(sheetName, modelName) {
  if (typeof saveTabMapping === 'function') {
    return saveTabMapping(sheetName, modelName);
  }
  return { success: false, message: 'saveTabMapping not found' };
}

function template_applyMappingBridge(sheetName, modelName) {
  try {
    var config = template_getOdooConfig();
    if (typeof getFields === 'function' && typeof formatFieldsForUI === 'function' && typeof applyValidationRow === 'function') {
      var rawFields = getFields(config, modelName);
      var fields = formatFieldsForUI(rawFields);
      applyValidationRow(sheetName, fields);
      return { success: true };
    }
  } catch (e) {
    return { success: false, message: e.toString() };
  }
  return { success: false, message: 'functions not found' };
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
