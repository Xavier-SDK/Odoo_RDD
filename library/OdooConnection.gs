/**
 * OdooConnection - Module de connexion à Odoo
 * 
 * Gère la connexion XML-RPC à Odoo et les tests de connexion
 * 
 * @version 0.1.0
 */

/**
 * Teste la connexion à Odoo avec authentification réelle
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
    
    // Construire l'URL XML-RPC pour l'authentification
    var xmlRpcUrl = url + '/xmlrpc/2/common';
    
    try {
      // Construire la requête XML-RPC pour authenticate
      var xmlPayload = '<?xml version="1.0"?>' +
        '<methodCall>' +
        '<methodName>authenticate</methodName>' +
        '<params>' +
        '<param><value><string>' + escapeXml(config.database) + '</string></value></param>' +
        '<param><value><string>' + escapeXml(config.user) + '</string></value></param>' +
        '<param><value><string>' + escapeXml(config.apiKey) + '</string></value></param>' +
        '<param><value><struct></struct></value></param>' +
        '</params>' +
        '</methodCall>';
      
      var response = UrlFetchApp.fetch(xmlRpcUrl, {
        method: 'post',
        contentType: 'text/xml',
        payload: xmlPayload,
        muteHttpExceptions: true
      });
      
      var statusCode = response.getResponseCode();
      var responseText = response.getContentText();
      
      // Logger la réponse complète pour le débogage
      Logger.log('Status Code: ' + statusCode);
      Logger.log('Réponse XML-RPC complète: ' + responseText);
      
      // Analyser la réponse XML-RPC
      if (statusCode === 200) {
        // Odoo authenticate() retourne :
        // - Un entier (user_id/uid) > 0 si succès
        // - false si échec (user/apiKey incorrect)
        // - <fault> si erreur serveur (base de données incorrecte, etc.)
        
        // PRIORITÉ 1 : Vérifier la présence d'une structure <fault> (erreur serveur)
        // Cela indique généralement une base de données incorrecte ou une erreur serveur
        if (responseText.indexOf('<fault>') !== -1 || responseText.indexOf('<fault>') !== -1) {
          Logger.log('Erreur détectée: structure <fault> présente');
          
          // Extraire le message d'erreur depuis faultString
          var faultStringMatch = responseText.match(/<name>faultString<\/name>\s*<value><string>(.*?)<\/string><\/value>/is);
          var errorMessage = 'Erreur serveur Odoo';
          
          if (faultStringMatch && faultStringMatch[1]) {
            var faultString = faultStringMatch[1];
            // Décoder les entités HTML si présentes
            faultString = faultString.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            
            // Extraire un message d'erreur synthétique
            if (faultString.indexOf('database') !== -1 && faultString.indexOf('does not exist') !== -1) {
              errorMessage = 'Base de données introuvable. Vérifiez le nom de la base de données.';
            } else if (faultString.indexOf('KeyError') !== -1) {
              errorMessage = 'Base de données introuvable. Vérifiez le nom de la base de données.';
            } else {
              // Prendre la première ligne significative de l'erreur
              var lines = faultString.split('\n');
              for (var l = 0; l < lines.length; l++) {
                if (lines[l].trim() && lines[l].indexOf('Traceback') === -1) {
                  errorMessage = 'Erreur serveur: ' + lines[l].trim().substring(0, 100);
                  break;
                }
              }
            }
          }
          
          Logger.log('Message d\'erreur extrait: ' + errorMessage);
          return {
            success: false,
            message: errorMessage,
            errorType: 'database' // Indique que c'est probablement la base de données qui pose problème
          };
        }
        
        // PRIORITÉ 2 : Vérifier les cas d'échec explicites (false) - user ou apiKey incorrect
        var lowerResponse = responseText.toLowerCase();
        if (lowerResponse.indexOf('<boolean>0</boolean>') !== -1 ||
            lowerResponse.indexOf('<boolean>false</boolean>') !== -1 ||
            lowerResponse.indexOf('<value><boolean>0</boolean></value>') !== -1 ||
            lowerResponse.indexOf('<value><boolean>false</boolean></value>') !== -1) {
          Logger.log('Échec détecté: réponse contient false');
          return {
            success: false,
            message: 'Authentification échouée. Vérifiez le nom d\'utilisateur et l\'API key.',
            errorType: 'credentials' // Indique que c'est probablement user ou apiKey qui pose problème
          };
        }
        
        // PRIORITÉ 3 : Chercher un user_id (uid) dans la réponse XML-RPC
        // Formats possibles selon les versions d'Odoo :
        // <methodResponse><params><param><value><i4>123</i4></value></param></params></methodResponse>
        // <methodResponse><params><param><value><int>123</int></value></param></params></methodResponse>
        // IMPORTANT : Ne chercher le uid QUE dans <params>, pas dans <fault>
        var paramsSection = responseText;
        var paramsStart = responseText.indexOf('<params>');
        var paramsEnd = responseText.indexOf('</params>');
        if (paramsStart !== -1 && paramsEnd !== -1) {
          paramsSection = responseText.substring(paramsStart, paramsEnd);
        }
        
        var uidPatterns = [
          /<value><i4>(\d+)<\/i4><\/value>/i,
          /<value><int>(\d+)<\/int><\/value>/i,
          /<i4>(\d+)<\/i4>/i,
          /<int>(\d+)<\/int>/i
        ];
        
        var uid = null;
        
        for (var i = 0; i < uidPatterns.length; i++) {
          var match = paramsSection.match(uidPatterns[i]);
          if (match && match[1]) {
            uid = parseInt(match[1], 10);
            Logger.log('UID extrait: ' + uid);
            break; // Prendre le premier match trouvé
          }
        }
        
        // VALIDATION STRICTE : Un succès nécessite un uid > 0
        if (uid !== null && uid > 0) {
          Logger.log('✅ Authentification réussie - User ID: ' + uid);
          return {
            success: true,
            message: 'Connexion réussie à ' + url + ' (User ID: ' + uid + ')'
          };
        }
        
        // Si uid est 0 ou null, c'est un échec
        Logger.log('❌ Authentification échouée - UID: ' + uid);
        return {
          success: false,
          message: 'Authentification échouée. Vérifiez la base de données, l\'utilisateur et l\'API key.'
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

/**
 * Échappe les caractères XML spéciaux
 * @param {string} text - Texte à échapper
 * @return {string} Texte échappé
 */
function escapeXml(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

