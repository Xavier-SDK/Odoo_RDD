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



// Bridge pour la sidebar contextuelle (Unique)
function showContextualMappingSidebar() {
  var html = OdooRDD.template_showContextualMappingSidebar();
  SpreadsheetApp.getUi().showSidebar(html);
}

function showFormattingSidebar() {
  var html = OdooRDD.template_showFormattingSidebar();
  SpreadsheetApp.getUi().showSidebar(html);
}

function showEnrichmentSidebar() {
  var html = OdooRDD.template_showEnrichmentSidebar();
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


// --- Mapping Contextuel (Lazy Loading) ---

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

function formatActiveSheet() {
  return OdooRDD.formatActiveSheet();
}


function activateAIAuthorization() {
  return OdooRDD.template_activateAIAuthorization();
}

function activateAIAuthorizationFromMenu() {
  OdooRDD.template_activateAIAuthorization();
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

function enrichment_mergeTabs() {
  return OdooRDD.enrichment_mergeTabs();
}

// --- AI Mapping Suggestions ---

function getAiMappingSuggestions(headers, odooFields) {
  return OdooRDD.getAiMappingSuggestions(headers, odooFields);
}
