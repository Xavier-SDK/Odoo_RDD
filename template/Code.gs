/**
 * Odoo RDD Template - Script principal du template
 * 
 * Ce script minimaliste appelle la bibliothèque Odoo_RDD_Library
 * pour toutes les fonctionnalités métier.
 * 
 * @version 0.1.0
 */

/**
 * Fonction appelée à l'installation du script
 * Crée le trigger installable pour onOpen
 */
function onInstall() {
  onOpen();
  createOnOpenTrigger();
}

/**
 * Crée un trigger installable pour onOpen
 */
function createOnOpenTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();
  
  // Supprimer les anciens triggers
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'onOpen') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Créer un nouveau trigger installable
  ScriptApp.newTrigger('onOpen')
    .onOpen()
    .create();
}

/**
 * Fonction appelée à l'ouverture du fichier
 * Initialise les menus et vérifie la configuration
 */
function onOpen(e) {
  try {
    var ui = SpreadsheetApp.getUi();
    
    // Créer les menus personnalisés
    ui.createMenu('Odoo RDD')
      .addItem('Configuration', 'showConfigSidebar')
      .addSeparator()
      .addSubMenu(ui.createMenu('Traitement des données')
        .addItem('Dédoublonnage', 'showDeduplicationMenu')
        .addItem('Formatage', 'showFormattingMenu')
        .addItem('Enrichissement', 'showEnrichmentMenu')
        .addItem('Validation', 'showValidationMenu'))
      .addSubMenu(ui.createMenu('Odoo Sync')
        .addItem('Echantillon onglet', 'testSheetSample')
        .addItem('Echantillon global', 'testGlobalSample')
        .addItem('Importation', 'importData'))
      .addSubMenu(ui.createMenu('Outils')
        .addItem('Tester la connexion', 'testConnectionFromMenu')
        .addItem('Réparation', 'repairFile'))
      .addToUi();
    
    Logger.log('Menus Odoo RDD créés');
    
    // Vérifier la configuration initiale
    // Note: showSidebar() ne peut pas être appelé depuis un trigger automatique
    // On utilise une approche différente : vérifier et afficher un message si nécessaire
    checkInitialSetup();
  } catch (error) {
    Logger.log('Erreur dans onOpen: ' + error.toString());
  }
}

/**
 * Vérifie si le fichier est correctement configuré
 */
function checkInitialSetup() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Vérifier la présence de l'onglet Paramètres
    var paramsSheet = ss.getSheetByName('Paramètres');
    if (!paramsSheet) {
      // Créer l'onglet Paramètres (masqué)
      paramsSheet = ss.insertSheet('Paramètres');
      initializeParamsSheet(paramsSheet);
    } else {
      // S'assurer que l'onglet est masqué
      try {
        paramsSheet.hideSheet();
      } catch (e) {
        // L'onglet est peut-être déjà masqué, ignorer l'erreur
      }
    }
    
    // Vérifier si les paramètres sont renseignés
    var config = getOdooConfig();
    if (!config.url || !config.database || !config.user || !config.apiKey) {
      // Paramètres manquants, afficher un message invitant à utiliser le menu
      var ui = SpreadsheetApp.getUi();
      ui.alert(
        'Configuration requise',
        'Veuillez configurer la connexion Odoo.\n\nUtilisez le menu "Odoo RDD > Configuration" pour accéder au formulaire de configuration.',
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    Logger.log('Erreur dans checkInitialSetup: ' + error.toString());
  }
}

/**
 * Initialise l'onglet Paramètres avec la structure de base
 */
function initializeParamsSheet(sheet) {
  // En-têtes
  sheet.getRange('A1').setValue('Paramètre');
  sheet.getRange('B1').setValue('Valeur');
  
  // Configuration Odoo
  sheet.getRange('A2').setValue('Odoo URL');
  sheet.getRange('A3').setValue('Odoo Database');
  sheet.getRange('A4').setValue('Odoo User');
  sheet.getRange('A5').setValue('Odoo API Key');
  
  // Formatage
  sheet.getRange('A1:B1').setFontWeight('bold');
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 300);
  
  // Masquer l'onglet
  sheet.hideSheet();
}

/**
 * Récupère la configuration Odoo depuis l'onglet Paramètres
 * @return {Object} Configuration Odoo avec url, database, user, apiKey
 */
function getOdooConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paramsSheet = ss.getSheetByName('Paramètres');
  
  if (!paramsSheet) {
    return { url: '', database: '', user: '', apiKey: '' };
  }
  
  // Récupérer les valeurs depuis l'onglet Paramètres
  var url = paramsSheet.getRange('B2').getValue() || '';
  var database = paramsSheet.getRange('B3').getValue() || '';
  var user = paramsSheet.getRange('B4').getValue() || '';
  var apiKey = paramsSheet.getRange('B5').getValue() || '';
  
  // Normaliser l'URL
  url = normalizeOdooUrl(url.toString().trim());
  
  return {
    url: url,
    database: database.toString().trim(),
    user: user.toString().trim(),
    apiKey: apiKey.toString().trim()
  };
}

/**
 * Normalise l'URL Odoo (enlève le / à la fin)
 * @param {string} url - URL à normaliser
 * @return {string} URL normalisée
 */
function normalizeOdooUrl(url) {
  if (!url) return '';
  var normalized = url.trim();
  // Enlever le / à la fin
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Identifie les champs problématiques dans la configuration
 * @param {Object} config - Configuration à vérifier
 * @param {Object} testResult - Résultat du test de connexion
 * @return {Object} Objet avec les champs en erreur
 */
function identifyErrorFields(config, testResult) {
  var errorFields = {};
  
  // Vérifier les champs vides
  if (!config.url || config.url.trim() === '') {
    errorFields.url = true;
  }
  if (!config.database || config.database.trim() === '') {
    errorFields.database = true;
  }
  if (!config.user || config.user.trim() === '') {
    errorFields.user = true;
  }
  if (!config.apiKey || config.apiKey.trim() === '') {
    errorFields.apiKey = true;
  }
  
  // Si le test de connexion échoue, identifier le champ problématique selon le type d'erreur
  if (testResult && !testResult.success) {
    var message = testResult.message.toLowerCase();
    
    // Utiliser errorType si disponible (retourné par la library)
    if (testResult.errorType) {
      if (testResult.errorType === 'database') {
        // Erreur de base de données (base inexistante, etc.)
        errorFields.database = true;
      } else if (testResult.errorType === 'credentials') {
        // Erreur d'authentification (user ou apiKey incorrect)
        errorFields.user = true;
        errorFields.apiKey = true;
      }
    } else {
      // Fallback : analyser le message d'erreur
      // Si l'erreur mentionne l'URL, c'est probablement l'URL qui pose problème
      if (message.indexOf('url') !== -1 || 
          message.indexOf('endpoint') !== -1 || 
          message.indexOf('connecter') !== -1 ||
          message.indexOf('http') !== -1) {
        errorFields.url = true;
      }
      // Si l'erreur mentionne la base de données
      if (message.indexOf('base de données') !== -1 || 
          message.indexOf('database') !== -1 ||
          message.indexOf('introuvable') !== -1) {
        errorFields.database = true;
      }
      // Si l'erreur mentionne l'authentification, user ou api key
      if (message.indexOf('authentification') !== -1 || 
          message.indexOf('utilisateur') !== -1 ||
          message.indexOf('user') !== -1 ||
          message.indexOf('api') !== -1 ||
          message.indexOf('key') !== -1) {
        errorFields.user = true;
        errorFields.apiKey = true;
      }
    }
  }
  
  return errorFields;
}

/**
 * Valide et sécurise les données de configuration contre les injections malveillantes
 * @param {Object} config - Configuration avec url, database, user, apiKey
 * @return {Object} Résultat de validation avec isValid, errors, et sanitizedConfig
 */
function validateAndSanitizeConfig(config) {
  var errors = {};
  var sanitizedConfig = {};
  var isValid = true;
  
  // Patterns suspects à détecter (dans tous les champs sauf URL)
  var suspiciousPatterns = [
    // XSS - Balises HTML/JavaScript
    /<script[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick=, onerror=, etc.
    
    // XML Injection
    /<!\[CDATA\[/gi,
    /]]>/gi,
    /<\?xml/gi,
    
    // SQL Injection (au cas où)
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    
    // Entités HTML suspectes
    /&#x?[0-9a-f]+;/gi,
  ];
  
  // Patterns suspects spécifiques pour les champs non-URL (database, user, apiKey)
  var suspiciousPatternsNonUrl = [
    /<[^>]+>/g, // Toute balise HTML (valide dans les URLs pour les paramètres)
  ];
  
  // Fonction pour valider un champ
  function validateField(fieldName, value, options) {
    options = options || {};
    var fieldErrors = [];
    
    // Vérifier si le champ est requis
    if (options.required && (!value || value.trim() === '')) {
      fieldErrors.push('Ce champ est requis');
      return { isValid: false, errors: fieldErrors, sanitized: '' };
    }
    
    // Si vide et non requis, retourner vide
    if (!value || value.trim() === '') {
      return { isValid: true, errors: [], sanitized: '' };
    }
    
    var sanitized = value.trim();
    
    // Vérifier la longueur maximale
    if (options.maxLength && sanitized.length > options.maxLength) {
      fieldErrors.push('Ce champ ne peut pas dépasser ' + options.maxLength + ' caractères');
    }
    
    // Détecter les patterns suspects (toujours vérifiés)
    for (var i = 0; i < suspiciousPatterns.length; i++) {
      if (suspiciousPatterns[i].test(sanitized)) {
        fieldErrors.push('Caractères ou patterns suspects détectés. Tentative d\'injection possible.');
        Logger.log('⚠️ Tentative d\'injection détectée dans ' + fieldName + ': ' + sanitized.substring(0, 100));
        break; // Ne pas continuer si une injection est détectée
      }
    }
    
    // Détecter les patterns suspects spécifiques pour les champs non-URL
    if (options.type !== 'url') {
      for (var j = 0; j < suspiciousPatternsNonUrl.length; j++) {
        if (suspiciousPatternsNonUrl[j].test(sanitized)) {
          fieldErrors.push('Caractères ou patterns suspects détectés. Tentative d\'injection possible.');
          Logger.log('⚠️ Tentative d\'injection détectée dans ' + fieldName + ': ' + sanitized.substring(0, 100));
          break;
        }
      }
    }
    
    // Validation spécifique selon le type de champ
    if (options.type === 'url') {
      // Valider le format URL
      var urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
      if (!urlPattern.test(sanitized)) {
        fieldErrors.push('Format d\'URL invalide');
      }
    } else if (options.type === 'database') {
      // Base de données : alphanumérique, underscore, tiret, point
      // Les noms de bases Odoo peuvent contenir des points (ex: "my.db.name")
      var dbPattern = /^[a-zA-Z0-9._-]+$/;
      if (!dbPattern.test(sanitized)) {
        fieldErrors.push('Le nom de base de données ne peut contenir que des lettres, chiffres, points, tirets et underscores');
      }
    } else if (options.type === 'user') {
      // Utilisateur : alphanumérique, underscore, @, point, tiret
      var userPattern = /^[a-zA-Z0-9._@-]+$/;
      if (!userPattern.test(sanitized)) {
        fieldErrors.push('Le nom d\'utilisateur contient des caractères invalides');
      }
    } else if (options.type === 'apiKey') {
      // API Key : généralement alphanumérique et caractères spéciaux de base64
      // On accepte une large gamme mais on vérifie quand même les injections
      if (sanitized.length < 8) {
        fieldErrors.push('L\'API key semble trop courte');
      }
    }
    
    // Nettoyer les caractères de contrôle
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    return {
      isValid: fieldErrors.length === 0,
      errors: fieldErrors,
      sanitized: sanitized
    };
  }
  
  // Valider chaque champ
  var urlValidation = validateField('url', config.url, {
    required: true,
    type: 'url',
    maxLength: 500
  });
  if (!urlValidation.isValid) {
    errors.url = urlValidation.errors;
    isValid = false;
  }
  sanitizedConfig.url = urlValidation.sanitized;
  
  var databaseValidation = validateField('database', config.database, {
    required: true,
    type: 'database',
    maxLength: 100
  });
  if (!databaseValidation.isValid) {
    errors.database = databaseValidation.errors;
    isValid = false;
  }
  sanitizedConfig.database = databaseValidation.sanitized;
  
  var userValidation = validateField('user', config.user, {
    required: true,
    type: 'user',
    maxLength: 100
  });
  if (!userValidation.isValid) {
    errors.user = userValidation.errors;
    isValid = false;
  }
  sanitizedConfig.user = userValidation.sanitized;
  
  var apiKeyValidation = validateField('apiKey', config.apiKey, {
    required: true,
    type: 'apiKey',
    maxLength: 500
  });
  if (!apiKeyValidation.isValid) {
    errors.apiKey = apiKeyValidation.errors;
    isValid = false;
  }
  sanitizedConfig.apiKey = apiKeyValidation.sanitized;
  
  return {
    isValid: isValid,
    errors: errors,
    sanitizedConfig: sanitizedConfig
  };
}

/**
 * Sauvegarde la configuration Odoo dans l'onglet Paramètres
 * @param {Object} config - Configuration avec url, database, user, apiKey
 * @return {Object} Résultat avec success et message
 */
function saveConfig(config) {
  try {
    // VALIDATION DE SÉCURITÉ : Vérifier et nettoyer les données avant traitement
    var validation = validateAndSanitizeConfig(config);
    
    if (!validation.isValid) {
      // Construire un message d'erreur détaillé
      var errorMessages = [];
      var errorFields = {};
      
      for (var field in validation.errors) {
        if (validation.errors.hasOwnProperty(field)) {
          errorFields[field] = true;
          errorMessages.push(field + ': ' + validation.errors[field].join(', '));
        }
      }
      
      Logger.log('⚠️ Tentative d\'enregistrement rejetée - Erreurs de validation: ' + errorMessages.join(' | '));
      
      return {
        success: false,
        message: 'Erreur de validation de sécurité. Les données contiennent des caractères suspects ou invalides.',
        validationErrors: validation.errors,
        errorFields: errorFields
      };
    }
    
    // Utiliser les données nettoyées
    config = validation.sanitizedConfig;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var paramsSheet = ss.getSheetByName('Paramètres');
    
    // Normaliser l'URL
    config.url = normalizeOdooUrl(config.url);
    
    // Si l'onglet n'existe pas, le créer
    if (!paramsSheet) {
      paramsSheet = ss.insertSheet('Paramètres');
      initializeParamsSheet(paramsSheet);
    }
    
    // Sauvegarder les valeurs (SpreadsheetApp.setValue() échappe automatiquement)
    paramsSheet.getRange('B2').setValue(config.url || '');
    paramsSheet.getRange('B3').setValue(config.database || '');
    paramsSheet.getRange('B4').setValue(config.user || '');
    paramsSheet.getRange('B5').setValue(config.apiKey || '');
    
    // S'assurer que l'onglet est masqué
    paramsSheet.hideSheet();
    
    // Tester la connexion Odoo
    var testResult = testOdooConnection(config);
    
    // Identifier les champs problématiques
    var errorFields = identifyErrorFields(config, testResult);
    
    return {
      success: true,
      message: 'Configuration enregistrée avec succès',
      connectionTest: testResult,
      errorFields: errorFields
    };
  } catch (error) {
    Logger.log('Erreur dans saveConfig: ' + error.toString());
    return {
      success: false,
      message: 'Erreur lors de l\'enregistrement: ' + error.toString()
    };
  }
}

/**
 * Teste la connexion à Odoo
 * @param {Object} config - Configuration Odoo (optionnel, utilise getOdooConfig si non fourni)
 * @return {Object} Résultat du test avec success et message
 */
function testOdooConnection(config) {
  try {
    // Utiliser la configuration fournie ou récupérer depuis l'onglet
    if (!config) {
      config = getOdooConfig();
    }
    
    // Vérifier que tous les paramètres sont présents
    if (!config.url || !config.database || !config.user || !config.apiKey) {
      return {
        success: false,
        message: 'Paramètres incomplets. Veuillez renseigner tous les champs de configuration.'
      };
    }
    
    // Normaliser l'URL
    config.url = normalizeOdooUrl(config.url);
    
    // Appeler la fonction de test de la library
    if (typeof OdooRDD !== 'undefined' && OdooRDD.testConnection) {
      try {
        return OdooRDD.testConnection(config);
      } catch (libraryError) {
        Logger.log('Erreur lors de l\'appel à OdooRDD.testConnection: ' + libraryError.toString());
        return {
          success: false,
          message: 'Erreur lors du test de connexion: ' + libraryError.toString()
        };
      }
    } else {
      Logger.log('Bibliothèque OdooRDD non disponible');
      return {
        success: false,
        message: 'Bibliothèque OdooRDD non chargée. Vérifiez que la bibliothèque est correctement configurée dans Extensions > Apps Script > Ressources > Bibliothèques.'
      };
    }
  } catch (error) {
    Logger.log('Erreur dans testOdooConnection: ' + error.toString());
    return {
      success: false,
      message: 'Erreur lors du test: ' + error.toString()
    };
  }
}

/**
 * Affiche la sidebar de configuration
 */
function showConfigSidebar() {
  var config = getOdooConfig();
  config.errorFields = {};
  var html = HtmlService.createTemplateFromFile('ConfigSidebar');
  html.config = config;
  var htmlOutput = html.evaluate()
    .setTitle('Configuration Odoo')
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

/**
 * Placeholder functions pour les menus
 */
function showDeduplicationMenu() {
  SpreadsheetApp.getUi().alert('Fonctionnalité de dédoublonnage à venir');
}

function showFormattingMenu() {
  SpreadsheetApp.getUi().alert('Fonctionnalité de formatage à venir');
}

function showEnrichmentMenu() {
  SpreadsheetApp.getUi().alert('Fonctionnalité d\'enrichissement à venir');
}

function showValidationMenu() {
  SpreadsheetApp.getUi().alert('Fonctionnalité de validation à venir');
}

function testSheetSample() {
  SpreadsheetApp.getUi().alert('Test d\'échantillon d\'onglet à venir');
}

function testGlobalSample() {
  SpreadsheetApp.getUi().alert('Test d\'échantillon global à venir');
}

function importData() {
  SpreadsheetApp.getUi().alert('Importation des données à venir');
}

function repairFile() {
  SpreadsheetApp.getUi().alert('Fonction de réparation à venir');
}

/**
 * Affiche le résultat du test de connexion dans une boîte de dialogue
 * @param {Object} result - Résultat de la sauvegarde avec connectionTest
 */
function showConnectionResult(result) {
  var ui = SpreadsheetApp.getUi();
  var title = 'Résultat de la configuration';
  var message = '';
  
  if (result.connectionTest) {
    if (result.connectionTest.success) {
      message = '✅ Connexion à Odoo réussie!\n\nLa configuration a été enregistrée avec succès.';
      ui.alert(title, message, ui.ButtonSet.OK);
    } else {
      // Ne pas afficher de boîte de dialogue en cas d'échec
      // L'erreur est déjà affichée dans la sidebar
    }
  } else {
    message = result.message || 'Configuration enregistrée.';
    ui.alert(title, message, ui.ButtonSet.OK);
  }
}

/**
 * Teste la connexion depuis le menu Outils
 */
function testConnectionFromMenu() {
  var config = getOdooConfig();
  var testResult = testOdooConnection(config);
  
  var ui = SpreadsheetApp.getUi();
  var title = 'Test de connexion Odoo';
  var message = '';
  
  if (testResult.success) {
    message = '✅ Connexion réussie!\n\nL\'instance Odoo est accessible avec les paramètres configurés.';
    ui.alert(title, message, ui.ButtonSet.OK);
  } else {
    // Identifier les champs problématiques
    var errorFields = identifyErrorFields(config, testResult);
    
    // Message synthétique
    var errorMessage = testResult.message || 'Erreur de connexion';
    // Raccourcir le message si trop long
    if (errorMessage.length > 100) {
      errorMessage = errorMessage.substring(0, 97) + '...';
    }
    
    message = '❌ Connexion échouée\n\n' + errorMessage;
    ui.alert(title, message, ui.ButtonSet.OK);
    
    // Ouvrir la sidebar avec les valeurs actuelles et les champs problématiques
    showConfigSidebarWithErrors(errorFields);
  }
}

/**
 * Affiche la sidebar de configuration avec les erreurs
 * @param {Object} errorFields - Champs en erreur
 */
function showConfigSidebarWithErrors(errorFields) {
  var config = getOdooConfig();
  config.errorFields = errorFields || {};
  
  var html = HtmlService.createTemplateFromFile('ConfigSidebar');
  html.config = config;
  var htmlOutput = html.evaluate()
    .setTitle('Configuration Odoo')
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

