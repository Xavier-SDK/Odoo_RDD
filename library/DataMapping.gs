/**
 * DataMapping - Module de gestion du mapping des données
 */

/**
 * Enregistre le mapping d'un onglet vers un modèle Odoo
 * @param {String} sheetName - Nom de l'onglet
 * @param {String} modelName - Nom du modèle Odoo
 */
function saveTabMapping(sheetName, modelName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  
  if (!paramsSheet) {
    throw new Error('Onglet "Paramètres" introuvable');
  }
  
  var data = paramsSheet.getDataRange().getValues();
  var mappingRow = -1;
  var startRow = 10; // On commence les mappings à la ligne 10 pour laisser de la place à la config
  
  for (var i = startRow; i < data.length; i++) {
    if (data[i][0] === 'TAB_MAP:' + sheetName) {
      mappingRow = i + 1;
      break;
    }
  }
  
  if (mappingRow === -1) {
    mappingRow = data.length + 1;
    if (mappingRow < startRow) mappingRow = startRow;
  }
  
  paramsSheet.getRange(mappingRow, 1).setValue('TAB_MAP:' + sheetName);
  paramsSheet.getRange(mappingRow, 2).setValue(modelName);
  
  return { success: true };
}

/**
 * Récupère le modèle Odoo associé à un onglet
 * @param {String} sheetName - Nom de l'onglet
 * @return {String|null} Nom du modèle
 */
function getTabMapping(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  if (!paramsSheet) return null;
  
  var data = paramsSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === 'TAB_MAP:' + sheetName) {
      return data[i][1];
    }
  }
  return null;
}

/**
 * Enregistre le mapping d'une colonne vers un champ Odoo
 * @param {String} sheetName - Nom de l'onglet
 * @param {String} columnName - Nom de la colonne (en-tête)
 * @param {String} fieldName - Nom du champ technique Odoo
 */
function saveColumnMapping(sheetName, columnName, fieldName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  if (!paramsSheet) throw new Error('Onglet "Paramètres" introuvable');
  
  var key = 'COL_MAP:' + sheetName + ':' + columnName;
  var data = paramsSheet.getDataRange().getValues();
  var mappingRow = -1;
  
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      mappingRow = i + 1;
      break;
    }
  }
  
  if (mappingRow === -1) {
    mappingRow = data.length + 1;
  }
  
  paramsSheet.getRange(mappingRow, 1).setValue(key);
  paramsSheet.getRange(mappingRow, 2).setValue(fieldName);
  
  return { success: true };
}

/**
 * Récupère tous les mappings de colonnes pour un onglet
 * @param {String} sheetName - Nom de l'onglet
 * @return {Object} Dictionnaire {columnName: fieldName}
 */
function getColumnMappings(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  if (!paramsSheet) return {};
  
  var prefix = 'COL_MAP:' + sheetName + ':';
  var mappings = {};
  var data = paramsSheet.getDataRange().getValues();
  
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().startsWith(prefix)) {
      var colName = data[i][0].toString().substring(prefix.length);
      mappings[colName] = data[i][1];
    }
  }
  return mappings;
}

/**
 * Applique visuellement le mapping sur un onglet via une ligne de validation
 * @param {String} sheetName - Nom de l'onglet
 * @param {Array} fields - Liste des champs formatés {id, text}
 */
function applyValidationRow(sheetName, fields) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  
  // Vérifier si la ligne 2 est déjà une ligne de validation (on suppose que oui ou on l'insère)
  // Pour simplifier : Ligne 1 = En-têtes clients, Ligne 2 = Mapping Odoo
  
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var mappings = getColumnMappings(sheetName);
  
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
