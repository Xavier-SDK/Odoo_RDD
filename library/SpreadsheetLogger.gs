/**
 * SpreadsheetLogger - Module de logging dans Google Sheets
 */

var SpreadsheetLogger = (function() {
  // Version légère qui utilise les logs natifs Apps Script (Cloud Logging)
  
  function log(message, type) {
    var prefix = type ? "[" + type + "] " : "";
    console.log(prefix + message);
    // Pour compatibilité avec l'ancien Logger si besoin
    if (type === 'ERROR') Logger.log('ERROR: ' + message);
  }
  
  return {
    log: log,
    info: function(msg) { console.info(msg); },
    error: function(msg) { console.error(msg); },
    warn: function(msg) { console.warn(msg); }
  };
})();
