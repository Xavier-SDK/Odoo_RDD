/**
 * DataValidation - Module de validation des données et configurations
 */

/**
 * Valide et nettoie la configuration Odoo
 * @param {Object} config - La configuration à valider
 * @return {Object} Résultat de validation {isValid, errors, sanitizedConfig}
 */
function validateAndSanitizeConfig(config) {
  var errors = {};
  var sanitizedConfig = {};
  var isValid = true;
  
  var suspiciousPatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<!\[CDATA\[/gi,
    /]]>/gi,
    /<\?xml/gi,
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /&#x?[0-9a-f]+;/gi,
  ];
  
  function validateField(fieldName, value, options) {
    options = options || {};
    
    if (options.required && (!value || !value.trim())) {
      return { isValid: false, errors: ['Ce champ est requis'], sanitized: '' };
    }
    
    if (!value || !value.trim()) {
      return { isValid: true, errors: [], sanitized: '' };
    }
    
    var sanitized = value.trim();
    var fieldErrors = [];
    
    if (options.maxLength && sanitized.length > options.maxLength) {
      fieldErrors.push('Ce champ ne peut pas dépasser ' + options.maxLength + ' caractères');
    }
    
    // Vérifier les patterns suspects
    for (var i = 0; i < suspiciousPatterns.length; i++) {
      if (suspiciousPatterns[i].test(sanitized)) {
        fieldErrors.push('Caractères ou patterns suspects détectés.');
        Logger.log('⚠️ Tentative d\'injection détectée dans ' + fieldName);
        break;
      }
    }
    
    if (options.type !== 'url') {
      if (/<[^>]+>/g.test(sanitized)) {
        fieldErrors.push('Caractères ou patterns suspects détectés.');
        Logger.log('⚠️ Tentative d\'injection détectée dans ' + fieldName);
      }
    }
    
    // Validation spécifique par type
    if (options.type === 'url') {
      if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(sanitized)) {
        fieldErrors.push('Format d\'URL invalide');
      }
    } else if (options.type === 'database') {
      if (!/^[a-zA-Z0-9._-]+$/.test(sanitized)) {
        fieldErrors.push('Caractères invalides pour une base de données');
      }
    } else if (options.type === 'user') {
      if (!/^[a-zA-Z0-9._@-]+$/.test(sanitized)) {
        fieldErrors.push('Caractères invalides pour un utilisateur');
      }
    } else if (options.type === 'apiKey') {
      if (sanitized.length < 8) {
        fieldErrors.push('L\'API key semble trop courte');
      }
    }
    
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    return {
      isValid: fieldErrors.length === 0,
      errors: fieldErrors,
      sanitized: sanitized
    };
  }
  
  // Valider chaque champ
  var validations = {
    url: validateField('url', config.url, { required: true, type: 'url', maxLength: 100 }),
    database: validateField('database', config.database, { required: true, type: 'database', maxLength: 50 }),
    user: validateField('user', config.user, { required: true, type: 'user', maxLength: 100 }),
    apiKey: validateField('apiKey', config.apiKey, { required: true, type: 'apiKey', maxLength: 50 })
  };
  
  for (var field in validations) {
    if (!validations[field].isValid) {
      errors[field] = validations[field].errors;
      isValid = false;
    }
    sanitizedConfig[field] = validations[field].sanitized;
  }
  
  return {
    isValid: isValid,
    errors: errors,
    sanitizedConfig: sanitizedConfig
  };
}
