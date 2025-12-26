/**
 * OdooConnection - Module de connexion à Odoo
 */

function testConnection(config) {
  try {
    if (!config.url || !config.database || !config.user || !config.apiKey) {
      return {
        success: false,
        message: 'Paramètres incomplets',
        errorFields: {
          url: !config.url,
          database: !config.database,
          user: !config.user,
          apiKey: !config.apiKey
        }
      };
    }
    
    var url = normalizeOdooUrl(config.url);
    
    var urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(url)) {
      return {
        success: false,
        message: 'Format d\'URL invalide. Format attendu: https://votre-instance.odoo.com',
        errorFields: { url: true }
      };
    }
    
    var xmlRpcUrl = url + '/xmlrpc/2/common';
    
    try {
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
      
      SpreadsheetLogger.info('Status Code: ' + statusCode);
      SpreadsheetLogger.info('Réponse XML-RPC complète: ' + responseText);
      
      if (statusCode === 200) {
        if (responseText.indexOf('<fault>') !== -1) {
          SpreadsheetLogger.error('Erreur détectée: structure <fault> présente');
          
          var faultStringMatch = responseText.match(/<name>faultString<\/name>\s*<value><string>(.*?)<\/string><\/value>/is);
          var errorMessage = 'Erreur serveur Odoo';
          
          if (faultStringMatch && faultStringMatch[1]) {
            var faultString = faultStringMatch[1];
            faultString = faultString.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            
            if (faultString.indexOf('database') !== -1 && faultString.indexOf('does not exist') !== -1) {
              errorMessage = 'Base de données introuvable. Vérifiez le nom de la base de données.';
            } else if (faultString.indexOf('KeyError') !== -1) {
              errorMessage = 'Base de données introuvable. Vérifiez le nom de la base de données.';
            } else {
              var lines = faultString.split('\n');
              for (var l = 0; l < lines.length; l++) {
                if (lines[l].trim() && lines[l].indexOf('Traceback') === -1) {
                  errorMessage = 'Erreur serveur: ' + lines[l].trim().substring(0, 100);
                  break;
                }
              }
            }
          }
          
          SpreadsheetLogger.error('Message d\'erreur extrait: ' + errorMessage);
          return {
            success: false,
            message: errorMessage,
            errorType: 'database'
          };
        }
        
        var lowerResponse = responseText.toLowerCase();
        
        // Vérification basique que c'est bien une réponse XML (évite les pages HTML 200 OK)
        if (responseText.trim().indexOf('<?xml') !== 0 && responseText.indexOf('<methodResponse>') === -1) {
           SpreadsheetLogger.warn('Réponse non-XML reçue (probablement pas un serveur Odoo)');
           return {
             success: false,
             message: 'Réponse invalide du serveur. Êtes-vous sûr de l\'URL ? (Ce n\'est pas une réponse XML-RPC valide)',
             errorType: 'connection'
           };
        }

        if (lowerResponse.indexOf('<boolean>0</boolean>') !== -1 ||
            lowerResponse.indexOf('<boolean>false</boolean>') !== -1 ||
            lowerResponse.indexOf('<value><boolean>0</boolean></value>') !== -1 ||
            lowerResponse.indexOf('<value><boolean>false</boolean></value>') !== -1) {
          SpreadsheetLogger.warn('Échec détecté: réponse contient false');
          return {
            success: false,
            message: 'Authentification échouée. Vérifiez le nom d\'utilisateur et l\'API key.',
            errorType: 'credentials'
          };
        }
        
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
            SpreadsheetLogger.info('UID extrait: ' + uid);
            break;
          }
        }
        
        if (uid !== null && uid > 0) {
          SpreadsheetLogger.info('✅ Authentification réussie - User ID: ' + uid);
          return {
            success: true,
            uid: uid,
            message: 'Connexion réussie à ' + url + ' (User ID: ' + uid + ')'
          };
        }
        
        SpreadsheetLogger.error('❌ Authentification échouée - UID: ' + uid);
        return {
          success: false,
          message: 'Authentification échouée. Vérifiez la base de données, l\'utilisateur et l\'API key.'
        };
      } else if (statusCode === 404) {
        return {
          success: false,
          message: 'Endpoint XML-RPC non trouvé. Vérifiez que l\'URL est correcte.',
          errorType: 'connection'
        };
      } else {
        return {
          success: false,
          message: 'Erreur HTTP ' + statusCode + '. Vérifiez l\'URL et les paramètres.',
          errorType: 'connection'
        };
      }
    } catch (fetchError) {
      return {
        success: false,
        message: 'Impossible de se connecter à ' + url + '. Vérifiez l\'URL et votre connexion internet.',
        errorType: 'connection'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Erreur lors du test: ' + error.toString()
    };
  }
}

function normalizeOdooUrl(url) {
  if (!url) return '';
  var normalized = url.toString().trim();
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function escapeXml(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Exécute une méthode Odoo via XML-RPC
 * @param {Object} config - Configuration
 * @param {String} model - Modèle Odoo (ex: 'res.partner')
 * @param {String} method - Méthode (ex: 'search_read')
 * @param {Array} args - Arguments positionnels
 * @param {Object} kwargs - Arguments nommés
 * @return {Object} Résultat de l'appel
 */
function execute_kw(config, model, method, args, kwargs) {
  if (!config.url || !config.database || !config.user || !config.apiKey) {
    throw new Error('Configuration incomplète');
  }
  
  var url = normalizeOdooUrl(config.url);
  var xmlRpcUrl = url + '/xmlrpc/2/object';
  
  // 1. Authentification pour obtenir l'UID
  var authResult = testConnection(config);
  if (!authResult.success) {
    throw new Error('Connexion impossible: ' + authResult.message);
  }
  
  // Récupération de l'UID depuis le résultat (qu'on va devoir standardiser)
  // Pour l'instant, on va extraire l'UID manuellement car testConnection retourne du texte pour l'UI
  // Mais testConnection retourne {success: true, message: ...}
  // On va modifier testConnection pour retourner l'uid proprement dans l'objet
  var uid = authResult.uid; 
  
  if (!uid) {
     throw new Error('Impossible de récupérer l\'UID utilisateur');
  }
  
  // 2. Préparation des paramètres pour l'appel object
  // Structure: execute_kw(db, uid, password, model, method, args, kwargs)
  
  var xmlPayload = '<?xml version="1.0"?>' +
    '<methodCall>' +
    '<methodName>execute_kw</methodName>' +
    '<params>' +
    '<param><value><string>' + escapeXml(config.database) + '</string></value></param>' +
    '<param><value><int>' + uid + '</int></value></param>' +
    '<param><value><string>' + escapeXml(config.apiKey) + '</string></value></param>' +
    '<param><value><string>' + escapeXml(model) + '</string></value></param>' +
    '<param><value><string>' + escapeXml(method) + '</string></value></param>' +
    '<param><value>' + convertToXmlRpc(args || []) + '</value></param>';
    
  if (kwargs) {
    xmlPayload += '<param><value>' + convertToXmlRpc(kwargs) + '</value></param>';
  }
  
  xmlPayload += '</params></methodCall>';
  
  // 3. Appel XML-RPC
  var response = UrlFetchApp.fetch(xmlRpcUrl, {
    method: 'post',
    contentType: 'text/xml',
    payload: xmlPayload,
    muteHttpExceptions: true
  });
  
  var responseText = response.getContentText();
  
  if (response.getResponseCode() !== 200) {
     throw new Error('Erreur HTTP ' + response.getResponseCode());
  }
  
  if (responseText.indexOf('<fault>') !== -1) {
    var faultString = parseFaultString(responseText);
    throw new Error('Erreur Odoo: ' + faultString);
  }
  
  // 4. Parsing de la réponse
  return parseXmlRpcResponse(responseText);
}

// Helpers pour XML-RPC (très simplifiés pour l'instant)
function convertToXmlRpc(data) {
  if (data === null || data === undefined) return '<nil/>';
  if (typeof data === 'boolean') return '<boolean>' + (data ? '1' : '0') + '</boolean>';
  if (typeof data === 'number') {
    if (Number.isInteger(data)) return '<int>' + data + '</int>';
    return '<double>' + data + '</double>';
  }
  if (typeof data === 'string') return '<string>' + escapeXml(data) + '</string>';
  if (Array.isArray(data)) {
    var xml = '<array><data>';
    for (var i = 0; i < data.length; i++) {
      xml += '<value>' + convertToXmlRpc(data[i]) + '</value>';
    }
    xml += '</data></array>';
    return xml;
  }
  if (typeof data === 'object') {
    var xml = '<struct>';
    for (var key in data) {
      xml += '<member><name>' + escapeXml(key) + '</name><value>' + convertToXmlRpc(data[key]) + '</value></member>';
    }
    xml += '</struct>';
    return xml;
  }
  return '<string>' + escapeXml(String(data)) + '</string>';
}

function parseFaultString(xml) {
  var match = xml.match(/<name>faultString<\/name>\s*<value><string>(.*?)<\/string><\/value>/is);
  return match ? match[1] : 'Erreur inconnue';
}

function parseXmlRpcResponse(xml) {
  // Parsing XML-RPC robuste en Apps Script est pénible sans librairie XML
  // Pour ce POC, on va utiliser XmlService qui est natif
  var doc = XmlService.parse(xml);
  var root = doc.getRootElement();
  var params = root.getChild('params');
  if (!params) return null;
  var param = params.getChild('param');
  var value = param.getChild('value');
  return parseXmlValue(value);
}

function parseXmlValue(element) {
  var children = element.getChildren();
  if (children.length === 0) return element.getText();
  
  var type = children[0].getName();
  var value = children[0];
  
  switch(type) {
    case 'string': return value.getText();
    case 'int': 
    case 'i4': return parseInt(value.getText(), 10);
    case 'double': return parseFloat(value.getText());
    case 'boolean': return value.getText() === '1' || value.getText() === 'true';
    case 'array':
      var data = value.getChild('data');
      var values = data.getChildren('value');
      var arr = [];
      for (var i = 0; i < values.length; i++) {
        arr.push(parseXmlValue(values[i]));
      }
      return arr;
    case 'struct':
      var members = value.getChildren('member');
      var obj = {};
      for (var i = 0; i < members.length; i++) {
        var name = members[i].getChild('name').getText();
        var val = members[i].getChild('value');
        obj[name] = parseXmlValue(val);
      }
      return obj;
    case 'nil': return null;
    default: return value.getText();
  }
}
