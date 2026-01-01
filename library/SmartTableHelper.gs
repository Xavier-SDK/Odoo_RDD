/**
 * SmartTableHelper - Utilitaires pour manipuler les smart tables de l'onglet Paramètres
 * 
 * Structure des tables :
 * - PARAMETERS (A1) : Paramètre, Valeur
 * - ODOO_MODELS (D1) : Onglets, Modèle Odoo
 * - ODOO_FIELDS (G1) : Onglet, Colonne, Entête, Champ Odoo
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
    columns: ['Onglets', 'Modèle Odoo']
  },
  ODOO_FIELDS: {
    startCol: 7,  // Colonne G
    columns: ['Onglet', 'Colonne', 'Entête', 'Champ Odoo']
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
 * Lit toutes les données d'une smart table
 * @param {String} tableName - Nom de la table (PARAMETERS, ODOO_MODELS, ODOO_FIELDS)
 * @return {Array} Tableau d'objets avec les données
 */
function readSmartTable(tableName) {
  var tableConfig = SMART_TABLES[tableName];
  if (!tableConfig) {
    throw new Error('Table inconnue: ' + tableName);
  }
  
  var sheet = getParamsSheet();
  var startCol = tableConfig.startCol;
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
      if (row[colName] !== criteria[colName]) {
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
  if (!tableConfig) {
    throw new Error('Table inconnue: ' + tableName);
  }
  
  var sheet = getParamsSheet();
  var startCol = tableConfig.startCol;
  var numCols = tableConfig.columns.length;
  
  // Chercher la ligne existante
  var data = readSmartTable(tableName);
  var rowIndex = -1;
  
  for (var i = 0; i < data.length; i++) {
    var match = true;
    for (var colName in criteria) {
      if (data[i][colName] !== criteria[colName]) {
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
    // Priorité : values, puis criteria, puis vide
    rowData.push(values[colName] !== undefined ? values[colName] : 
                 (criteria[colName] !== undefined ? criteria[colName] : ''));
  });
  
  if (rowIndex !== -1) {
    // Mettre à jour la ligne existante (ligne 2 = première donnée, donc +2)
    var sheetRow = rowIndex + 2;
    sheet.getRange(sheetRow, startCol, 1, numCols).setValues([rowData]);
  } else {
    // Ajouter une nouvelle ligne
    var lastRow = sheet.getLastRow();
    var newRow = lastRow + 1;
    
    // S'assurer qu'on ne commence pas avant la ligne 2
    if (newRow < 2) newRow = 2;
    
    sheet.getRange(newRow, startCol, 1, numCols).setValues([rowData]);
  }
}

/**
 * Supprime une ligne d'une table
 * @param {String} tableName - Nom de la table
 * @param {Object} criteria - Critères pour trouver la ligne à supprimer
 */
function deleteFromSmartTable(tableName, criteria) {
  var tableConfig = SMART_TABLES[tableName];
  if (!tableConfig) {
    throw new Error('Table inconnue: ' + tableName);
  }
  
  var sheet = getParamsSheet();
  var data = readSmartTable(tableName);
  
  for (var i = data.length - 1; i >= 0; i--) {
    var match = true;
    for (var colName in criteria) {
      if (data[i][colName] !== criteria[colName]) {
        match = false;
        break;
      }
    }
    
    if (match) {
      var sheetRow = i + 2; // +2 car ligne 1 = headers, et 0-indexed
      sheet.deleteRow(sheetRow);
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
function getOdooModel(sheetName) {
  var row = findInSmartTable('ODOO_MODELS', {'Onglets': sheetName});
  return row ? (row['Modèle Odoo'] || null) : null;
}

/**
 * Définit le modèle Odoo pour un onglet
 * @param {String} sheetName - Nom de l'onglet
 * @param {String} modelName - Nom du modèle Odoo
 */
function setOdooModel(sheetName, modelName) {
  upsertSmartTable('ODOO_MODELS',
    {'Onglets': sheetName},
    {'Modèle Odoo': modelName}
  );
}

/**
 * Récupère tous les mappings de champs pour un onglet
 * @param {String} sheetName - Nom de l'onglet
 * @return {Object} Dictionnaire {columnName: fieldId}
 */
function getOdooFields(sheetName) {
  var rows = filterSmartTable('ODOO_FIELDS', {'Onglet': sheetName});
  
  var mappings = {};
  
  rows.forEach(function(row) {
    // La colonne 'Colonne' contient la lettre (ex: 'A'), 'Entête' contient le nom (ex: 'Nom')
    // Le frontend utilise le nom de l'entête comme clé.
    var headerName = row['Entête']; 
    var fieldId = row['Champ Odoo'];
    
    if (headerName && fieldId) {
      mappings[headerName] = fieldId;
    }
  });
  
  return mappings;
}

/**
 * Définit le mapping d'un champ pour une colonne
 * @param {String} sheetName - Nom de l'onglet
 * @param {String} columnName - Nom de la colonne
 * @param {String} columnHeader - En-tête de la colonne (affiché)
 * @param {String} fieldId - ID du champ Odoo
 */
/**
 * Définit le mapping d'un champ pour une colonne
 * @param {String} sheetName - Nom de l'onglet
 * @param {String} columnName - Nom de la colonne
 * @param {String} columnHeader - En-tête de la colonne (affiché)
 * @param {String} fieldId - ID du champ Odoo
 */
function setOdooField(sheetName, columnName, columnHeader, fieldId) {
  upsertSmartTable('ODOO_FIELDS',
    {'Onglet': sheetName, 'Colonne': columnName},
    {'Entête': columnHeader, 'Champ Odoo': fieldId}
  );
}

// --- Extensions pour Cache (Bulk Operations) ---

/**
 * Vide toutes les données d'une table (garde les headers)
 * @param {String} tableName - Nom de la table
 */
function clearSmartTable(tableName) {
  var tableConfig = SMART_TABLES[tableName];
  if (!tableConfig) throw new Error('Table inconnue: ' + tableName);
  
  var sheet = getParamsSheet();
  var data = readSmartTable(tableName);
  if (data.length === 0) return;
  
  // Identifier la plage à effacer
  // Attention : readSmartTable saute les lignes vides, donc on doit trouver la vraie plage
  // Simplification : On cherche le début de table et on efface jusqu'à trouver une autre table
  // Mais comme on connait le tableau des données, on peut effacer ligne par ligne, 
  // ou plus brutalement effacer tout ce qui est sous le header
  // Pour éviter de casser d'autres tables en dessous si elles existent, on utilise deleteRow
  
  // Approche sûre : supprimer ligne par ligne en partant de la fin
  // C'est lent mais sûr. Pour un cache, on peut avoir 500 lignes.
  // Optimisation : trouver la plage contiguë
  
  // Pour l'instant, utilisons l'approche deleteFromSmartTable avec critère vide (tout matcher)
  // Mais deleteFromSmartTable lit tout.
  
  // Optimisation Bulk Delete :
  var allData = sheet.getDataRange().getValues();
  var startRow = -1;
  var tableStartCol = tableConfig.startCol - 1; // 0-indexed
  
  // Trouver le header
  for (var i = 0; i < allData.length; i++) {
    if (allData[i][tableStartCol] === tableConfig.columns[0]) { // Check premier header
      // Vérifier les autres headers pour être sûr
      startRow = i + 1; // Ligne headers (0-indexed)
      break;
    }
  }
  
  if (startRow === -1) return; // Table pas trouvée
  
  var firstDataRow = startRow + 1; // 1-indexed (Sheet API)
  
  // Compter les lignes de données contiguës
  var rowsToDelete = 0;
  for (var i = startRow + 1; i < allData.length; i++) {
    var cell = allData[i][tableStartCol];
    // Arrêt si vide ou début d'une autre table (tout majuscule généralement)
    if (!cell || (typeof cell === 'string' && cell.match(/^[A-Z_]+$/) && SMART_TABLES[cell])) {
      break;
    }
    rowsToDelete++;
  }
  
  if (rowsToDelete > 0) {
    sheet.deleteRows(firstDataRow, rowsToDelete);
  }
}

/**
 * Écrit un tableau de données en masse (Bulk Write)
 * Écrase ou ajoute à la suite (selon usage après clear)
 * @param {String} tableName - Nom de la table
 * @param {Array} dataArray - Tableau d'objets ou de tableaux de valeurs
 */
function writeSmartTable(tableName, dataArray) {
  if (!dataArray || dataArray.length === 0) return;
  
  var tableConfig = SMART_TABLES[tableName];
  if (!tableConfig) throw new Error('Table inconnue: ' + tableName);
  
  var sheet = getParamsSheet();
  var startCol = tableConfig.startCol;
  
  // Trouver la dernière ligne ou l'emplacement d'insertion
  // Pour faire simple et robuste : trouver le header et insérer après
  var allData = sheet.getDataRange().getValues();
  var headerRowIndex = -1;
  var tableStartColIndex = startCol - 1;
  
  for (var i = 0; i < allData.length; i++) {
    if (allData[i][tableStartColIndex] === tableConfig.columns[0]) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    // Si table pas trouvée (ex: nouveau cache), on l'ajoute à la fin
    // Mais on a besoin d'initialiser les headers d'abord.
    // On suppose que TemplateLogic l'a fait. 
    // Si pas trouvé, on lance erreur
    // throw new Error('Headers de table non trouvés pour ' + tableName);
    // Ou mieux : on crée si inexistant?
    return; 
  }
  
  var insertRow = headerRowIndex + 2; // +1 pour header, +1 pour passer à 1-indexed
  
  // Préparer les données
  var rows = dataArray.map(function(item) {
    var row = [];
    tableConfig.columns.forEach(function(col) {
      row.push(item[col] !== undefined ? item[col] : '');
    });
    return row;
  });
  
  // Insérer les lignes
  sheet.insertRowsAfter(headerRowIndex + 1, rows.length);
  sheet.getRange(insertRow, startCol, rows.length, tableConfig.columns.length).setValues(rows);
}

