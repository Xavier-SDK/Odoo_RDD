/**
 * SmartTableHelper - Utilitaires pour manipuler les smart tables de l'onglet Paramètres
 * 
 * Structure des tables :
 * - PARAMETERS (A1) : Paramètre, Valeur
 * - ODOO_MODELS (D1) : ID Onglet, Modèle Odoo
 * - ODOO_FIELDS (G1) : ID Onglet, Colonne, Entête, Champ Odoo
 */

/**
 * Définition des structures de tables
 */
var SMART_TABLES = {
  PARAMETERS: {
    startCol: 1,  // Colonne A
    columns: ['Paramètre', 'Valeur']
  },
  ODOO_MODELS: {
    startCol: 4,  // Colonne D
    columns: ['ID Onglet', 'Modèle Odoo']
  },
  ODOO_FIELDS: {
    startCol: 7,  // Colonne G
    columns: ['ID Onglet', 'Colonne', 'Entête', 'Champ Odoo']
  },
  ODOO_CACHE: {
    startCol: 12, // Colonne L
    columns: ['models', 'fields']
  }
};

/**
 * Récupère l'onglet Paramètres
 */
function getParamsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  
  if (!paramsSheet) {
    throw new Error('Onglet "Paramètres" introuvable');
  }
  
  return paramsSheet;
}

/**
 * Trouve la dernière ligne occupée d'une table spécifique
 */
function findTableEnd(tableName) {
  var tableConfig = SMART_TABLES[tableName];
  var sheet = getParamsSheet();
  var startCol = tableConfig.startCol;
  var colValues = sheet.getRange(1, startCol, sheet.getMaxRows(), 1).getValues();
  
  // Scanne à partir de la ligne 2 pour trouver l'arrêt (vide ou autre table)
  for (var i = 1; i < colValues.length; i++) {
    var val = colValues[i][0];
    if (val === "" || val === null || val === undefined) return i; // i is 0-indexed, so it's the 1-indexed row count
    
    // Si on tombe sur un header d'une autre table potentielle (tout majuscule)
    if (i > 1 && typeof val === 'string' && val.match(/^[A-Z_]+$/) && SMART_TABLES[val]) {
      return i;
    }
  }
  return colValues.length;
}

/**
 * Lit toutes les données d'une smart table
 * @param {String} tableName - Nom de la table (PARAMETERS, ODOO_MODELS, ODOO_FIELDS)
 * @return {Array} Tableau d'objets avec les données
 */
function readSmartTable(tableName) {
  var tableConfig = SMART_TABLES[tableName];
  if (!tableConfig) {
    throw new Error('Table inconnue: ' + tableName);
  }
  
  var sheet = tableConfig.sheetName ? 
              SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tableConfig.sheetName) : 
              getParamsSheet();
              
  if (!sheet) {
    throw new Error('Onglet "' + (tableConfig.sheetName || 'Paramètres') + '" introuvable');
  }

  var startCol = tableConfig.startCol || 1;
  var numCols = tableConfig.columns.length;
  
  // Lire toutes les lignes (jusqu'à la dernière ligne de données)
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; // Pas de données (uniquement headers)
  
  // Lire les données (ligne 2 à lastRow)
  var range = sheet.getRange(2, startCol, lastRow - 1, numCols);
  var values = range.getValues();
  
  // Filtrer les lignes vides (où toutes les cellules sont vides)
  var data = [];
  values.forEach(function(row) {
    var isEmpty = row.every(function(cell) {
      return cell === '' || cell === null || cell === undefined;
    });
    if (!isEmpty) {
      var rowObj = {};
      tableConfig.columns.forEach(function(colName, index) {
        rowObj[colName] = row[index];
      });
      data.push(rowObj);
    }
  });
  
  return data;
}

/**
 * Trouve une ligne dans une table selon un critère
 * @param {String} tableName - Nom de la table
 * @param {Object} criteria - Critères de recherche {columnName: value}
 * @return {Object|null} Objet représentant la ligne trouvée ou null
 */
function findInSmartTable(tableName, criteria) {
  var data = readSmartTable(tableName);
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var match = true;
    
    for (var colName in criteria) {
      var valTable = row[colName];
      var valCriteria = criteria[colName];
      
      // Comparaison souple pour gérer "2024" (string) vs 2024 (number)
      // On convertit tout en string pour comparer si ce n'est pas null/undefined
      var strTable = valTable != null ? String(valTable) : '';
      var strCriteria = valCriteria != null ? String(valCriteria) : '';
      
      if (strTable !== strCriteria) {
        match = false;
        break;
      }
    }
    
    if (match) {
      return row;
    }
  }
  
  return null;
}

/**
 * Trouve toutes les lignes correspondant aux critères
 * @param {String} tableName - Nom de la table
 * @param {Object} criteria - Critères de recherche {columnName: value}
 * @return {Array} Tableau d'objets
 */
function filterSmartTable(tableName, criteria) {
  var data = readSmartTable(tableName);
  var results = [];
  
  data.forEach(function(row) {
    var match = true;
    
    for (var colName in criteria) {
      if (row[colName] == null || criteria[colName] == null) {
        if (row[colName] != criteria[colName]) {
          match = false;
          break;
        }
      } else if (String(row[colName]) !== String(criteria[colName])) {
        match = false;
        break;
      }
    }
    
    if (match) {
      results.push(row);
    }
  });
  
  return results;
}

/**
 * Met à jour ou insère une ligne dans une table
 * @param {String} tableName - Nom de la table
 * @param {Object} criteria - Critères pour trouver la ligne existante
 * @param {Object} values - Valeurs à écrire
 */
function upsertSmartTable(tableName, criteria, values) {
  var tableConfig = SMART_TABLES[tableName];
  if (!tableConfig) throw new Error('Table inconnue: ' + tableName);
  
  var sheet = getParamsSheet();
  var startCol = tableConfig.startCol;
  var numCols = tableConfig.columns.length;
  
  // Chercher la ligne existante
  var data = readSmartTable(tableName);
  var rowIndex = -1;
  
  for (var i = 0; i < data.length; i++) {
    var match = true;
    for (var colName in criteria) {
      if (String(data[i][colName]) !== String(criteria[colName])) {
        match = false;
        break;
      }
    }
    if (match) {
      rowIndex = i;
      break;
    }
  }
  
  // Construire la ligne de données complète
  var rowData = [];
  tableConfig.columns.forEach(function(colName) {
    rowData.push(values[colName] !== undefined ? values[colName] : 
                 (criteria[colName] !== undefined ? criteria[colName] : ''));
  });
  
  if (rowIndex !== -1) {
    var sheetRow = rowIndex + 2;
    sheet.getRange(sheetRow, startCol, 1, numCols).setValues([rowData]);
  } else {
    // Fix: Insérer des cellules au lieu de lignes entières
    var insertRow = findTableEnd(tableName) + 1;
    sheet.getRange(insertRow, startCol, 1, numCols).insertCells(SpreadsheetApp.Dimension.ROWS);
    sheet.getRange(insertRow, startCol, 1, numCols).setValues([rowData]);
  }
}

/**
 * Supprime une ligne d'une table
 * @param {String} tableName - Nom de la table
 * @param {Object} criteria - Critères pour trouver la ligne à supprimer
 */
function deleteFromSmartTable(tableName, criteria) {
  var tableConfig = SMART_TABLES[tableName];
  if (!tableConfig) throw new Error('Table inconnue: ' + tableName);
  
  var sheet = getParamsSheet();
  var startCol = tableConfig.startCol;
  var numCols = tableConfig.columns.length;
  var data = readSmartTable(tableName);
  
  for (var i = data.length - 1; i >= 0; i--) {
    var match = true;
    for (var colName in criteria) {
      if (String(data[i][colName]) !== String(criteria[colName])) {
        match = false;
        break;
      }
    }
    
    if (match) {
      var sheetRow = i + 2;
      sheet.getRange(sheetRow, startCol, 1, numCols).deleteCells(SpreadsheetApp.Dimension.ROWS);
    }
  }
}

/**
 * Récupère une valeur de paramètre
 * @param {String} paramName - Nom du paramètre
 * @return {String} Valeur du paramètre ou chaîne vide
 */
function getParameter(paramName) {
  var row = findInSmartTable('PARAMETERS', {'Paramètre': paramName});
  return row ? (row['Valeur'] || '') : '';
}

/**
 * Définit une valeur de paramètre
 * @param {String} paramName - Nom du paramètre
 * @param {String} value - Valeur à définir
 */
function setParameter(paramName, value) {
  upsertSmartTable('PARAMETERS', 
    {'Paramètre': paramName}, 
    {'Valeur': value}
  );
}

/**
 * Récupère le modèle Odoo d'un onglet
 * @param {String} sheetName - Nom de l'onglet
 * @return {String|null} Nom du modèle ou null
 */
function setOdooField(idOnglet, columnName, columnHeader, fieldId) {
  // On utilise le nom de l'entête à la fois pour 'Colonne' et 'Entête' 
  // car l'index de lettre (A, B, C) n'est plus fiable en cas de déplacement.
  upsertSmartTable('ODOO_FIELDS',
    {'ID Onglet': idOnglet, 'Colonne': columnHeader},
    {'Entête': columnHeader, 'Champ Odoo': fieldId}
  );
}

/**
 * Utilitaires pour conversion Nom <-> ID (GID) d'onglet
 */
function getSheetId(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  return sheet ? sheet.getSheetId().toString() : "";
}

function getSheetById(id) {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId().toString() === String(id)) return sheets[i];
  }
  return null;
}

function getOdooModel(idOnglet) {
  var row = findInSmartTable('ODOO_MODELS', {'ID Onglet': idOnglet});
  return row ? (row['Modèle Odoo'] || null) : null;
}

function setOdooModel(idOnglet, modelName) {
  upsertSmartTable('ODOO_MODELS',
    {'ID Onglet': idOnglet},
    {'Modèle Odoo': modelName}
  );
}

function getOdooFields(idOnglet) {
  var rows = filterSmartTable('ODOO_FIELDS', {'ID Onglet': idOnglet});
  var mappings = {};
  rows.forEach(function(row) {
    var headerName = row['Entête'] || row['Colonne']; 
    var fieldId = row['Champ Odoo'];
    // On garde même si fieldId est vide (cas '-- Ne pas importer --')
    if (headerName) mappings[headerName] = fieldId !== undefined ? fieldId : "";
  });
  return mappings;
}

// --- Extensions pour Cache (Bulk Operations) ---

/**
 * Vide toutes les données d'une table (garde les headers)
 * @param {String} tableName - Nom de la table
 */
function clearSmartTable(tableName) {
  var tableConfig = SMART_TABLES[tableName];
  var sheet = getParamsSheet();
  var startCol = tableConfig.startCol;
  var numCols = tableConfig.columns.length;
  
  var tableEnd = findTableEnd(tableName);
  if (tableEnd <= 1) return; // Uniquement header
  
  sheet.getRange(2, startCol, tableEnd - 1, numCols).deleteCells(SpreadsheetApp.Dimension.ROWS);
}

function writeSmartTable(tableName, dataArray) {
  if (!dataArray || dataArray.length === 0) return;
  
  var tableConfig = SMART_TABLES[tableName];
  var sheet = getParamsSheet();
  var startCol = tableConfig.startCol;
  var numCols = tableConfig.columns.length;
  
  // Préparer les données
  var rows = dataArray.map(function(item) {
    var row = [];
    tableConfig.columns.forEach(function(col) {
      row.push(item[col] !== undefined ? item[col] : '');
    });
    return row;
  });
  
  // Insérer au début du tableau de données (après header)
  sheet.getRange(2, startCol, rows.length, numCols).insertCells(SpreadsheetApp.Dimension.ROWS);
  sheet.getRange(2, startCol, rows.length, numCols).setValues(rows);
}

