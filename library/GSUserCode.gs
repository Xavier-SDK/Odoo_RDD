/**
 * Génère un mot de passe sécurisé de 12 caractères selon des règles strictes.
 * @param {input} dummy (Optionnel) Changez cette valeur (case à cocher) pour régénérer le mot de passe.
 * @customfunction
 */
function GEN_MDP(dummy) {
  // 1. Définition des "bassins" de caractères
  // Exclusion du 'O' majuscule et du '0' chiffre comme demandé
  const upper = "ABCDEFGHIJKLMNPQRSTUVWXYZ"; 
  const lower = "abcdefghijklmnopqrstuvwxyz"; 
  const digits = "123456789"; 
  const special = "@#=+-!?&";
  
  const allChars = upper + lower + digits + special;
  var passwordArray = [];

  // 2. Garantir au moins un caractère de chaque type obligatoire
  passwordArray.push(getRandomChar(digits));   // Au moins 1 digit (pas 0)
  passwordArray.push(getRandomChar(special));  // Au moins 1 spécial
  passwordArray.push(getRandomChar(lower));    // Au moins 1 minuscule
  passwordArray.push(getRandomChar(upper));    // Au moins 1 majuscule (pas O)

  // 3. Compléter les 8 caractères restants (12 - 4) avec le mélange global
  for (var i = 0; i < 8; i++) {
    passwordArray.push(getRandomChar(allChars));
  }

  // 4. Mélanger le résultat (sinon le mot de passe commencera toujours par un chiffre)
  passwordArray = shuffleArray(passwordArray);

  return passwordArray.join('');
}

// Fonction utilitaire pour prendre un caractère au hasard
function getRandomChar(str) {
  return str.charAt(Math.floor(Math.random() * str.length));
}

// Fonction utilitaire pour mélanger (Algorithme de Fisher-Yates)
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}


/**
 * Génère les IDs Odoo avec comparaison souple (ignorer espaces et types).
 * @customfunction
 */
function ODOO_GROUPS_X(headersList, valuesList, headersBool, valuesBool, refApps, refFuncs, refIds) {
  
  var groups = ["base.group_user"];
  
  // Aplatir les entrées
  headersList = headersList.flat();
  valuesList = valuesList.flat();
  headersBool = headersBool.flat();
  valuesBool = valuesBool.flat();
  
  refApps = refApps.flat();
  refFuncs = refFuncs.flat();
  refIds = refIds.flat();

  // --- 1. LISTES DÉROULANTES ---
  for (var i = 0; i < headersList.length; i++) {
    var appName = clean(headersList[i]); // Entête colonne (ex: "Ventes")
    var funcValue = clean(valuesList[i]); // Valeur cellule (ex: "Administrateur")

    if (funcValue !== "") {
      // On parcourt la table de référence
      for (var k = 0; k < refIds.length; k++) {
        // Comparaison nettoyée
        if (clean(refApps[k]) == appName && clean(refFuncs[k]) == funcValue) {
          addToGroups(groups, refIds[k]);
          break; 
        }
      }
    }
  }

  // --- 2. BOOLÉENS ---
  for (var j = 0; j < headersBool.length; j++) {
    var funcName = clean(headersBool[j]); // Entête colonne (doit correspondre à la Fonction)
    var isChecked = valuesBool[j];

    if (isChecked === true) {
      for (var k = 0; k < refIds.length; k++) {
        if (clean(refFuncs[k]) == funcName) {
          addToGroups(groups, refIds[k]);
          break;
        }
      }
    }
  }

  return groups.join(",");
}

// Fonction utilitaire pour nettoyer les textes (enlève espaces avant/après et force en texte)
function clean(input) {
  if (input == null) return "";
  return String(input).trim();
}

function addToGroups(array, value) {
  if (array.indexOf(value) === -1) array.push(value);
}