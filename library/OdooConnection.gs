/**
 * OdooConnection - Module de connexion à Odoo
 * 
 * Gère la connexion XML-RPC à Odoo et les tests de connexion
 * 
 * @version 0.1.0
 */

/**
 * Teste la connexion à Odoo
 * @param {Object} config - Configuration avec url, database, user, apiKey
 * @return {Object} Résultat avec success et message
 */
function testConnection(config) {
  try {
    // Vérifier que tous les paramètres sont présents
    if (!config.url || !config.database || !config.user || !config.apiKey) {
      return {
        success: false,
        message: 'Paramètres incomplets'
      };
    }
    
    // Nettoyer l'URL (enlever le slash final si présent)
    var url = config.url.replace(/\/$/, '');
    
    // Vérifier le format de l'URL
    var urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(url)) {
      return {
        success: false,
        message: 'Format d\'URL invalide. Format attendu: https://votre-instance.odoo.com'
      };
    }
    
    // Construire l'URL XML-RPC
    var xmlRpcUrl = url + '/xmlrpc/2/common';
    
    try {
      // Tenter une connexion basique avec authenticate
      // Note: Pour l'instant, on fait un test simple de connectivité
      // L'implémentation complète XML-RPC viendra plus tard
      
      var response = UrlFetchApp.fetch(xmlRpcUrl, {
        method: 'post',
        contentType: 'text/xml',
        payload: '<?xml version="1.0"?><methodCall><methodName>version</methodName></methodCall>',
        muteHttpExceptions: true
      });
      
      var statusCode = response.getResponseCode();
      
      if (statusCode === 200 || statusCode === 405) {
        // 200 = OK, 405 = Method Not Allowed (mais le serveur répond)
        // Cela signifie que le serveur Odoo est accessible
        return {
          success: true,
          message: 'Connexion réussie à ' + url
        };
      } else if (statusCode === 404) {
        return {
          success: false,
          message: 'Endpoint XML-RPC non trouvé. Vérifiez que l\'URL est correcte.'
        };
      } else {
        return {
          success: false,
          message: 'Erreur HTTP ' + statusCode + '. Vérifiez l\'URL et les paramètres.'
        };
      }
    } catch (fetchError) {
      // Erreur de connexion réseau
      return {
        success: false,
        message: 'Impossible de se connecter à ' + url + '. Vérifiez l\'URL et votre connexion internet.'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Erreur lors du test: ' + error.toString()
    };
  }
}

