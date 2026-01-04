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
    ['model', 'name', 'transient'] // Fields to read
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
    ['string', 'help', 'type', 'required', 'readonly', 'relation', 'selection'] // Attributes
  ]);
  
  // Injecter le champ virtuel ID Externe (xml_id) pour le mapping
  if (fields) {
    fields['xml_id'] = {
      'string': 'ID Externe (Système)',
      'help': 'ID unique utilisé pour la synchronisation (Module.ID)',
      'type': 'char',
      'required': false,
      'readonly': false // On permet le mapping
    };
  }
  
  return fields;
}

/**
 * Formate les champs pour une utilisation dans les menus déroulants Google Sheets
 * @param {Object} fields - Dictionnaire des champs retourné par fields_get
 * @return {Array} Liste triée d'objets {id, string, text, type, icon}
 */
function formatFieldsForUI(fields) {
  var formatted = [];
  for (var fieldName in fields) {
    var field = fields[fieldName];
    if (field.readonly) continue; // On n'importe pas dans les champs readonly
    
    formatted.push({
      id: fieldName,
      string: field.string || fieldName,  // Nom français du champ
      text: field.string + ' (' + fieldName + ') [' + field.type + ']',
      type: field.type,
      icon: getFieldTypeIcon(field.type)
    });
  }
  
  return formatted.sort(function(a, b) {
    return a.text.localeCompare(b.text);
  });
}

/**
 * Retourne l'icône FontAwesome correspondant à un type de champ Odoo
 * @param {String} fieldType - Type du champ Odoo
 * @return {String} Classe d'icône FontAwesome
 */
function getFieldTypeIcon(fieldType) {
  var iconMap = {
    'char': 'fa-font',
    'text': 'fa-align-left',
    'html': 'fa-code',
    'integer': 'fa-calculator',
    'float': 'fa-calculator',
    'monetary': 'fa-money',
    'boolean': 'fa-check-square',
    'date': 'fa-calendar',
    'datetime': 'fa-calendar-o',
    'selection': 'fa-list',
    'many2one': 'fa-link',
    'one2many': 'fa-sitemap',
    'many2many': 'fa-list-ul',
    'binary': 'fa-file',
    'reference': 'fa-link'
  };
  
  return iconMap[fieldType] || 'fa-question-circle';
}
