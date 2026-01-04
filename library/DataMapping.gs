/**
 * DataMapping - Module de gestion du mapping des données
 * Utilise les smart tables de l'onglet Paramètres
 */

/**
 * Enregistre le mapping d'un onglet vers un modèle Odoo
 * @param {String} sheetName - Nom de l'onglet
 * @param {String} modelName - Nom du modèle Odoo
 */
function saveTabMapping(idOnglet, modelName) {
  setOdooModel(idOnglet, modelName);
  return { success: true };
}

/**
 * Récupère le modèle Odoo associé à un onglet
 * @param {String} sheetName - Nom de l'onglet
 * @return {String|null} Nom du modèle
 */
function getTabMapping(idOnglet) {
  return getOdooModel(idOnglet);
}

/**
 * Enregistre le mapping d'une colonne vers un champ Odoo
 * @param {String} sheetName - Nom de l'onglet
 * @param {String} columnName - Nom de la colonne (en-tête)
 * @param {String} fieldName - Nom du champ technique Odoo
 */
function saveColumnMapping(idOnglet, columnName, fieldName) {
  setOdooField(idOnglet, columnName, columnName, fieldName);
  return { success: true };
}

/**
 * Récupère tous les mappings de colonnes pour un onglet
 * @param {String} sheetName - Nom de l'onglet
 * @return {Object} Dictionnaire {columnName: fieldName}
 */
function getColumnMappings(idOnglet) {
  return getOdooFields(idOnglet);
}

/**
 * Applique visuellement le mapping sur un onglet via une ligne de validation
 * @param {String} sheetName - Nom de l'onglet
 * @param {Array} fields - Liste des champs formatés {id, text, string}
 */
function applyValidationRow(sheetName, fields) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  
  // Vérifier si la ligne 2 est déjà une ligne de validation (on suppose que oui ou on l'insère)
  // Pour simplifier : Ligne 1 = En-têtes clients, Ligne 2 = Mapping Odoo
  
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  
  var idOnglet = sheet.getSheetId().toString();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var mappings = getColumnMappings(idOnglet);
  
  // Appliquer le formatage à la ligne 2
  var validationRange = sheet.getRange(2, 1, 1, lastCol);
  validationRange.setBackground('#f3f3f3');
  validationRange.setFontColor('#666666');
  validationRange.setFontStyle('italic');
  
  // Préparer la validation de données (menu déroulant)
  var fieldTexts = fields.map(function(f) { return f.text; });
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(fieldTexts)
    .setAllowInvalid(false)
    .build();
    
  for (var i = 0; i < headers.length; i++) {
    var cell = sheet.getRange(2, i + 1);
    cell.setDataValidation(rule);
    
    // Si un mapping existe déjà, on le sélectionne
    var mappedFieldId = mappings[headers[i]];
    if (mappedFieldId) {
      var field = fields.find(function(f) { return f.id === mappedFieldId; });
      if (field) {
        cell.setValue(field.text);
      }
    }
  }
  
  // Figer les 2 premières lignes
  sheet.setFrozenRows(2);
}

/**
 * Nettoie les mappings orphelins (onglets supprimés ou colonnes disparues)
 */
function cleanupOrphanMappings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Nettoyage des onglets (ODOO_MODELS)
  var models = readSmartTable('ODOO_MODELS');
  models.forEach(function(m) {
    var idOnglet = m['ID Onglet'];
    if (!idOnglet) return;
    
    var sheet = getSheetById(idOnglet);
    if (!sheet) {
      // Onglet supprimé -> Nettoyer tout
      deleteFromSmartTable('ODOO_MODELS', {'ID Onglet': idOnglet});
      deleteFromSmartTable('ODOO_FIELDS', {'ID Onglet': idOnglet});
    }
  });

  // 2. Nettoyage des colonnes (ODOO_FIELDS)
  var fields = readSmartTable('ODOO_FIELDS');
  // On regroupe par onglet pour ne pas lire les colonnes 50 fois
  var fieldsBySheet = {};
  fields.forEach(function(f) {
    var id = f['ID Onglet'];
    if (!fieldsBySheet[id]) fieldsBySheet[id] = [];
    fieldsBySheet[id].push(f);
  });

  for (var idOnglet in fieldsBySheet) {
    var sheet = getSheetById(idOnglet);
    if (!sheet) continue; // Déjà géré au dessus or something else
    
    var currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    // Nettoyer les espaces et convertir en string pour comparaison
    currentHeaders = currentHeaders.map(function(h) { return String(h).trim(); });

    fieldsBySheet[idOnglet].forEach(function(f) {
      var mappedHeader = String(f['Entête']).trim();
      if (currentHeaders.indexOf(mappedHeader) === -1) {
        // Colonne n'existe plus
        deleteFromSmartTable('ODOO_FIELDS', {
          'ID Onglet': idOnglet,
          'Entête': f['Entête']
        });
      }
    });
  }
}
