/**
 * @fileoverview Fonctions wrapper IBAN pour Google Sheets
 * @author Xavier ROUX
 * @version 1.0.0
 *
 * Ces fonctions permettent d'utiliser la bibliothèque IBAN directement dans Google Sheets
 * comme formules personnalisées.
 *
 * IMPORTANT : 
 * 1. Ajouter la bibliothèque IBAN dans Éditeur > Bibliothèques avec l'identifiant "SDK"
 * 2. Copier ce fichier dans votre projet Apps Script lié à votre Google Sheet
 */

/**
 * @typedef {Object} IBANObject
 * @property {function(string, string=): boolean|Object} validateIBAN - Valide un numéro IBAN. Mode: "debug" (détails), ou vide (normal)
 * @property {function(string): string} generateIBAN - Génère un numéro IBAN valide pour un pays donné
 * @property {function(string): string} formatIBAN - Formate un IBAN avec des espaces tous les 4 caractères
 * @property {function(string): string} extractBBAN - Extrait le BBAN (Basic Bank Account Number) d'un IBAN
 * @property {function(): string} getVersion - Retourne la version de la bibliothèque
 * @property {function(): Array<string>} getSupportedCountries - Retourne la liste des codes pays supportés
 */

/**
 * @typedef {Object} SDKObject
 * @property {IBANObject} IBAN - Objet contenant toutes les fonctions de validation IBAN
 */

/**
 * Variable globale SDK (définie par la bibliothèque ajoutée avec l'identifiant "SDK")
 * Cette déclaration permet à l'éditeur de reconnaître le type et d'activer l'autocomplétion
 * @type {SDKObject}
 */
var SDK;

/**
 * Valide un numéro IBAN (pour Google Sheets)
 * 
 * @param {string} iban - Numéro IBAN complet avec code pays (ex: "FR1420041010050500013M02606", "BE68539007547034")
 *                         Format attendu : 2 lettres (code pays) + 2 chiffres (checksum) + BBAN
 *                         Les espaces sont automatiquement supprimés
 * @param {string=} mode - Mode de validation optionnel :
 *                         - "" ou omis : Mode normal (retourne VRAI/FAUX)
 *                         - "debug" : Retourne des détails sur l'étape d'échec (format: "STEP:REASON")
 * 
 * @return {boolean|string} 
 *         - Mode normal : VRAI si valide, FAUX sinon
 *         - Mode debug : Chaîne formatée "STEP:REASON" (ex: "FORMAT:INVALID_LENGTH_FR", "CHECKSUM:INVALID_CHECKSUM")
 * 
 * @example
 * // Mode normal (validation complète)
 * =ESTIBAN("FR1420041010050500013M02606")
 * // → VRAI ou FAUX
 * 
 * @example
 * // Mode debug (détails sur l'échec)
 * =ESTIBAN("FR123", "debug")
 * // → "FORMAT:INVALID_LENGTH_FR"
 * 
 * @customfunction
 */
function ESTIBAN(iban, mode) {
  if (!iban) return false;
  
  mode = mode || '';
  const ibanValue = iban.toString().trim();
  
  if (mode === 'debug') {
    const result = SDK.IBAN.validateIBAN(ibanValue, 'debug');
    if (result.valid) {
      return 'VALIDE';
    } else {
      // Retourner une chaîne formatée avec les détails
      return result.step + ':' + result.reason;
    }
  }
  
  return SDK.IBAN.validateIBAN(ibanValue, mode || '');
}

/**
 * Génère un numéro IBAN valide (format+checksum) pour un pays (tests uniquement)
 * 
 * Utile pour les tests et la génération de données de démonstration.
 * Note : Le numéro généré a un format et un checksum valides, mais n'est pas nécessairement
 * un compte bancaire réel.
 * 
 * @param {string} countryCode - Code pays à 2 lettres (ex: "FR", "DE", "BE", "IT", "ES")
 *                               Pays supportés : AD, AE, AL, AT, AZ, BA, BE, BG, BH, BR, BY, CH, CR, CY, CZ, DE, DK, DO, EE, EG, ES, FI, FO, FR, GB, GE, GI, GL, GR, GT, HR, HU, IE, IL, IS, IT, JO, KW, KZ, LB, LC, LI, LT, LU, LV, MC, MD, ME, MK, MR, MT, MU, NL, NO, PK, PL, PS, PT, QA, RO, RS, SA, SE, SI, SK, SM, TN, TR, UA, VG, XK
 * 
 * @return {string} Numéro IBAN valide avec code pays (ex: "FR1420041010050500013M02606") ou code d'erreur ("ERROR:INVALID_ARGUMENT", "ERROR:UNSUPPORTED_COUNTRY")
 * 
 * @example
 * // Générer un IBAN français valide
 * =IBAN_GENERER("FR")
 * // → "FR1420041010050500013M02606" (exemple)
 * 
 * @example
 * // Générer un IBAN belge valide
 * =IBAN_GENERER("BE")
 * // → "BE68539007547034" (exemple)
 * 
 * @customfunction
 */
function IBAN_GENERER(countryCode) {
  if (!countryCode) return "ERROR:INVALID_ARGUMENT";
  const result = SDK.IBAN.generateIBAN(countryCode.toString().trim().toUpperCase());
  // Si le résultat commence par "ERROR:", c'est un code d'erreur
  if (result && result.indexOf('ERROR:') === 0) {
    return result;
  }
  return result;
}

/**
 * Formate un IBAN avec des espaces tous les 4 caractères (pour Google Sheets)
 * 
 * @param {string} iban - Numéro IBAN à formater (avec ou sans espaces)
 * 
 * @return {string} IBAN formaté avec des espaces tous les 4 caractères (ex: "FR14 2004 1010 0505 0001 3M02 606")
 * 
 * @example
 * // Formater un IBAN
 * =IBAN_FORMATER("FR1420041010050500013M02606")
 * // → "FR14 2004 1010 0505 0001 3M02 606"
 * 
 * @customfunction
 */
function IBAN_FORMATER(iban) {
  if (!iban) return '';
  return SDK.IBAN.formatIBAN(iban.toString().trim());
}

/**
 * Extrait le BBAN (Basic Bank Account Number) d'un IBAN (pour Google Sheets)
 * 
 * Le BBAN est la partie de l'IBAN sans le code pays et le checksum.
 * 
 * @param {string} iban - Numéro IBAN complet
 * 
 * @return {string} BBAN extrait (ex: "20041010050500013M02606" pour "FR1420041010050500013M02606")
 * 
 * @example
 * // Extraire le BBAN d'un IBAN français
 * =IBAN_BBAN("FR1420041010050500013M02606")
 * // → "20041010050500013M02606"
 * 
 * @customfunction
 */
function IBAN_BBAN(iban) {
  if (!iban) return '';
  return SDK.IBAN.extractBBAN(iban.toString().trim());
}

/**
 * Retourne la version de la bibliothèque IBAN (pour Google Sheets)
 * 
 * @return {string} Version de la bibliothèque (ex: "1.0.0")
 * 
 * @example
 * // Obtenir la version
 * =IBAN_VERSION()
 * // → "1.0.0"
 * 
 * @customfunction
 */
function IBAN_VERSION() {
  return SDK.IBAN.getVersion();
}

/**
 * Retourne la liste des codes pays supportés (pour Google Sheets)
 * 
 * @return {string} Liste des codes pays séparés par des virgules (ex: "AD, AE, AL, AT, AZ, BA, BE, ...")
 * 
 * @example
 * // Obtenir la liste des pays supportés
 * =IBAN_PAYS()
 * // → "AD, AE, AL, AT, AZ, BA, BE, BG, BH, BR, BY, CH, CR, CY, CZ, DE, DK, DO, EE, EG, ES, FI, FO, FR, GB, GE, GI, GL, GR, GT, HR, HU, IE, IL, IS, IT, JO, KW, KZ, LB, LC, LI, LT, LU, LV, MC, MD, ME, MK, MR, MT, MU, NL, NO, PK, PL, PS, PT, QA, RO, RS, SA, SE, SI, SK, SM, TN, TR, UA, VG, XK"
 * 
 * @customfunction
 */
function IBAN_PAYS() {
  const countries = SDK.IBAN.getSupportedCountries();
  return countries.join(', ');
}

