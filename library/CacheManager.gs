/**
 * CacheManager - Gestion du cache persistant pour les modèles et champs Odoo
 * Utilise la Smart Table unique ODOO_CACHE (Colonnes: models, fields)
 * Stockage au format JSON
 */

var KEY_MODELS_LIST = '_MODELS_LIST_';

/**
 * Récupère la liste des modèles depuis le cache
 * @return {Array} Liste des modèles {model, name}
 */
function getModelsFromCache() {
  try {
    // Chercher la ligne où models = _MODELS_LIST_
    var row = findInSmartTable('ODOO_CACHE', {'models': KEY_MODELS_LIST});
    
    if (row && row['fields']) {
      // La colonne 'fields' contient le JSON de la liste des modèles
      return JSON.parse(row['fields']);
    }
    return [];
  } catch (e) {
    Logger.log('Erreur lecture cache modèles: ' + e);
    return [];
  }
}

/**
 * Met à jour le cache des modèles
 * @param {Array} models - Liste des modèles {model, name}
 */
function updateModelsCache(models) {
  try {
    var json = JSON.stringify(models);
    
    upsertSmartTable('ODOO_CACHE', 
      {'models': KEY_MODELS_LIST},
      {'fields': json}
    );
  } catch (e) {
    Logger.log('Erreur écriture cache modèles: ' + e);
  }
}

/**
 * Récupère les champs d'un modèle depuis le cache
 * @param {String} modelName - Nom du modèle
 * @return {Array} Liste des champs {id, string, type, icon, ...}
 */
function getFieldsFromCache(modelName) {
  try {
    var row = findInSmartTable('ODOO_CACHE', {'models': modelName});
    
    if (row && row['fields']) {
      var jsonStr = row['fields'].toString();
      if (!jsonStr || jsonStr.trim() === '') return [];
      
      try {
        var rawFields = JSON.parse(jsonStr);
        
        // Reconstruit le champ 'text' pour l'UI car non stocké
        return rawFields.map(function(f) {
          return {
            id: f.id,
            string: f.string,
            type: f.type,
            icon: f.icon,
            text: (f.string || f.id) + ' (' + f.id + ') [' + f.type + ']'
          };
        });
      } catch (parseErr) {
        Logger.log('Cache JSON corrompu pour ' + modelName + ': ' + parseErr);
        return [];
      }
    }
    return [];
  } catch (e) {
    Logger.log('Erreur lecture cache champs pour ' + modelName + ': ' + e);
    return [];
  }
}

/**
 * Met à jour le cache des champs pour un modèle
 * @param {String} modelName - Nom du modèle
 * @param {Array} fields - Liste des champs
 */
function updateFieldsCache(modelName, fields) {
  try {
    // Optimisation : ne stocker que l'essentiel pour éviter de saturer la cellule (max 50k chars)
    // On garde : id, string, type, icon. 'text' peut être reconstruit.
    var minimizedFields = fields.map(function(f) {
      return {
        id: f.id,
        string: f.string,
        type: f.type,
        icon: f.icon
      };
    });
    
    var json = JSON.stringify(minimizedFields);
    
    upsertSmartTable('ODOO_CACHE',
      {'models': modelName},
      {'fields': json}
    );
  } catch (e) {
    Logger.log('Erreur écriture cache champs pour ' + modelName + ': ' + e);
  }
}
