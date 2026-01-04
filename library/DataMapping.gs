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
  // OBSOLETE: Le mapping est désormais géré centralement dans Paramètres.
  // On ne pollue plus les onglets avec une ligne de validation technique.
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

/**
 * Synchronise les lettres de colonne dans Paramètres
 * @param {String} sheetId
 * @param {Array} headers
 */
function syncColumnLetters(sheetId, headers) {
  if (!headers || headers.length === 0) return;
  
  headers.forEach(function(header, index) {
    if (!header) return;
    var headerName = String(header).trim();
    
    // Read existing entry to preserve Champ Odoo
    var existing = findInSmartTable('ODOO_FIELDS', {
      'ID Onglet': sheetId, 
      'Entête': headerName
    });
    
    // Build values - preserve existing field mapping
    // On met le nom de l'entête dans la colonne 'Colonne' pour le mapping par nom
    var values = {'Colonne': headerName};
    if (existing && existing['Champ Odoo']) {
      values['Champ Odoo'] = existing['Champ Odoo'];
    }
    
    upsertSmartTable('ODOO_FIELDS', 
      {'ID Onglet': sheetId, 'Entête': headerName},
      values
    );
  });
}

function indexToColumnLetter(index) {
  var temp, letter = '';
  while (index >= 0) {
    temp = index % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    index = (index - temp - 1) / 26;
  }
  return letter;
}
