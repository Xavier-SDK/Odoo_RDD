/**
 * Odoo RDD Library - Bibliothèque centrale
 * 
 * Cette bibliothèque contient toute l'intelligence métier pour la migration
 * de données vers Odoo via Google Sheets.
 * 
 * @version 0.1.0
 * @author Odoo RDD Team
 */

/**
 * Namespace OdooRDD pour exposer les fonctions de la library
 */
var OdooRDD = {
  /**
   * Teste la connexion à Odoo
   * @param {Object} config - Configuration avec url, database, user, apiKey
   * @return {Object} Résultat avec success et message
   */
  testConnection: function(config) {
    return testConnection(config);
  }
};

/**
 * Initialisation de la bibliothèque
 */
function init() {
  Logger.log('Odoo RDD Library initialisée');
}

