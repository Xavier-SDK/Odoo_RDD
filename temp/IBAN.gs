/**
 * @fileoverview Bibliothèque Google Apps Script pour la validation et la génération de numéros IBAN
 * @author Xavier ROUX
 * @version 1.0.0
 *
 * Cette bibliothèque fournit des fonctions pour valider et générer des numéros IBAN
 * (International Bank Account Number) selon la norme ISO 13616.
 *
 * Usage dans un autre projet :
 * 1. Éditeur > Bibliothèques (puis cliquez sur "+")
 * 2. Ajouter l'ID de déploiement de cette bibliothèque
 * 3. Utiliser les fonctions : IBAN.validateIBAN("FR1420041010050500013M02606")
 */

/**
 * @typedef {Object} IBANObject
 * @property {function(string, string=): boolean|Object} validateIBAN - Valide un numéro IBAN. Modes: "debug" (détails), ou vide (normal)
 * @property {function(string): string} generateIBAN - Génère un numéro IBAN valide pour un pays donné
 * @property {function(string): string} formatIBAN - Formate un IBAN avec des espaces tous les 4 caractères
 * @property {function(string): string} extractBBAN - Extrait le BBAN (Basic Bank Account Number) d'un IBAN
 * @property {function(): string} getVersion - Retourne la version de la bibliothèque
 * @property {function(): Array<string>} getSupportedCountries - Retourne la liste des codes pays supportés
 */

/**
 * Namespace pour toutes les fonctions IBAN
 * @type {IBANObject}
 */
var IBAN = (function() {
  'use strict';
  
  const VERSION = '1.0.0';
  
  // Liste des pays supportés avec leurs formats IBAN
  const IBAN_FORMATS = {
    'AD': { length: 24, bban: '4n,4n,12c' }, // Andorre
    'AE': { length: 23, bban: '3n,16n' }, // Émirats arabes unis
    'AL': { length: 28, bban: '8n,16c' }, // Albanie
    'AT': { length: 20, bban: '5n,11n' }, // Autriche
    'AZ': { length: 28, bban: '4a,20c' }, // Azerbaïdjan
    'BA': { length: 20, bban: '3n,3n,8n,2n' }, // Bosnie-Herzégovine
    'BE': { length: 16, bban: '3n,7n,2n' }, // Belgique
    'BG': { length: 22, bban: '4a,4n,2n,8c' }, // Bulgarie
    'BH': { length: 22, bban: '4a,14c' }, // Bahreïn
    'BR': { length: 29, bban: '8n,5n,10n,1a,1c' }, // Brésil
    'BY': { length: 28, bban: '4c,4n,16c' }, // Biélorussie
    'CH': { length: 21, bban: '5n,12c' }, // Suisse
    'CR': { length: 22, bban: '4n,14n' }, // Costa Rica
    'CY': { length: 28, bban: '3n,5n,16c' }, // Chypre
    'CZ': { length: 24, bban: '4n,16n' }, // République tchèque
    'DE': { length: 22, bban: '8n,10n' }, // Allemagne
    'DK': { length: 18, bban: '4n,9n,1n' }, // Danemark
    'DO': { length: 28, bban: '4c,20n' }, // République dominicaine
    'EE': { length: 20, bban: '2n,2n,11n,1n' }, // Estonie
    'EG': { length: 29, bban: '4n,4n,17n' }, // Égypte
    'ES': { length: 24, bban: '4n,4n,1n,1n,10n' }, // Espagne
    'FI': { length: 18, bban: '6n,7n,1n' }, // Finlande
    'FO': { length: 18, bban: '4n,9n,1n' }, // Îles Féroé
    'FR': { length: 27, bban: '5n,5n,11c,2n' }, // France
    'GB': { length: 22, bban: '4a,14n' }, // Royaume-Uni
    'GE': { length: 22, bban: '2a,16n' }, // Géorgie
    'GI': { length: 23, bban: '4a,15c' }, // Gibraltar
    'GL': { length: 18, bban: '4n,9n,1n' }, // Groenland
    'GR': { length: 27, bban: '3n,4n,16c' }, // Grèce
    'GT': { length: 28, bban: '4c,20c' }, // Guatemala
    'HR': { length: 21, bban: '7n,10n' }, // Croatie
    'HU': { length: 28, bban: '3n,4n,1n,15n,1n' }, // Hongrie
    'IE': { length: 22, bban: '4a,6n,8n' }, // Irlande
    'IL': { length: 23, bban: '3n,3n,13n,2n' }, // Israël
    'IS': { length: 26, bban: '4n,18n,2n' }, // Islande
    'IT': { length: 27, bban: '1a,10n,12c' }, // Italie
    'JO': { length: 30, bban: '4a,4n,18c' }, // Jordanie
    'KW': { length: 30, bban: '4a,22c' }, // Koweït
    'KZ': { length: 20, bban: '3n,13c' }, // Kazakhstan
    'LB': { length: 28, bban: '4n,20c' }, // Liban
    'LC': { length: 32, bban: '4a,24c' }, // Sainte-Lucie
    'LI': { length: 21, bban: '5n,12c' }, // Liechtenstein
    'LT': { length: 20, bban: '5n,11n' }, // Lituanie
    'LU': { length: 20, bban: '3n,13c' }, // Luxembourg
    'LV': { length: 21, bban: '4a,13c' }, // Lettonie
    'MC': { length: 27, bban: '5n,5n,11c,2n' }, // Monaco
    'MD': { length: 24, bban: '2c,18c' }, // Moldavie
    'ME': { length: 22, bban: '3n,13n,2n' }, // Monténégro
    'MK': { length: 19, bban: '3n,10c,2n' }, // Macédoine du Nord
    'MR': { length: 27, bban: '5n,5n,11n,2n' }, // Mauritanie
    'MT': { length: 31, bban: '4a,5n,18c' }, // Malte
    'MU': { length: 30, bban: '4a,2n,2n,12n,3a,3n' }, // Maurice
    'NL': { length: 18, bban: '4a,10n' }, // Pays-Bas
    'NO': { length: 15, bban: '4n,6n,1n' }, // Norvège
    'PK': { length: 24, bban: '4a,16c' }, // Pakistan
    'PL': { length: 28, bban: '8n,16n' }, // Pologne
    'PS': { length: 29, bban: '4a,21c' }, // Palestine
    'PT': { length: 25, bban: '4n,4n,11n,2n' }, // Portugal
    'QA': { length: 29, bban: '4a,21c' }, // Qatar
    'RO': { length: 24, bban: '4a,16c' }, // Roumanie
    'RS': { length: 22, bban: '3n,13n,2n' }, // Serbie
    'SA': { length: 24, bban: '2n,18c' }, // Arabie saoudite
    'SE': { length: 24, bban: '3n,16n,1n' }, // Suède
    'SI': { length: 19, bban: '5n,8n,2n' }, // Slovénie
    'SK': { length: 24, bban: '4n,16n' }, // Slovaquie
    'SM': { length: 27, bban: '1a,10n,12c' }, // Saint-Marin
    'TN': { length: 24, bban: '2n,3n,13n,2n' }, // Tunisie
    'TR': { length: 26, bban: '5n,1n,16c' }, // Turquie
    'UA': { length: 29, bban: '6n,19c' }, // Ukraine
    'VG': { length: 24, bban: '4a,16n' }, // Îles Vierges britanniques
    'XK': { length: 20, bban: '4n,10n,2n' } // Kosovo
  };
  
  /**
   * Convertit une lettre en chiffre selon l'algorithme IBAN (A=10, B=11, ..., Z=35)
   * @param {string} char - Caractère à convertir
   * @return {string} Chiffre correspondant (sur 2 caractères)
   * @private
   */
  function letterToNumber(char) {
    const code = char.toUpperCase().charCodeAt(0);
    if (code >= 65 && code <= 90) { // A-Z
      return (code - 55).toString();
    }
    return char; // Déjà un chiffre
  }
  
  /**
   * Valide le format d'un IBAN (longueur et structure)
   * @param {string} iban - Numéro IBAN à valider
   * @return {boolean} True si le format est valide
   * @private
   */
  function validateIBANFormat(iban) {
    if (!iban || iban.length < 4) {
      return false;
    }
    
    // Extraire le code pays (2 premières lettres)
    const countryCode = iban.substring(0, 2).toUpperCase();
    
    // Vérifier que les 2 premiers caractères sont des lettres (code pays ISO)
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return false;
    }
    
    // Vérifier que les 2 caractères suivants sont des chiffres (checksum)
    if (iban.length < 4 || !/^[0-9]{2}$/.test(iban.substring(2, 4))) {
      return false;
    }
    
    // Vérifier la longueur totale (IBAN standard : entre 15 et 34 caractères)
    if (iban.length < 15 || iban.length > 34) {
      return false;
    }
    
    // Vérifier que l'IBAN ne contient que des caractères alphanumériques
    if (!/^[A-Z0-9]+$/.test(iban.toUpperCase())) {
      return false;
    }
    
    // Si le pays est dans la liste, vérifier la longueur spécifique
    // Sinon, accepter n'importe quelle longueur valide (15-34)
    if (IBAN_FORMATS[countryCode]) {
      const expectedLength = IBAN_FORMATS[countryCode].length;
      if (iban.length !== expectedLength) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Valide le checksum d'un IBAN selon l'algorithme modulo 97-10
   * @param {string} iban - Numéro IBAN à valider
   * @return {boolean} True si le checksum est valide
   * @private
   */
  function validateIBANChecksum(iban) {
    // 1. Déplacer les 4 premiers caractères (code pays + checksum) à la fin
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    
    // 2. Convertir les lettres en chiffres (A=10, B=11, ..., Z=35)
    let numericString = '';
    for (let i = 0; i < rearranged.length; i++) {
      numericString += letterToNumber(rearranged[i]);
    }
    
    // 3. Calculer modulo 97
    // Pour les grands nombres, on calcule modulo 97 par morceaux
    let remainder = 0;
    for (let i = 0; i < numericString.length; i++) {
      remainder = (remainder * 10 + parseInt(numericString[i])) % 97;
    }
    
    // 4. Si le résultat est 1, l'IBAN est valide
    return remainder === 1;
  }
  
  /**
   * Convertit une lettre en chiffre pour RIB français (A=1, B=2, ..., Z=26)
   * @param {string} char - Caractère à convertir
   * @return {string} Chiffre correspondant
   * @private
   */
  function letterToRIBNumber(char) {
    const code = char.toUpperCase().charCodeAt(0);
    if (code >= 65 && code <= 90) { // A-Z
      return (code - 64).toString(); // A=1, B=2, ..., Z=26
    }
    return char; // Déjà un chiffre
  }
  
  /**
   * Valide le checksum BBAN pour la France (RIB)
   * Algorithme: Concaténer code banque + code guichet + numéro compte + clé RIB
   * Convertir les lettres en chiffres (A=1, B=2, ..., Z=26)
   * Calculer modulo 97, si reste = 0 alors valide
   * @param {string} bban - BBAN français (sans code pays et checksum IBAN)
   * @return {boolean} True si le checksum BBAN est valide
   * @private
   */
  function validateBBANFrance(bban) {
    // Structure FR: Code banque (5) + Code guichet (5) + Numéro compte (11) + Clé RIB (2)
    if (bban.length !== 23) return false;
    
    const codeBanque = bban.substring(0, 5);
    const codeGuichet = bban.substring(5, 10);
    const numeroCompte = bban.substring(10, 21);
    const cleRIB = bban.substring(21, 23);
    
    // Vérifier que code banque et guichet sont numériques
    if (!/^[0-9]{5}$/.test(codeBanque) || !/^[0-9]{5}$/.test(codeGuichet)) {
      return false;
    }
    
    // Vérifier que la clé RIB est numérique
    if (!/^[0-9]{2}$/.test(cleRIB)) {
      return false;
    }
    
    // Concaténer tout et convertir les lettres en chiffres (A=1, B=2, ..., Z=26)
    const fullRIB = codeBanque + codeGuichet + numeroCompte + cleRIB;
    let fullRIBNumeric = '';
    for (let i = 0; i < fullRIB.length; i++) {
      fullRIBNumeric += letterToRIBNumber(fullRIB[i]);
    }
    
    // Calculer modulo 97
    let remainder = 0;
    for (let i = 0; i < fullRIBNumeric.length; i++) {
      remainder = (remainder * 10 + parseInt(fullRIBNumeric[i])) % 97;
    }
    
    // Si le reste est 0, le RIB est valide
    return remainder === 0;
  }
  
  /**
   * Valide le checksum BBAN pour la Belgique
   * @param {string} bban - BBAN belge (sans code pays et checksum IBAN)
   * @return {boolean} True si le checksum BBAN est valide
   * @private
   */
  function validateBBANBelgium(bban) {
    // Structure BE: Code banque (3) + Numéro compte (7) + Clé (2)
    if (bban.length !== 12) return false;
    
    const codeBanque = bban.substring(0, 3);
    const numeroCompte = bban.substring(3, 10);
    const cle = bban.substring(10, 12);
    
    // Concaténer code banque + numéro compte + clé
    const fullNumber = codeBanque + numeroCompte + cle;
    
    // Calculer modulo 97
    let remainder = 0;
    for (let i = 0; i < fullNumber.length; i++) {
      remainder = (remainder * 10 + parseInt(fullNumber[i])) % 97;
    }
    
    // Si le reste est 0, le BBAN est valide
    return remainder === 0;
  }
  
  /**
   * Valide le checksum BBAN pour les Pays-Bas
   * @param {string} bban - BBAN néerlandais (sans code pays et checksum IBAN)
   * @return {boolean} True si le checksum BBAN est valide
   * @private
   */
  function validateBBANNetherlands(bban) {
    // Structure NL: Code banque (4 lettres) + Numéro compte (10 chiffres)
    // Le numéro compte a un checksum MOD11 avec poids [9, 8, 7, 6, 5, 4, 3, 2]
    if (bban.length !== 14) return false;
    
    const codeBanque = bban.substring(0, 4);
    const numeroCompte = bban.substring(4, 14);
    
    // Vérifier que le code banque est composé de lettres
    if (!/^[A-Z]{4}$/.test(codeBanque)) return false;
    
    // Vérifier que le numéro compte est composé de chiffres
    if (!/^[0-9]{10}$/.test(numeroCompte)) return false;
    
    // Algorithme MOD11 avec poids [9, 8, 7, 6, 5, 4, 3, 2] sur les 9 premiers chiffres
    const weights = [9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(numeroCompte[i]) * weights[i];
    }
    
    const check = sum % 11;
    const lastDigit = parseInt(numeroCompte[9]);
    
    // Si check < 10, le dernier chiffre doit être égal à check
    // Si check >= 10, le numéro est invalide
    if (check >= 10) return false;
    return lastDigit === check;
  }
  
  /**
   * Valide le checksum BBAN pour l'Italie
   * @param {string} bban - BBAN italien (sans code pays et checksum IBAN)
   * @return {boolean} True si le checksum BBAN est valide
   * @private
   */
  function validateBBANItaly(bban) {
    // Structure IT: Code banque (1 lettre) + Code banque (5 chiffres) + Code guichet (5 chiffres) + Numéro compte (12 caractères)
    // Algorithme MOD10 modifié (Luhn modifié)
    if (bban.length !== 23) return false;
    
    const codiceConto = bban.substring(10, 23); // Numéro compte (12 caractères)
    
    // Convertir les lettres en chiffres pour le calcul
    let numericString = '';
    for (let i = 0; i < codiceConto.length; i++) {
      numericString += letterToNumber(codiceConto[i]);
    }
    
    // Algorithme MOD10 modifié (Luhn)
    let sum = 0;
    let isEven = false;
    
    // Parcourir de droite à gauche
    for (let i = numericString.length - 1; i >= 0; i--) {
      let digit = parseInt(numericString[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    // Si la somme est un multiple de 10, le numéro est valide
    return sum % 10 === 0;
  }
  
  /**
   * Valide le checksum BBAN selon le pays
   * @param {string} countryCode - Code pays (2 lettres)
   * @param {string} bban - BBAN (sans code pays et checksum IBAN)
   * @return {boolean} True si le checksum BBAN est valide, false sinon ou si non supporté
   * @private
   */
  function validateBBANChecksum(countryCode, bban) {
    switch (countryCode) {
      case 'FR':
        return validateBBANFrance(bban);
      case 'BE':
        return validateBBANBelgium(bban);
      case 'NL':
        return validateBBANNetherlands(bban);
      case 'IT':
        return validateBBANItaly(bban);
      default:
        // Pour les autres pays, on ne valide pas le BBAN (pas d'algorithme connu)
        return true; // On accepte par défaut
    }
  }
  
  /**
   * Valide un numéro IBAN
   * @param {string} iban - Numéro IBAN à valider (avec ou sans espaces)
   * @param {string=} mode - Mode de validation : "debug" (détails) ou vide (normal)
   * @return {boolean|Object} 
   *         - Mode normal : true si valide, false sinon
   *         - Mode debug : objet {valid, step, reason}
   */
  function validateIBAN(iban, mode) {
    if (!iban) {
      if (mode === 'debug') {
        return {
          valid: false,
          step: 'FORMAT',
          reason: 'EMPTY'
        };
      }
      return false;
    }
    
    // Supprimer les espaces et convertir en majuscules
    const cleanIBAN = iban.toString().replace(/\s+/g, '').toUpperCase();
    
    // 1. Vérifier le format
    if (!validateIBANFormat(cleanIBAN)) {
      if (mode === 'debug') {
        const countryCode = cleanIBAN.substring(0, 2);
        
        // Vérifier le code pays
        if (!/^[A-Z]{2}$/.test(countryCode)) {
          return {
            valid: false,
            step: 'FORMAT',
            reason: 'INVALID_COUNTRY_CODE'
          };
        }
        
        // Vérifier le checksum
        if (cleanIBAN.length < 4 || !/^[0-9]{2}$/.test(cleanIBAN.substring(2, 4))) {
          return {
            valid: false,
            step: 'FORMAT',
            reason: 'INVALID_CHECKSUM_FORMAT'
          };
        }
        
        // Vérifier la longueur
        if (cleanIBAN.length < 15 || cleanIBAN.length > 34) {
          return {
            valid: false,
            step: 'FORMAT',
            reason: 'INVALID_LENGTH'
          };
        }
        
        // Si le pays est dans la liste, vérifier la longueur spécifique
        if (IBAN_FORMATS[countryCode]) {
          const expectedLength = IBAN_FORMATS[countryCode].length;
          if (cleanIBAN.length !== expectedLength) {
            return {
              valid: false,
              step: 'FORMAT',
              reason: 'INVALID_LENGTH_' + countryCode
            };
          }
        }
        
        return {
          valid: false,
          step: 'FORMAT',
          reason: 'INVALID_CHARACTERS'
        };
      }
      return false;
    }
    
    // 2. Vérifier le checksum IBAN
    if (!validateIBANChecksum(cleanIBAN)) {
      if (mode === 'debug') {
        return {
          valid: false,
          step: 'CHECKSUM',
          reason: 'INVALID_CHECKSUM'
        };
      }
      return false;
    }
    
    // 3. Vérifier le checksum BBAN (si supporté pour ce pays)
    const countryCode = cleanIBAN.substring(0, 2);
    const bban = cleanIBAN.substring(4); // BBAN = IBAN sans code pays (2) et checksum IBAN (2)
    
    if (!validateBBANChecksum(countryCode, bban)) {
      if (mode === 'debug') {
        return {
          valid: false,
          step: 'BBAN',
          reason: 'INVALID_BBAN_CHECKSUM_' + countryCode
        };
      }
      return false;
    }
    
    // IBAN valide
    if (mode === 'debug') {
      return {
        valid: true,
        step: 'VALID',
        reason: 'OK'
      };
    }
    return true;
  }
  
  /**
   * Génère un BBAN français avec checksum RIB valide
   * @return {string} BBAN français valide
   * @private
   */
  function generateBBANFrance() {
    // Générer code banque (5 chiffres)
    let codeBanque = '';
    for (let i = 0; i < 5; i++) {
      codeBanque += Math.floor(Math.random() * 10).toString();
    }
    
    // Générer code guichet (5 chiffres)
    let codeGuichet = '';
    for (let i = 0; i < 5; i++) {
      codeGuichet += Math.floor(Math.random() * 10).toString();
    }
    
    // Générer numéro compte (11 caractères alphanumériques)
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let numeroCompte = '';
    for (let i = 0; i < 11; i++) {
      numeroCompte += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Calculer la clé RIB
    // Concaténer code banque + code guichet + numéro compte + '00' (clé temporaire)
    const tempRIB = codeBanque + codeGuichet + numeroCompte + '00';
    let tempRIBNumeric = '';
    for (let i = 0; i < tempRIB.length; i++) {
      tempRIBNumeric += letterToRIBNumber(tempRIB[i]);
    }
    
    // Calculer modulo 97
    let remainder = 0;
    for (let i = 0; i < tempRIBNumeric.length; i++) {
      remainder = (remainder * 10 + parseInt(tempRIBNumeric[i])) % 97;
    }
    
    // La clé RIB est 97 - remainder (si remainder = 0, clé = 97, mais on prend modulo 97 donc 0)
    const cleRIB = (97 - remainder).toString().padStart(2, '0');
    
    return codeBanque + codeGuichet + numeroCompte + cleRIB;
  }
  
  /**
   * Génère un BBAN belge avec checksum valide
   * @return {string} BBAN belge valide
   * @private
   */
  function generateBBANBelgium() {
    // Générer code banque (3 chiffres)
    let codeBanque = '';
    for (let i = 0; i < 3; i++) {
      codeBanque += Math.floor(Math.random() * 10).toString();
    }
    
    // Générer numéro compte (7 chiffres)
    let numeroCompte = '';
    for (let i = 0; i < 7; i++) {
      numeroCompte += Math.floor(Math.random() * 10).toString();
    }
    
    // Calculer la clé
    // Concaténer code banque + numéro compte + '00' (clé temporaire)
    const tempNumber = codeBanque + numeroCompte + '00';
    
    // Calculer modulo 97
    let remainder = 0;
    for (let i = 0; i < tempNumber.length; i++) {
      remainder = (remainder * 10 + parseInt(tempNumber[i])) % 97;
    }
    
    // La clé est 97 - remainder
    const cle = (97 - remainder).toString().padStart(2, '0');
    
    return codeBanque + numeroCompte + cle;
  }
  
  /**
   * Génère un BBAN néerlandais avec checksum valide
   * @return {string} BBAN néerlandais valide
   * @private
   */
  function generateBBANNetherlands() {
    // Générer code banque (4 lettres)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let codeBanque = '';
    for (let i = 0; i < 4; i++) {
      codeBanque += letters[Math.floor(Math.random() * letters.length)];
    }
    
    // Générer les 9 premiers chiffres du numéro compte
    let numeroCompteBase = '';
    for (let i = 0; i < 9; i++) {
      numeroCompteBase += Math.floor(Math.random() * 10).toString();
    }
    
    // Calculer le checksum MOD11 avec poids [9, 8, 7, 6, 5, 4, 3, 2]
    const weights = [9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(numeroCompteBase[i]) * weights[i];
    }
    
    let check = sum % 11;
    
    // Si check >= 10, ajuster le 8ème chiffre pour obtenir un check < 10
    if (check >= 10) {
      // Ajuster le 8ème chiffre pour obtenir un check valide
      let adjusted = false;
      for (let attempt = 0; attempt < 10 && !adjusted; attempt++) {
        const newBase = numeroCompteBase.substring(0, 7) + attempt.toString() + numeroCompteBase[8];
        let newSum = 0;
        for (let i = 0; i < 8; i++) {
          newSum += parseInt(newBase[i]) * weights[i];
        }
        const newCheck = newSum % 11;
        if (newCheck < 10) {
          numeroCompteBase = newBase;
          check = newCheck;
          adjusted = true;
        }
      }
      // Si toujours >= 10 après ajustement, régénérer complètement
      if (!adjusted) {
        // Régénérer les 9 premiers chiffres
        numeroCompteBase = '';
        for (let i = 0; i < 9; i++) {
          numeroCompteBase += Math.floor(Math.random() * 10).toString();
        }
        // Recalculer
        sum = 0;
        for (let i = 0; i < 8; i++) {
          sum += parseInt(numeroCompteBase[i]) * weights[i];
        }
        check = sum % 11;
        // Si toujours >= 10, utiliser 0 (cas très rare)
        if (check >= 10) {
          check = 0;
        }
      }
    }
    
    // Le dernier chiffre est le checksum
    const numeroCompte = numeroCompteBase + check.toString();
    
    return codeBanque + numeroCompte;
  }
  
  /**
   * Génère un BBAN italien avec checksum Luhn valide
   * @return {string} BBAN italien valide
   * @private
   */
  function generateBBANItaly() {
    // Générer code banque (1 lettre + 5 chiffres)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const codeBanqueLettre = letters[Math.floor(Math.random() * letters.length)];
    let codeBanqueChiffres = '';
    for (let i = 0; i < 5; i++) {
      codeBanqueChiffres += Math.floor(Math.random() * 10).toString();
    }
    
    // Générer code guichet (5 chiffres)
    let codeGuichet = '';
    for (let i = 0; i < 5; i++) {
      codeGuichet += Math.floor(Math.random() * 10).toString();
    }
    
    // Générer les 11 premiers caractères du numéro compte (12 caractères au total)
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let numeroCompteBase = '';
    for (let i = 0; i < 11; i++) {
      numeroCompteBase += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Calculer le checksum Luhn pour obtenir le dernier caractère
    // Convertir les 11 premiers caractères en chiffres
    let numericString = '';
    for (let i = 0; i < numeroCompteBase.length; i++) {
      numericString += letterToNumber(numeroCompteBase[i]);
    }
    
    // Calculer la somme Luhn pour les 11 premiers caractères
    // Le dernier caractère sera en position paire (en partant de la droite)
    let sum = 0;
    let isEven = true; // Le dernier caractère sera en position paire
    
    // Parcourir de droite à gauche (sans le dernier caractère qui sera calculé)
    for (let i = numericString.length - 1; i >= 0; i--) {
      let digit = parseInt(numericString[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    // Le dernier caractère sera multiplié par 2 (position paire)
    // On doit trouver un chiffre/lettre tel que : (sum + (digit * 2 modifié)) % 10 === 0
    // Si digit est un chiffre (0-9), digit * 2 peut donner 0-18
    // Si digit est une lettre (A=10-Z=35), on convertit d'abord
    
    // Essayer d'abord avec un chiffre (0-9)
    let lastChar = '';
    let found = false;
    
    for (let attempt = 0; attempt < 10 && !found; attempt++) {
      let testDigit = attempt;
      let testDigitModified = testDigit * 2;
      if (testDigitModified > 9) {
        testDigitModified = Math.floor(testDigitModified / 10) + (testDigitModified % 10);
      }
      
      if ((sum + testDigitModified) % 10 === 0) {
        lastChar = attempt.toString();
        found = true;
      }
    }
    
    // Si pas trouvé avec un chiffre, essayer avec une lettre
    if (!found) {
      for (let attempt = 0; attempt < 26 && !found; attempt++) {
        const letterValue = attempt + 10; // A=10, B=11, ..., Z=35
        let testDigitModified = letterValue * 2;
        if (testDigitModified > 9) {
          testDigitModified = Math.floor(testDigitModified / 10) + (testDigitModified % 10);
        }
        
        if ((sum + testDigitModified) % 10 === 0) {
          lastChar = String.fromCharCode(65 + attempt); // A-Z
          found = true;
        }
      }
    }
    
    // Si toujours pas trouvé (cas très rare), utiliser '0'
    if (!found) {
      lastChar = '0';
    }
    
    const numeroCompte = numeroCompteBase + lastChar;
    
    return codeBanqueLettre + codeBanqueChiffres + codeGuichet + numeroCompte;
  }
  
  /**
   * Génère un numéro IBAN valide pour un pays donné
   * @param {string} countryCode - Code pays à 2 lettres (ex: "FR", "DE", "BE")
   * @return {string} Numéro IBAN valide ou code d'erreur ("ERROR:INVALID_ARGUMENT", "ERROR:UNSUPPORTED_COUNTRY")
   */
  function generateIBAN(countryCode) {
    if (!countryCode || countryCode.length !== 2) {
      return 'ERROR:INVALID_ARGUMENT';
    }
    
    countryCode = countryCode.toUpperCase();
    
    if (!IBAN_FORMATS[countryCode]) {
      return 'ERROR:UNSUPPORTED_COUNTRY';
    }
    
    let bban = '';
    
    // Générer le BBAN avec checksum valide pour les pays supportés
    if (countryCode === 'FR') {
      bban = generateBBANFrance();
    } else if (countryCode === 'BE') {
      bban = generateBBANBelgium();
    } else if (countryCode === 'NL') {
      bban = generateBBANNetherlands();
    } else if (countryCode === 'IT') {
      bban = generateBBANItaly();
    } else {
      // Pour les autres pays, générer selon le format (sans checksum BBAN)
      const format = IBAN_FORMATS[countryCode];
      const formatSpec = format.bban;
      
      // Parser le format BBAN (ex: "5n,5n,11c,2n" pour la France)
      const parts = formatSpec.split(',');
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        const length = parseInt(part.substring(0, part.length - 1));
        const type = part.substring(part.length - 1);
        
        if (type === 'n') {
          // Chiffres
          for (let j = 0; j < length; j++) {
            bban += Math.floor(Math.random() * 10).toString();
          }
        } else if (type === 'a') {
          // Lettres majuscules
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          for (let j = 0; j < length; j++) {
            bban += letters[Math.floor(Math.random() * letters.length)];
          }
        } else if (type === 'c') {
          // Caractères alphanumériques
          const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          for (let j = 0; j < length; j++) {
            bban += chars[Math.floor(Math.random() * chars.length)];
          }
        }
      }
    }
    
    // Construire l'IBAN temporaire avec checksum = 00
    const tempIBAN = countryCode + '00' + bban;
    
    // Calculer le checksum IBAN correct
    // 1. Déplacer les 4 premiers caractères à la fin
    const rearranged = tempIBAN.substring(4) + tempIBAN.substring(0, 4);
    
    // 2. Convertir les lettres en chiffres
    let numericString = '';
    for (let i = 0; i < rearranged.length; i++) {
      numericString += letterToNumber(rearranged[i]);
    }
    
    // 3. Calculer modulo 97
    let remainder = 0;
    for (let i = 0; i < numericString.length; i++) {
      remainder = (remainder * 10 + parseInt(numericString[i])) % 97;
    }
    
    // 4. Le checksum est 98 - remainder (si remainder = 0, checksum = 98)
    const checksum = (98 - remainder).toString().padStart(2, '0');
    
    return countryCode + checksum + bban;
  }
  
  /**
   * Formate un IBAN avec des espaces tous les 4 caractères
   * @param {string} iban - Numéro IBAN à formater
   * @return {string} IBAN formaté
   */
  function formatIBAN(iban) {
    if (!iban) return '';
    const cleanIBAN = iban.toString().replace(/\s+/g, '').toUpperCase();
    let formatted = '';
    for (let i = 0; i < cleanIBAN.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += cleanIBAN[i];
    }
    return formatted;
  }
  
  /**
   * Extrait le BBAN (Basic Bank Account Number) d'un IBAN
   * @param {string} iban - Numéro IBAN
   * @return {string} BBAN (sans code pays et checksum)
   */
  function extractBBAN(iban) {
    if (!iban) return '';
    const cleanIBAN = iban.toString().replace(/\s+/g, '').toUpperCase();
    if (cleanIBAN.length < 4) return '';
    return cleanIBAN.substring(4);
  }
  
  /**
   * Retourne la version de la bibliothèque
   * @return {string} Version
   */
  function getVersion() {
    return VERSION;
  }
  
  /**
   * Retourne la liste des codes pays supportés
   * @return {Array<string>} Liste des codes pays
   */
  function getSupportedCountries() {
    return Object.keys(IBAN_FORMATS).sort();
  }
  
  // API publique
  return {
    validateIBAN: validateIBAN,
    generateIBAN: generateIBAN,
    formatIBAN: formatIBAN,
    extractBBAN: extractBBAN,
    getVersion: getVersion,
    getSupportedCountries: getSupportedCountries
  };
})();

