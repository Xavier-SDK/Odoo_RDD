# Guide de Démarrage Rapide

Ce guide vous permet de créer rapidement les fichiers Google nécessaires et de configurer le projet.

## Méthode Rapide : Script Apps Script

### Étape 1 : Créer les fichiers Google

1. **Ouvrir Google Apps Script** : https://script.google.com
2. **Créer un nouveau projet** (temporaire pour le script helper)
3. **Copier le contenu** de `scripts/create_google_files.js` dans l'éditeur
4. **Exécuter la fonction** `createFiles()`
5. **Consulter les logs** pour récupérer les IDs créés

Le script va :
- ✅ Créer le dossier "Odoo RDD" sur votre Drive
- ✅ Créer le Google Sheets "Odoo_RDD_Template" dans ce dossier
- ⚠️ Vous devrez créer manuellement le projet Apps Script Library

### Étape 2 : Créer le projet Apps Script Library

1. **Aller sur** https://script.google.com
2. **Créer un nouveau projet**
3. **Le nommer** : `Odoo_RDD_Library`
4. **Récupérer le Script ID** :
   - Aller dans "Projet" > "Paramètres du projet"
   - Copier le "ID de script"
   - OU depuis l'URL : `https://script.google.com/home/projects/[SCRIPT_ID]`

### Étape 3 : Configurer Clasp

#### 3.1 Authentification

```bash
clasp login
```

#### 3.2 Créer les fichiers .clasp.json

**Pour le Template** :

Créer `template/.clasp.json` :
```json
{
  "scriptId": "[SPREADSHEET_ID_DU_TEMPLATE]",
  "rootDir": "."
}
```

**Pour la Library** :

Créer `library/.clasp.json` :
```json
{
  "scriptId": "[SCRIPT_ID_DE_LA_LIBRARY]",
  "rootDir": "."
}
```

⚠️ **Important** : Remplacer `[SPREADSHEET_ID_DU_TEMPLATE]` et `[SCRIPT_ID_DE_LA_LIBRARY]` par les vrais IDs.

### Étape 4 : Ajouter la Library au Template

1. **Ouvrir le Google Sheets Template**
2. **Aller dans** Extensions > Apps Script
3. **Cliquer sur** Ressources > Bibliothèques
4. **Ajouter le Script ID** de la Library
5. **Choisir la version** : "Development mode" (pour le développement)
6. **Donner un identifiant** : `OdooRDD`

### Étape 5 : Tester la configuration

#### 5.1 Tester Clasp

```bash
# Depuis le dossier template
cd template
clasp pull

# Depuis le dossier library  
cd library
clasp pull
```

#### 5.2 Pousser le code initial

```bash
# Depuis le dossier template
cd template
clasp push

# Depuis le dossier library
cd library
clasp push
```

#### 5.3 Tester dans le Template

1. Ouvrir le Template
2. Rafraîchir la page
3. Vérifier que le menu "Odoo RDD" apparaît
4. Cliquer sur "Configuration" pour tester la sidebar

## Vérification Finale

✅ Dossier "Odoo RDD" créé sur Google Drive  
✅ Google Sheets "Odoo_RDD_Template" créé  
✅ Projet Apps Script "Odoo_RDD_Library" créé  
✅ Fichiers `.clasp.json` configurés  
✅ Library ajoutée au Template  
✅ Code poussé via Clasp  
✅ Menu "Odoo RDD" visible dans le Template  

## Prochaines Étapes

Consultez `docs/STRATEGIE.md` pour commencer le développement des fonctionnalités.

