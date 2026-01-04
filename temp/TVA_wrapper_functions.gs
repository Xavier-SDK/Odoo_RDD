/**
 * 🔧 Fonctions Wrapper pour Google Sheets - VIES VAT Library
 * 
 * Fonctions wrapper pour faciliter l'utilisation de la bibliothèque TVA
 * directement dans Google Sheets.
 * 
 * ⚠️ IMPORTANT : Configuration de l'identifiant de la bibliothèque
 * 
 * Quand vous ajoutez la bibliothèque dans Apps Script :
 * 1. Éditeur > Bibliothèques > "+"
 * 2. Ajoutez l'ID de script : 1E9s8sErZAolahBT7pHR7EsmekAp5b_ZkAIKQ3cCzp13Zk6MKh2wSYQlL
 * 3. Dans le champ "Identifiant", utilisez : "SDK" (ou "TVA" si vous préférez)
 * 
 * ⚠️ IMPORTANT : Ce wrapper utilise l'identifiant "SDK" par défaut.
 *    Si vous utilisez un autre identifiant, remplacez "SDK" par votre identifiant.
 * 
 * Le namespace de la bibliothèque est "TVA" dans le code.
 * Avec l'identifiant "SDK", vous accédez aux fonctions via SDK.TVA.*
 */

// ============================================================================
// DÉCLARATION DE TYPE POUR L'AUTOCOMPLÉTION
// ============================================================================

/**
 * @typedef {Object} TVAObject
 * @property {function(string, string=): boolean|Object} validateVAT - Valide un numéro de TVA. Mode: "debug" (détails),"basic" (format+clé uniquement), "force" (API VIES uniquement), ou vide (format+clé+API)
 * @property {function(string): string} validateVATCompany - Valide un numéro de TVA et retourne le nom de l'entreprise
 * @property {function(string): Object} validateVATFull - Valide un numéro de TVA et retourne toutes les informations
 * @property {function(Array<string>): Array<Object>} validateVATBatch - Valide plusieurs numéros de TVA en batch
 * @property {function(string): string} generateVATNumber - Génère un numéro de TVA valide pour un pays donné
 * @property {function(): string} getVersion - Retourne la version de la bibliothèque
 * @property {function(): Array<string>} getSupportedCountries - Retourne la liste des codes pays supportés
 */

/**
 * @typedef {Object} SDKObject
 * @property {TVAObject} TVA - Objet contenant toutes les fonctions de validation TVA
 */

/**
 * Variable globale SDK (définie par la bibliothèque ajoutée avec l'identifiant "SDK")
 * Cette déclaration permet à l'éditeur de reconnaître le type et d'activer l'autocomplétion
 * @type {SDKObject}
 */
var SDK;

// ============================================================================
// FONCTIONS POUR VALIDATION TVA VIES
// ============================================================================

/**
 * Valide un numéro de TVA intracommunautaire
 * @param {string} vatNumber - Numéro de TVA avec préfixe pays (ex: "FR18417798402", "DE123456789")
 * @param {string=} mode - Mode optionnel : "" (normal: format+clé+API), "basic" (format+clé uniquement), "force" (API uniquement), "debug" (détails: "STEP:REASON")
 * @return {boolean|string} VRAI/FAUX ou "STEP:REASON" en mode debug (ex: "FORMAT:INVALID_FORMAT_FR")
 * @customfunction
 */
function ESTTVA(vatNumber, mode) {
  if (!vatNumber) return false;
  
  mode = mode || '';
  const vat = vatNumber.toString().trim();
  
  if (mode === 'debug') {
    const result = SDK.TVA.validateVAT(vat, 'debug');
    if (result.valid) {
      return 'VALIDE';
    } else {
      // Retourner une chaîne formatée avec les détails
      return result.step + ':' + result.reason;
    }
  }
  
  return SDK.TVA.validateVAT(vat, mode || '');
}

/**
 * Retourne le nom de l'entreprise associée à un numéro de TVA
 * @param {string} vatNumber - Numéro de TVA avec préfixe pays (ex: "FR18417798402")
 * @return {string} Nom de l'entreprise ou "INVALIDE"
 * @customfunction
 */
function TVA_SOCIETE(vatNumber) {
  if (!vatNumber) return "";
  return SDK.TVA.validateVATCompany(vatNumber.toString().trim());
}

/**
 * Retourne l'adresse de l'entreprise associée à un numéro de TVA
 * @param {string} vatNumber - Numéro de TVA avec préfixe pays (ex: "FR18417798402")
 * @return {string} Adresse complète ou "INVALIDE"
 * @customfunction
 */
function TVA_ADDRESSE(vatNumber) {
  if (!vatNumber) return "";
  var result = SDK.TVA.validateVATFull(vatNumber.toString().trim());
  if (result.valid && result.address) {
    return result.address;
  }
  return "INVALIDE";
}

/**
 * Retourne les informations TVA (nom et adresse) formatées
 * @param {string} vatNumber - Numéro de TVA avec préfixe pays (ex: "FR18417798402")
 * @return {string} "Nom - Adresse" si valide, "ERREUR: ..." ou "INVALIDE"
 * @customfunction
 */
function TVA_INFO(vatNumber) {
  if (!vatNumber) return "";
  var result = SDK.TVA.validateVATFull(vatNumber.toString().trim());
  
  if (result.error) {
    return "ERREUR: " + result.error;
  }
  
  if (result.valid) {
    var info = result.companyName || "";
    if (result.address) {
      info += " - " + result.address;
    }
    return info;
  }
  
  return "INVALIDE";
}

/**
 * Retourne le statut de validation d'un numéro de TVA
 * @param {string} vatNumber - Numéro de TVA avec préfixe pays (ex: "FR18417798402")
 * @return {string} "VALIDE" (existe dans VIES), "INVALIDE" ou "ERREUR"
 * @customfunction
 */
function TVA_STATUS(vatNumber) {
  if (!vatNumber) return "";
  var result = SDK.TVA.validateVATFull(vatNumber.toString().trim());
  
  if (result.error) {
    return "ERREUR";
  }
  
  return result.valid ? "VALIDE" : "INVALIDE";
}

/**
 * Retourne la version de la bibliothèque VAT
 * @return {string} Version de la bibliothèque
 * @customfunction
 */
function TVA_LIBRARY_VERSION() {
  return SDK.TVA.getVersion();
}

/**
 * Génère un numéro de TVA valide (format+clé) pour un pays (tests uniquement)
 * @param {string} countryCode - Code pays UE à 2 lettres (ex: "FR", "DE", "IT", "ES")
 * @return {string} Numéro de TVA valide (ex: "FR18417798402") ou code d'erreur ("ERROR:INVALID_ARGUMENT", "ERROR:UNSUPPORTED_COUNTRY")
 * @customfunction
 */
function TVA_GENERER(countryCode) {
  if (!countryCode) return "ERROR:INVALID_ARGUMENT";
  const result = SDK.TVA.generateVATNumber(countryCode.toString().trim().toUpperCase());
  // Si le résultat commence par "ERROR:", c'est un code d'erreur
  if (result && result.indexOf('ERROR:') === 0) {
    return result;
  }
  return result;
}

