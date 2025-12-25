# Guide de Configuration Initiale

Ce guide vous accompagne dans la configuration initiale du projet Odoo RDD.

## Prérequis

- Compte Google avec accès à Google Drive et Google Apps Script
- [Clasp](https://github.com/google/clasp) installé : `npm install -g @google/clasp`
- [Git](https://git-scm.com/) installé
- Accès au repository GitHub : https://github.com/Xavier-SDK/Odoo_RDD

## Étape 1 : Créer les fichiers Google

### Option A : Via le script helper (Recommandé)

1. Ouvrir https://script.google.com
2. Créer un nouveau projet temporaire
3. Copier le contenu de `scripts/create_google_files.js`
4. Exécuter la fonction `createFiles()`
5. Noter les IDs retournés

### Option B : Manuellement

#### 1.1 Créer le dossier Google Drive

1. Aller sur https://drive.google.com
2. Créer un nouveau dossier nommé "Odoo RDD"
3. Noter l'ID du dossier depuis l'URL : `https://drive.google.com/drive/folders/[FOLDER_ID]`

#### 1.2 Créer le Google Sheets Template

1. Dans le dossier "Odoo RDD", créer un nouveau Google Sheets
2. Le nommer : `Odoo_RDD_Template`
3. Noter l'ID depuis l'URL : `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]`

#### 1.3 Créer le projet Apps Script Library

1. Aller sur https://script.google.com
2. Créer un nouveau projet
3. Le nommer : `Odoo_RDD_Library`
4. Noter le Script ID :
   - Aller dans "Projet" > "Paramètres du projet"
   - Copier le "ID de script" OU
   - Depuis l'URL : `https://script.google.com/home/projects/[SCRIPT_ID]`

## Étape 2 : Configurer Clasp

### 2.1 Authentification Clasp

```bash
clasp login
```

### 2.2 Créer les fichiers .clasp.json

#### Pour le Template

```bash
cd template
clasp create --type sheets --title "Odoo_RDD_Template" --rootDir .
```

OU créer manuellement `template/.clasp.json` :

```json
{
  "scriptId": "[SPREADSHEET_ID_DU_TEMPLATE]",
  "rootDir": "."
}
```

#### Pour la Library

```bash
cd library
clasp create --type standalone --title "Odoo_RDD_Library" --rootDir .
```

OU créer manuellement `library/.clasp.json` :

```json
{
  "scriptId": "[SCRIPT_ID_DE_LA_LIBRARY]",
  "rootDir": "."
}
```

**⚠️ Important** : Les fichiers `.clasp.json` sont dans `.gitignore` pour éviter de commiter les IDs.

## Étape 3 : Ajouter la Library au Template

1. Ouvrir le Google Sheets Template
2. Aller dans "Extensions" > "Apps Script"
3. Cliquer sur "Ressources" > "Bibliothèques"
4. Ajouter le Script ID de la Library
5. Choisir la version (ou "Development mode" pour le développement)
6. Donner un identifiant court (ex: `OdooRDD`)

## Étape 4 : Configuration Git

### 4.1 Initialiser le repository

```bash
git init
git remote add origin https://github.com/Xavier-SDK/Odoo_RDD.git
```

### 4.2 Premier commit

```bash
git add .
git commit -m "Initial commit: Structure du projet et documentation"
git branch -M main
git push -u origin main
```

## Étape 5 : Vérification

### 5.1 Tester Clasp

```bash
# Depuis le dossier template
cd template
clasp pull  # Télécharger le code existant

# Depuis le dossier library
cd library
clasp pull  # Télécharger le code existant
```

### 5.2 Tester la Library dans le Template

1. Ouvrir le Template
2. Extensions > Apps Script
3. Créer un fichier `Code.gs` avec :

```javascript
function onOpen() {
  Logger.log('Template initialisé');
  // La library sera accessible via l'identifiant défini
}
```

4. Exécuter `onOpen()` pour vérifier

## Structure finale attendue

```
Odoo RDD/
├── .gitignore
├── README.md
├── docs/
│   ├── STRATEGIE.md
│   └── SETUP.md
├── library/
│   ├── .clasp.json (local, non commité)
│   └── Code.gs (à créer)
├── template/
│   ├── .clasp.json (local, non commité)
│   └── Code.gs (à créer)
└── scripts/
    └── create_google_files.js
```

## Prochaines étapes

Une fois la configuration terminée, consultez `docs/STRATEGIE.md` pour commencer le développement.

