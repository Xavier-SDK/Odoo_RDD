# Création des Fichiers Google

Ce document explique comment créer les fichiers Google nécessaires pour le projet Odoo RDD.

## ✅ Dossier Google Drive

Le dossier "Odoo RDD" a été créé avec succès.

**ID du dossier** : `1q0DAgJ46WWzUVnjfK2Zm-aKrYhGu3wTi`  
**URL** : https://drive.google.com/drive/folders/1q0DAgJ46WWzUVnjfK2Zm-aKrYhGu3wTi

## 📋 À Faire : Créer le Google Sheets Template

### Option A : Via le Script Helper (Recommandé)

1. Aller sur https://script.google.com
2. Créer un nouveau projet temporaire
3. Copier le contenu de `scripts/create_google_files.js`
4. Exécuter la fonction `createFiles()`
5. Consulter les logs pour récupérer l'ID du Template créé

### Option B : Manuellement

1. Aller dans le dossier "Odoo RDD" sur Google Drive
2. Cliquer sur "Nouveau" > "Google Sheets"
3. Nommer le fichier : `Odoo_RDD_Template`
4. Noter l'ID depuis l'URL : `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]`

## 📚 À Faire : Créer le Projet Apps Script Library

1. Aller sur https://script.google.com
2. Créer un nouveau projet
3. Le nommer : `Odoo_RDD_Library`
4. Récupérer le Script ID :
   - Aller dans "Projet" > "Paramètres du projet"
   - Copier le "ID de script"
   - OU depuis l'URL : `https://script.google.com/home/projects/[SCRIPT_ID]`

## 🔧 Configuration Clasp

Une fois les fichiers créés, créer les fichiers `.clasp.json` :

### template/.clasp.json

```json
{
  "scriptId": "[SPREADSHEET_ID_DU_TEMPLATE]",
  "rootDir": "."
}
```

### library/.clasp.json

```json
{
  "scriptId": "[SCRIPT_ID_DE_LA_LIBRARY]",
  "rootDir": "."
}
```

⚠️ **Important** : Ces fichiers sont dans `.gitignore` et ne seront pas commités.

## 📝 Ajouter la Library au Template

1. Ouvrir le Google Sheets Template
2. Aller dans Extensions > Apps Script
3. Cliquer sur Ressources > Bibliothèques
4. Ajouter le Script ID de la Library
5. Choisir "Development mode"
6. Donner l'identifiant : `OdooRDD`

## ✅ Vérification

Une fois tout configuré :

```bash
# Tester Clasp
cd template && clasp pull
cd ../library && clasp pull

# Pousser le code
cd ../template && clasp push
cd ../library && clasp push
```

Puis ouvrir le Template et vérifier que le menu "Odoo RDD" apparaît.

