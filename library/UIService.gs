/**
 * UIService - Service de gestion de l'interface utilisateur
 * Permet de servir les fichiers HTML stockés dans la bibliothèque
 */

function createConfigSidebar(config) {
  var html = HtmlService.createTemplateFromFile('ConfigSidebar');
  html.config = config;
  return html.evaluate()
    .setTitle('Configuration Odoo')
    .setWidth(350);
}

function createTabMappingSidebar(sheets, models) {
  var html = HtmlService.createTemplateFromFile('TabMappingSidebar');
  html.sheets = sheets;
  html.models = models;
  return html.evaluate()
    .setTitle('Mapping Onglets')
    .setWidth(350);
}

function createColumnMappingSidebar(sheetName, modelName, fields) {
  var html = HtmlService.createTemplateFromFile('ColumnMappingSidebar');
  html.sheetName = sheetName;
  html.modelName = modelName;
  html.fields = fields;
  return html.evaluate()
    .setTitle('Mapping Colonnes: ' + sheetName)
    .setWidth(350);
}
