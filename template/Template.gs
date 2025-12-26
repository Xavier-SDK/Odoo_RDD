/**
 * Odoo RDD Template - Script principal (Wrapper léger)
 */

function onOpen(e) { 
  OdooRDD.template_onOpen(e); 
}

function onEdit(e) { 
  OdooRDD.template_onEdit(e); 
}

function showConfigSidebar() {
  var html = OdooRDD.template_showConfigSidebar();
  SpreadsheetApp.getUi().showSidebar(html);
}

function showConnectionResult(result) {
  OdooRDD.template_showConnectionResult(result);
}

function saveConfig(config) { 
  return OdooRDD.template_saveConfig(config); 
}

function showTabMappingSidebar() {
  var html = OdooRDD.template_showTabMappingSidebar();
  if (html) SpreadsheetApp.getUi().showSidebar(html);
}

function showColumnMappingSidebar() {
  var html = OdooRDD.template_showColumnMappingSidebar();
  if (html) SpreadsheetApp.getUi().showSidebar(html);
}

function saveTabMappingBridge(sheetName, modelName) {
  return OdooRDD.template_saveTabMappingBridge(sheetName, modelName);
}

function applyMappingBridge(sheetName, modelName) {
  return OdooRDD.template_applyMappingBridge(sheetName, modelName);
}

function testConnectionFromMenu() {
  OdooRDD.template_testConnectionFromMenu();
}

function debugGetModels() {
  var config = OdooRDD.template_getOdooConfig();
  var models = OdooRDD.getModels(config);
  Logger.log(models);
}

function showPlaceholder() {
  SpreadsheetApp.getUi().alert("Fonctionnalité en cours de développement");
}
