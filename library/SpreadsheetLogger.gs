/**
 * SpreadsheetLogger - Module de logging dans Google Sheets
 */

var SpreadsheetLogger = (function() {
  
  var LOG_SHEET_NAME = "Admin Logs";
  var MAX_LOGS = 1000;
  
  /**
   * Écrit un message dans l'onglet de logs
   */
  function log(message, type) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) return; // Pas de spreadsheet actif (contexte webapp pur ?)
      
      var sheet = ss.getSheetByName(LOG_SHEET_NAME);
      if (!sheet) {
        sheet = ss.insertSheet(LOG_SHEET_NAME);
        sheet.appendRow(["Timestamp", "Type", "Message"]);
        sheet.setFrozenRows(1);
        sheet.getRange("A1:C1").setFontWeight("bold");
        sheet.setColumnWidth(1, 150);
        sheet.setColumnWidth(2, 80);
        sheet.setColumnWidth(3, 500);
      }
      
      var timestamp = new Date();
      var typeStr = type || "INFO";
      
      // On insère en haut (après l'en-tête) pour avoir les logs récents en premier
      sheet.insertRowAfter(1);
      sheet.getRange(2, 1, 1, 3).setValues([[timestamp, typeStr, message]]);
      
      // Nettoyage des vieux logs
      var lastRow = sheet.getLastRow();
      if (lastRow > MAX_LOGS) {
        sheet.deleteRows(MAX_LOGS + 1, lastRow - MAX_LOGS);
      }
      
    } catch (e) {
      // Fallback si on ne peut pas écrire dans le sheet
      console.error("Erreur SpreadsheetLogger: " + e);
    }
  }
  
  return {
    log: log,
    info: function(msg) { log(msg, "INFO"); },
    error: function(msg) { log(msg, "ERROR"); },
    warn: function(msg) { log(msg, "WARN"); }
  };
})();
