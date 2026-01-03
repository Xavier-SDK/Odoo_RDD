/**
 * @fileoverview Unified service for VAT (TVA) and IBAN validation.
 * Ported and simplified from standalone libraries.
 */

// --- VAT (TVA) SERVICE ---

/**
 * Valide un numéro de TVA intracommunautaire.
 * @param {string} vatNumber - Numéro de TVA (ex: "FR18417798402")
 * @param {string=} mode - Mode : "debug", "basic", "force"
 * @return {string} Numéro validé, message debug, ou ""
 */
function TVA(vatNumber, mode) {
  if (!vatNumber) return "";
  
  mode = mode || '';
  const vat = vatNumber.toString().trim().toUpperCase();
  const parsed = _tva_parseVAT(vat);
  
  if (!parsed) {
    return mode === 'debug' ? "PARSE:INVALID_FORMAT" : "";
  }
  
  if (!parsed.countryCode) {
    return mode === 'debug' ? "COUNTRY:NULL" : "";
  }
  
  // Check if country is supported (EU)
  if (!_tva_isSupportedCountry(parsed.countryCode)) {
    return mode === 'debug' ? "COUNTRY:NOT_EU" : "";
  }

  // FORCE MODE: Skip local checks, go straight to API
  if (mode === 'force') {
    const result = _tva_apiCheck(parsed.countryCode, parsed.vatNumber);
    if (result.valid) return vat;
    return mode === 'debug' ? "API:" + _tva_convertErrorToReason(result.error) : "";
  }

  // Local validation: Format
  if (mode !== 'force' && !_tva_validateFormat(parsed.countryCode, parsed.vatNumber)) {
    return mode === 'debug' ? "FORMAT:INVALID_FORMAT_" + parsed.countryCode : "";
  }

  // Local validation: Algorithm
  if (mode !== 'force' && !_tva_validateAlgorithm(parsed.countryCode, parsed.vatNumber)) {
    return mode === 'debug' ? "ALGORITHM:INVALID_CHECKSUM_" + parsed.countryCode : "";
  }

  // BASIC MODE: Local checks only
  if (mode === 'basic') {
    return vat;
  }

  // DEFAULT MODE: API Check
  const result = _tva_apiCheck(parsed.countryCode, parsed.vatNumber);
  if (result.valid) {
    return mode === 'debug' ? vat : vat;
  } else {
    return mode === 'debug' ? "API:" + _tva_convertErrorToReason(result.error) : "";
  }
}

function _tva_parseVAT(vat) {
  const match = vat.match(/^([A-Z]{2})(.+)$/);
  if (match) {
    return { countryCode: match[1], vatNumber: match[2].replace(/[^0-9A-Z]/g, '') };
  }
  const clean = vat.replace(/[^0-9A-Z]/g, '');
  if (clean.length >= 8) return { countryCode: null, vatNumber: clean };
  return null;
}

function _tva_isSupportedCountry(cc) {
  const eu = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'];
  return eu.indexOf(cc) !== -1;
}

function _tva_validateFormat(cc, num) {
  const formats = {
    'AT': /^U\d{8}$/, 'BE': /^\d{10}$/, 'BG': /^\d{9,10}$/, 'CY': /^\d{8}[A-Z]$/, 'CZ': /^\d{8,10}$/,
    'DE': /^\d{9}$/, 'DK': /^\d{8}$/, 'EE': /^\d{9}$/, 'EL': /^\d{9}$/, 'ES': /^[A-Z0-9]\d{7}[A-Z0-9]$/,
    'FI': /^\d{8}$/, 'FR': /^[0-9A-Z]{2}\d{9}$/, 'HR': /^\d{11}$/, 'HU': /^\d{8}$/, 'IE': /^[0-9A-Z]{8,9}$/,
    'IT': /^\d{11}$/, 'LT': /^(\d{9}|\d{12})$/, 'LU': /^\d{8}$/, 'LV': /^\d{11}$/, 'MT': /^\d{8}$/,
    'NL': /^\d{9}B\d{2}$/, 'PL': /^\d{10}$/, 'PT': /^\d{9}$/, 'RO': /^\d{2,10}$/, 'SE': /^\d{12}$/,
    'SI': /^\d{8}$/, 'SK': /^\d{10}$/
  };
  return formats[cc] ? formats[cc].test(num) : num.length >= 4;
}

function _tva_validateAlgorithm(cc, num) {
  const digits = num.replace(/[^0-9]/g, '');
  const sum = (d, w, s) => {
    let res = 0;
    for (let i = 0; i < w.length; i++) {
        let p = parseInt(d[i]) * w[i];
        res += s ? (Math.floor(p/10) + p%10) : p;
    }
    return res;
  };

  switch(cc) {
    case 'FR': return (12 + 3 * (parseInt(digits.substring(2, 11)) % 97)) % 97 === parseInt(digits.substring(0, 2));
    case 'BE': return (97 - (parseInt(digits.substring(0, 8)) % 97)) === parseInt(digits.substring(8, 10));
    case 'DE': return (10 - (sum(digits, [1,2,1,2,1,2,1,2], true) % 10)) % 10 === parseInt(digits[8]);
    case 'IT': return (10 - (sum(digits, [1,2,1,2,1,2,1,2,1,2], true) % 10)) % 10 === parseInt(digits[10]);
    case 'ES': 
      const esSum = sum(num.substring(0, 8).replace(/[^0-9]/g, ''), [2,1,2,1,2,1,2], true);
      const esCheck = (10 - (esSum % 10)) % 10;
      const last = num[8];
      return /[0-9]/.test(last) ? parseInt(last) === esCheck : 'TRWAGMYFPDXBNJZSQVHLCKE'[esCheck] === last;
    case 'NL': return (sum(num.substring(0,9), [9,8,7,6,5,4,3,2], false) % 11) === parseInt(num[8]);
    default: return true;
  }
}

function _tva_apiCheck(cc, num) {
  try {
    const url = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number';
    const opt = { method: 'post', contentType: 'application/json', payload: JSON.stringify({ countryCode: cc, vatNumber: num }), muteHttpExceptions: true };
    const res = UrlFetchApp.fetch(url, opt);
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      return { valid: data.valid, name: data.name, error: data.valid ? null : 'NOT_FOUND' };
    }
    return { valid: false, error: 'API_ERROR' };
  } catch(e) { return { valid: false, error: e.toString() }; }
}

function _tva_convertErrorToReason(err) {
  if (!err) return 'NOT_FOUND';
  const l = err.toLowerCase();
  if (l.indexOf('timeout') !== -1) return 'API_TIMEOUT';
  return 'NOT_FOUND';
}

// --- IBAN SERVICE ---

/**
 * Valide un numéro IBAN.
 * @param {string} ibanValue - Numéro IBAN (ex: "FR14...")
 * @param {string=} mode - Mode : "debug"
 * @return {string} IBAN validé, message debug, ou ""
 */
function IBAN(ibanValue, mode) {
  if (!ibanValue) return "";
  
  mode = mode || '';
  const iban = ibanValue.toString().replace(/\s+/g, '').toUpperCase();
  
  // Format check
  if (!_iban_validateFormat(iban)) {
    return mode === 'debug' ? "FORMAT:INVALID" : "";
  }
  
  // IBAN Checksum (Mod 97-10)
  if (!_iban_validateChecksum(iban)) {
    return mode === 'debug' ? "CHECKSUM:INVALID" : "";
  }
  
  // BBAN Checksum (if supported)
  const cc = iban.substring(0, 2);
  const bban = iban.substring(4);
  if (!_iban_validateBBAN(cc, bban)) {
    return mode === 'debug' ? "BBAN:INVALID_" + cc : "";
  }
  
  return mode === 'debug' ? iban : iban;
}

function _iban_validateFormat(iban) {
  if (iban.length < 15 || iban.length > 34) return false;
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return false;
  return true;
}

function _iban_validateChecksum(iban) {
  const rearranged = iban.substring(4) + iban.substring(0, 4);
  let numStr = '';
  for (let i = 0; i < rearranged.length; i++) {
    const c = rearranged.charCodeAt(i);
    numStr += (c >= 65 && c <= 90) ? (c - 55).toString() : rearranged[i];
  }
  let rem = 0;
  for (let i = 0; i < numStr.length; i++) {
    rem = (rem * 10 + parseInt(numStr[i])) % 97;
  }
  return rem === 1;
}

function _iban_validateBBAN(cc, bban) {
  const mod97 = (s) => {
    let rem = 0;
    for (let i = 0; i < s.length; i++) rem = (rem * 10 + parseInt(s[i])) % 97;
    return rem;
  };
  
  switch(cc) {
    case 'FR':
      if (bban.length !== 23) return false;
      let fr = '';
      for (let i = 0; i < bban.length; i++) {
        const c = bban.charCodeAt(i);
        fr += (c >= 65 && c <= 90) ? (c - 64).toString() : bban[i];
      }
      return mod97(fr) === 0;
    case 'BE':
      return bban.length === 12 && mod97(bban) === 0;
    case 'IT':
      // Simplified IT check (just length/alphanum check usually enough after IBAN check)
      return bban.length === 23; 
    default:
      return true;
  }
}
