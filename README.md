# Odoo RDD - Reprise De Données

Système complet de migration de données vers Odoo (versions 18 et 19) via Google Sheets.

## 🎯 Objectif

Faciliter la reprise de données pour nos clients en leur fournissant un outil intuitif et puissant qui guide chaque étape du processus de migration, de la collecte des données brutes jusqu'à l'import final dans Odoo.

## 🏗️ Architecture

Le projet utilise une architecture **Hub & Spoke** :

- **Bibliothèque Centrale** (`library/`) : Script Apps Script contenant toute l'intelligence métier
- **Template** (`template/`) : Google Sheet "Maître" minimaliste avec menus et structure
- **Documentation** (`docs/`) : Guides et stratégie de développement

## 📋 Fonctionnalités Principales

### Phase 1 : Préparation
- Récupération des données brutes dans Google Sheets
- Initialisation automatique avec configuration Odoo
- Mapping onglets → modèles Odoo
- Mapping colonnes → champs Odoo

### Phase 2 : Traitement
- **Dédoublonnage** : Fonctions personnalisées pour identifier et gérer les doublons
- **Formatage** : Formatage automatique (TVA, IBAN, téléphone, email, dates, etc.)
- **Enrichissement IA** : Catégorisation, traduction, extraction d'entités via Gemini/OpenAI
- **Validation** : Analyse de cohérence et dépendances

### Phase 3 : Import
- **Tests d'échantillons** : Validation avant import complet (onglet ou global)
- **Import complet** : Importation avec récupération systématique des xml_id
- **Journalisation** : Log détaillé de toutes les opérations

### Phase 4 : Maintenance
- **Réparation** : Fonction pour réparer un fichier endommagé

## 🚀 Démarrage Rapide

### Pour les Développeurs

1. Cloner ou copier ce repository
2. Créer la bibliothèque Apps Script `Odoo_Migration_Core` dans Google Apps Script
3. Copier le code de `library/` dans la bibliothèque
4. Créer un Google Sheet et y ajouter la bibliothèque
5. Suivre le guide de déploiement dans `docs/`

### Pour les Utilisateurs

1. Obtenir une copie du template Google Sheets
2. Remplir les onglets avec vos données
3. Suivre le workflow guidé dans les menus

## 📁 Structure du Projet

```
Odoo RDD/
├── docs/              # Documentation complète
│   └── STRATEGIE.md   # Guide de développement et liste des tâches
├── library/           # Code de la bibliothèque Apps Script
├── template/          # Template Google Sheets (structure, menus)
├── scripts/           # Scripts additionnels
└── README.md          # Ce fichier
```

## 📚 Documentation

Consultez le fichier [`docs/STRATEGIE.md`](docs/STRATEGIE.md) pour :
- La stratégie complète de développement
- La liste détaillée des tâches
- L'architecture technique
- Le plan d'implémentation

## 🔧 Technologies

- **Google Apps Script** : Scripts et bibliothèques
- **Google Sheets** : Interface utilisateur
- **Odoo XML-RPC** : Communication avec Odoo
- **Gemini/OpenAI API** : Enrichissement IA

## 📝 Versions Supportées

- Odoo 18
- Odoo 19

## 🤝 Contribution

Ce projet est en développement actif. Consultez la stratégie dans `docs/STRATEGIE.md` pour voir les tâches à accomplir.

## 📄 Licence

[À définir]

---

*Projet Odoo RDD - Reprise De Données*

