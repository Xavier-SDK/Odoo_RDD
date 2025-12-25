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
    // Créer l'onglet Paramètres
    paramsSheet = ss.insertSheet('Paramètres');
    initializeParamsSheet(paramsSheet);
    
    // Ouvrir la sidebar de configuration
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
}

/**
 * Affiche la sidebar de configuration
 */
function showConfigSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('ConfigSidebar')
    .setTitle('Configuration Odoo')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
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

