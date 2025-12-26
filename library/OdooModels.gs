/**
 * OdooModels - Module de gestion des modèles Odoo
 */

/**
 * Récupère la liste des modèles Odoo accessibles
 * @param {Object} config - Configuration de connexion
 * @param {Object} options - Options de filtrage (ex: {excludeTech: true})
 * @return {Array} Liste des modèles
 */
function getModels(config, options) {
  options = options || {};
  
  if (!config || !config.url) {
    throw new Error('Configuration manquante');
  }
  
  var models = execute_kw(config, 'ir.model', 'search_read', [
    [], // Domain: all models
    ['model', 'name', 'model_class', 'transient'] // Fields to read
  ]);
  
  if (!models || !Array.isArray(models)) {
    return [];
  }
  
  // Filtrage optionnel
  if (options.excludeTech) {
    models = models.filter(function(m) {
      // Exclure les modèles techniques commençant par ir., res. (sauf res.partner/users), bus., base.
      // C'est un filtre basique, à affiner selon besoins
      var name = m.model;
      if (name === 'res.partner' || name === 'res.users' || name === 'res.company') return true;
      return !name.startsWith('ir.') && !name.startsWith('bus.') && !name.startsWith('base.');
    });
  }
  
  return models.sort(function(a, b) {
    return a.model.localeCompare(b.model);
  });
}

/**
 * Récupère les champs d'un modèle Odoo
 * @param {Object} config - Configuration de connexion
 * @param {String} model - Nom du modèle (ex: 'res.partner')
 * @return {Object} Dictionnaire des champs
 */
function getFields(config, model) {
  if (!config || !config.url || !model) {
    throw new Error('Configuration ou modèle manquant');
  }
  
  var fields = execute_kw(config, model, 'fields_get', [
    [], // All fields
    ['string', 'help', 'type', 'required', 'readonly', 'relation'] // Attributes
  ]);
  
  return fields;
}

/**
 * Formate les champs pour une utilisation dans les menus déroulants Google Sheets
 * @param {Object} fields - Dictionnaire des champs retourné par fields_get
 * @return {Array} Liste triée d'objets {id, text}
 */
function formatFieldsForUI(fields) {
  var formatted = [];
  for (var fieldName in fields) {
    var field = fields[fieldName];
    if (field.readonly) continue; // On n'importe pas dans les champs readonly
    
    formatted.push({
      id: fieldName,
      text: field.string + ' (' + fieldName + ') [' + field.type + ']'
    });
  }
  
  return formatted.sort(function(a, b) {
    return a.text.localeCompare(b.text);
  });
}
