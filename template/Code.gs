/**
 * Odoo RDD Template - Script principal du template
 * 
 * Ce script minimaliste appelle la bibliothèque Odoo_RDD_Library
 * pour toutes les fonctionnalités métier.
 * 
 * @version 0.1.0
 */

/**
 * Fonction appelée à l'ouverture du fichier
 * Initialise les menus et vérifie la configuration
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  // Créer les menus personnalisés
  ui.createMenu('Odoo RDD')
    .addItem('Configuration', 'showConfigSidebar')
    .addSeparator()
    .addSubMenu(ui.createMenu('Traitement des données')
      .addItem('Dédoublonnage', 'showDeduplicationMenu')
      .addItem('Formatage', 'showFormattingMenu')
      .addItem('Enrichissement', 'showEnrichmentMenu')
      .addItem('Validation', 'showValidationMenu'))
    .addSubMenu(ui.createMenu('Odoo Sync')
      .addItem('Echantillon onglet', 'testSheetSample')
      .addItem('Echantillon global', 'testGlobalSample')
      .addItem('Importation', 'importData'))
    .addSubMenu(ui.createMenu('Outils')
      .addItem('Réparation', 'repairFile'))
    .addToUi();
  
  Logger.log('Menus Odoo RDD créés');
  
  // Vérifier la configuration initiale
  checkInitialSetup();
}

/**
 * Vérifie si le fichier est correctement configuré
 */
function checkInitialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Vérifier la présence de l'onglet Paramètres
  var paramsSheet = ss.getSheetByName('Paramètres');
  if (!paramsSheet) {
    // Créer l'onglet Paramètres (masqué)
    paramsSheet = ss.insertSheet('Paramètres');
    initializeParamsSheet(paramsSheet);
  } else {
    // S'assurer que l'onglet est masqué
    paramsSheet.hideSheet();
  }
  
  // Vérifier si les paramètres sont renseignés
  var config = getOdooConfig();
  if (!config.url || !config.database || !config.user || !config.apiKey) {
    // Paramètres manquants, afficher le formulaire
    showConfigSidebar();
  }
}

/**
 * Initialise l'onglet Paramètres avec la structure de base
 */
function initializeParamsSheet(sheet) {
  // En-têtes
  sheet.getRange('A1').setValue('Paramètre');
  sheet.getRange('B1').setValue('Valeur');
  
  // Configuration Odoo
  sheet.getRange('A2').setValue('Odoo URL');
  sheet.getRange('A3').setValue('Odoo Database');
  sheet.getRange('A4').setValue('Odoo User');
  sheet.getRange('A5').setValue('Odoo API Key');
  
  // Formatage
  sheet.getRange('A1:B1').setFontWeight('bold');
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 300);
  
  // Masquer l'onglet
  sheet.hideSheet();
}

/**
 * Récupère la configuration Odoo depuis l'onglet Paramètres
 * @return {Object} Configuration Odoo avec url, database, user, apiKey
 */
function getOdooConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  
  if (!paramsSheet) {
    return { url: '', database: '', user: '', apiKey: '' };
  }
  
  // Récupérer les valeurs depuis l'onglet Paramètres
  var url = paramsSheet.getRange('B2').getValue() || '';
  var database = paramsSheet.getRange('B3').getValue() || '';
  var user = paramsSheet.getRange('B4').getValue() || '';
  var apiKey = paramsSheet.getRange('B5').getValue() || '';
  
  return {
    url: url.toString().trim(),
    database: database.toString().trim(),
    user: user.toString().trim(),
    apiKey: apiKey.toString().trim()
  };
}

/**
 * Sauvegarde la configuration Odoo dans l'onglet Paramètres
 * @param {Object} config - Configuration avec url, database, user, apiKey
 * @return {Object} Résultat avec success et message
 */
function saveConfig(config) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var paramsSheet = ss.getSheetByName('Paramètres');
    
    // Si l'onglet n'existe pas, le créer
    if (!paramsSheet) {
      paramsSheet = ss.insertSheet('Paramètres');
      initializeParamsSheet(paramsSheet);
    }
    
    // Sauvegarder les valeurs
    paramsSheet.getRange('B2').setValue(config.url || '');
    paramsSheet.getRange('B3').setValue(config.database || '');
    paramsSheet.getRange('B4').setValue(config.user || '');
    paramsSheet.getRange('B5').setValue(config.apiKey || '');
    
    // S'assurer que l'onglet est masqué
    paramsSheet.hideSheet();
    
    // Tester la connexion Odoo
    var testResult = testOdooConnection(config);
    
    return {
      success: true,
      message: 'Configuration enregistrée avec succès',
      connectionTest: testResult
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erreur lors de l\'enregistrement: ' + error.toString()
    };
  }
}

/**
 * Teste la connexion à Odoo
 * @param {Object} config - Configuration Odoo (optionnel, utilise getOdooConfig si non fourni)
 * @return {Object} Résultat du test avec success et message
 */
function testOdooConnection(config) {
  try {
    // Utiliser la configuration fournie ou récupérer depuis l'onglet
    if (!config) {
      config = getOdooConfig();
    }
    
    // Vérifier que tous les paramètres sont présents
    if (!config.url || !config.database || !config.user || !config.apiKey) {
      return {
        success: false,
        message: 'Paramètres incomplets'
      };
    }
    
    // Appeler la fonction de test de la library
    if (typeof OdooRDD !== 'undefined' && OdooRDD.testConnection) {
      return OdooRDD.testConnection(config);
    } else {
      // Fallback: test basique de format URL
      var urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(config.url)) {
        return {
          success: false,
          message: 'Format d\'URL invalide'
        };
      }
      
      return {
        success: false,
        message: 'Bibliothèque OdooRDD non chargée. Vérifiez la configuration de la bibliothèque.'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Erreur lors du test: ' + error.toString()
    };
  }
}

/**
 * Affiche la sidebar de configuration
 */
function showConfigSidebar() {
  var config = getOdooConfig();
  var html = HtmlService.createTemplateFromFile('ConfigSidebar');
  html.config = config;
  var htmlOutput = html.evaluate()
    .setTitle('Configuration Odoo')
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

/**
 * Placeholder functions pour les menus
 */
function showDeduplicationMenu() {
  SpreadsheetApp.getUi().alert('Fonctionnalité de dédoublonnage à venir');
}

function showFormattingMenu() {
  SpreadsheetApp.getUi().alert('Fonctionnalité de formatage à venir');
}

function showEnrichmentMenu() {
  SpreadsheetApp.getUi().alert('Fonctionnalité d\'enrichissement à venir');
}

function showValidationMenu() {
  SpreadsheetApp.getUi().alert('Fonctionnalité de validation à venir');
}

function testSheetSample() {
  SpreadsheetApp.getUi().alert('Test d\'échantillon d\'onglet à venir');
}

function testGlobalSample() {
  SpreadsheetApp.getUi().alert('Test d\'échantillon global à venir');
}

function importData() {
  SpreadsheetApp.getUi().alert('Importation des données à venir');
}

function repairFile() {
  SpreadsheetApp.getUi().alert('Fonction de réparation à venir');
}

/**
 * Affiche le résultat du test de connexion dans une boîte de dialogue
 * @param {Object} result - Résultat de la sauvegarde avec connectionTest
 */
function showConnectionResult(result) {
  var ui = SpreadsheetApp.getUi();
  var title = 'Résultat de la configuration';
  var message = result.message;
  
  if (result.connectionTest) {
    if (result.connectionTest.success) {
      message += '\n\n✅ Connexion à Odoo réussie!';
      ui.alert(title, message, ui.ButtonSet.OK);
    } else {
      message += '\n\n⚠️ Test de connexion échoué:\n' + result.connectionTest.message;
      ui.alert(title, message, ui.ButtonSet.OK);
    }
  } else {
    ui.alert(title, message, ui.ButtonSet.OK);
  }
}

