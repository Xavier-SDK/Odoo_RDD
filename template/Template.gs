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

/**
 * @customfunction
 */
function TVA(vatNumber, mode) {
  return OdooRDD.TVA(vatNumber, mode);
}

/**
 * @customfunction
 */
function IBAN(ibanValue, mode) {
  return OdooRDD.IBAN(ibanValue, mode);
}

function GEN_MDP(dummy) {
  return OdooRDD.GEN_MDP(dummy);
}

function ODOO_GROUPS_X(headersList, valuesList, headersBool, valuesBool, refApps, refFuncs, refIds) {
  return OdooRDD.ODOO_GROUPS_X(headersList, valuesList, headersBool, valuesBool, refApps, refFuncs, refIds);
}


// Bridge pour la sidebar contextuelle (Unique)
function showContextualMappingSidebar() {
  var html = OdooRDD.template_showContextualMappingSidebar();
  SpreadsheetApp.getUi().showSidebar(html);
}

// Fonction de mise en forme de l'onglet actif
function formatActiveSheet() {
  var result = OdooRDD.formatActiveSheet();
  if (result.success) {
    SpreadsheetApp.getActiveSpreadsheet().toast(result.message);
  } else {
    SpreadsheetApp.getUi().alert(result.message);
  }
  return result; // Keep return just in case
}

function showEnrichmentSidebar() {
  var html = OdooRDD.template_showEnrichmentSidebar();
  SpreadsheetApp.getUi().showSidebar(html);
}

function showExportSidebar() {
  var html = OdooRDD.template_showExportSidebar();
  SpreadsheetApp.getUi().showSidebar(html);
}

function showPlaceholder() {
  SpreadsheetApp.getUi().alert("Fonctionnalité en cours de développement");
}

function testConnectionFromMenu() {
  OdooRDD.template_testConnectionFromMenu();
}

function debugGetModels() {
  var config = OdooRDD.template_getOdooConfig();
  var models = OdooRDD.getModels(config);
  Logger.log(models);
}

function getSidebarMode() {
  return OdooRDD.getSidebarMode();
}


function getInitialMappingData(sheetName) {
  return OdooRDD.getInitialMappingData(sheetName);
}

function getContextualModels(forceRefresh) {
  return OdooRDD.getContextualModels(forceRefresh);
}

function getModelFields(modelName, forceRefresh) {
  return OdooRDD.getModelFields(modelName, forceRefresh);
}

function saveContextualMapping(sheetName, modelName, columnMappings) {
  return OdooRDD.saveContextualMapping(sheetName, modelName, columnMappings);
}

function getFieldsForModel(modelName) {
  return OdooRDD.getFieldsForModel(modelName);
}

function testMappingData(sheetName, modelName, columnMappings) {
  return OdooRDD.testMappingData(sheetName, modelName, columnMappings);
}

function activateAIAuthorization() {
  return OdooRDD.template_activateAIAuthorization();
}

function activateAIAuthorizationFromMenu() {
  OdooRDD.template_activateAIAuthorization();
}

function getAiMappingSuggestions(headers, odooFields) {
  return OdooRDD.getAiMappingSuggestions(headers, odooFields);
}

// --- Enrichment Functions ---

function enrichment_checkBackup() {
  return OdooRDD.enrichment_checkBackup();
}

function enrichment_saveBackup() {
  return OdooRDD.enrichment_saveBackup();
}

function enrichment_restoreBackup() {
  return OdooRDD.enrichment_restoreBackup();
}

function enrichment_populateStates() {
  return OdooRDD.enrichment_populateStates();
}

function enrichment_populateCountries() {
  return OdooRDD.enrichment_populateCountries();
}

function enrichment_formatPhones() {
  return OdooRDD.enrichment_formatPhones();
}

function enrichment_validateAddresses() {
  return OdooRDD.enrichment_validateAddresses();
}

function getProgress() {
  return OdooRDD.getProgress();
}

function enrichment_mergeTabs() {
  return OdooRDD.enrichment_mergeTabs();
}

function prepareForExport() {
  return OdooRDD.prepareForExport();
}

function processExportBatch(sheetName, rowsIndices) {
  return OdooRDD.processExportBatch(sheetName, rowsIndices);
}

function showImportSidebar() {
  var html = OdooRDD.template_showImportSidebar();
  SpreadsheetApp.getUi().showSidebar(html);
}

function prepareForImport() {
  return OdooRDD.prepareForImport();
}

function processImportBatch(sheetName, offset, batchSize) {
  return OdooRDD.processImportBatch(sheetName, offset, batchSize);
}
