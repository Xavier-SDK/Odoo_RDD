# Stratégie de Développement - Odoo RDD (Reprise De Données)

## Vue d'ensemble

Système de migration de données vers Odoo (versions 18 et 19) via Google Sheets. L'objectif est de faciliter la reprise de données pour nos clients avec un outil intuitif qui guide chaque étape du processus de migration.

## Architecture Technique : Modèle "Hub & Spoke"

### Principe

Architecture centralisée pour éviter la duplication de code et faciliter la maintenance :

- **Bibliothèque Centrale (Library)** : Script "Parent" contenant toute l'intelligence métier
  - Connexion XML-RPC à Odoo
  - Algorithmes de nettoyage et validation
  - Appels IA (Gemini/OpenAI)
  - Fonctions utilitaires partagées

- **Template de Migration** : Google Sheet "Maître" minimaliste
  - Menus personnalisés
  - Mise en forme de base
  - Script minimal qui appelle la bibliothèque
  - Structure d'onglets standardisée

- **Avantages** :
  - Partage facile : copie du template suffit
  - Mises à jour centralisées : modification de la bibliothèque profite à tous
  - Gestion des droits : bibliothèque en lecture seule pour les utilisateurs finaux

## Workflow Complet : Les 13 Étapes

### Phase 1 : Préparation et Initialisation

#### Étape 1 : Récupération des données du client
**Objectif** : Le client remplit les tableaux dans Google Sheets avec ses données brutes.

**Livrables** :
- Template Google Sheets avec onglets pré-configurés
- Documentation utilisateur pour le remplissage

#### Étape 2 : Ajout de la bibliothèque
**Objectif** : Intégrer la bibliothèque centrale au fichier Google Sheets.

**Livrables** :
- Bibliothèque Apps Script fonctionnelle
- Script `onOpen()` opérationnel

#### Étape 3 : Initialisation du fichier
**Objectif** : Vérifier et créer l'onglet "Paramètres" avec configuration Odoo.

**Livrables** :
- Onglet "Paramètres" avec structure de données
- Sidebar de configuration fonctionnelle
- Validation de connexion Odoo

### Phase 2 : Mapping et Structuration

#### Étape 4 : Mapping des onglets avec les objets Odoo
**Objectif** : Associer chaque onglet du fichier à un modèle Odoo (res.partner, product.product, etc.).

**Livrables** :
- Interface de mapping onglet → modèle Odoo
- Stockage des associations

#### Étape 5 : Mapping des en-têtes de colonnes avec les champs Odoo
**Objectif** : Associer chaque colonne du Sheet aux champs techniques Odoo.

**Livrables** :
- Interface de mapping colonne → champ Odoo
- Ligne de validation avec menus déroulants
- Documentation contextuelle via notes de cellules

### Phase 3 : Traitement des Données

#### Étape 6 : Dédoublonnage des données
**Objectif** : Fournir des fonctions personnalisées pour identifier et gérer les doublons.

**Livrables** :
- Fonctions personnalisées de dédoublonnage (`ODOO_FIND_DUPLICATES`, `ODOO_MERGE_DUPLICATES`, `ODOO_CHECK_EXISTS`)
- Menu et documentation

#### Étape 7 : Formatage des données
**Objectif** : Fournir des fonctions pour formater les données selon les standards Odoo.

**Livrables** :
- Bibliothèque de fonctions de formatage (`ODOO_CLEAN_VAT`, `ODOO_CHECK_IBAN`, `ODOO_FORMAT_PHONE`, etc.)
- Menu et documentation

#### Étape 8 : Enrichissement des données
**Objectif** : Utiliser l'IA pour enrichir et catégoriser les données.

**Livrables** :
- Fonctions IA d'enrichissement (`ODOO_IA_CATEGORIZE`, `ODOO_IA_TRANSLATE`, `ODOO_IA_EXTRACT_ENTITIES`, etc.)
- Menu et documentation
- Gestion des appels API

#### Étape 9 : Analyse de la cohérence des données
**Objectif** : Valider les dépendances et la cohérence des données avant import.

**Livrables** :
- Système de validation de cohérence
- Rapport de validation visuel
- Menu et documentation

### Phase 4 : Tests et Import

#### Étape 10 : Test d'échantillon d'un onglet
**Objectif** : Tester l'import des 10 premiers enregistrements d'un onglet via `load()`.

**Livrables** :
- Fonction de test d'échantillon par onglet
- Affichage des résultats dans le Sheet

#### Étape 11 : Test d'échantillon global
**Objectif** : Tester l'import des 10 premiers enregistrements de tous les onglets.

**Livrables** :
- Fonction de test global
- Rapport consolidé des tests

#### Étape 12 : Importation des données
**Objectif** : Importer toutes les données et récupérer les xml_id générés.

**Livrables** :
- Système d'import complet
- Récupération et stockage des xml_id
- Journal d'import détaillé

### Phase 5 : Maintenance

#### Étape 13 : Réparation du fichier RDD
**Objectif** : Fonction bonus pour réparer un fichier GS endommagé.

**Livrables** :
- Fonction de réparation automatique
- Rapport de réparation

## Fonctionnalités Transverses

### Interface Utilisateur

- **Sidebars HTML/CSS** : Système de Sidebars réutilisables pour configuration, mapping, validation
- **Menus Personnalisés** : Menus "Traitement des données", "Odoo Sync", "Outils", "Aide"
- **Documentation Intégrée** : Notes de cellules, tooltips, guide contextuel

### Gestion des Erreurs et Logs

- Onglet "Log" caché pour les erreurs
- Journalisation de chaque tentative d'import
- Messages d'erreur Odoo détaillés
- Système de notification utilisateur

### Sécurité

- Stockage sécurisé des credentials (API key, etc.)
- Validation des permissions utilisateur
- Gestion des droits sur la bibliothèque (lecture seule pour utilisateurs)

## Structure Technique

### Bibliothèque Apps Script

#### Modules à développer :

1. **OdooConnection** : Connexion XML-RPC, authentification, gestion des sessions
2. **OdooModels** : `models_get()`, `fields_get()`, `load()`, `create()`
3. **DataTransformation** : Transformation selon mappings, gestion des types de champs
4. **DataValidation** : Validation des dépendances, vérification des contraintes
5. **DataCleaning** : Fonctions de formatage, dédoublonnage, nettoyage
6. **AIEnrichment** : Intégration Gemini/OpenAI, catégorisation IA, extraction d'entités
7. **UIManager** : Gestion des Sidebars, menus personnalisés, dialogs
8. **Logger** : Journalisation, gestion des logs, rapports d'erreurs

### Template Google Sheets

#### Structure d'onglets :

- **Paramètres** : Configuration et mappings
- **Contacts** : res.partner
- **Produits** : product.product
- **Catégories Produits** : product.category
- **Commandes** : sale.order
- **Lignes de Commande** : sale.order.line
- **Factures** : account.move
- **Paiements** : account.payment
- **Log** : (caché) Journal d'import
- **Rapport Tests** : Résultats des tests

## Plan d'Implémentation

### Sprint 1 : Fondations (Étapes 1-3)
- Structure du projet
- Bibliothèque de base
- Initialisation et configuration

### Sprint 2 : Mapping (Étapes 4-5)
- Mapping onglets → modèles
- Mapping colonnes → champs
- Interface utilisateur

### Sprint 3 : Traitement (Étapes 6-8)
- Dédoublonnage
- Formatage
- Enrichissement IA

### Sprint 4 : Validation et Tests (Étapes 9-11)
- Validation de cohérence
- Tests d'échantillons
- Rapports

### Sprint 5 : Import et Maintenance (Étapes 12-13)
- Import complet
- Récupération xml_id
- Fonction de réparation

## Critères de Succès

- Le client peut remplir ses données sans formation technique
- Le mapping est intuitif et guidé
- Les fonctions personnalisées sont faciles à utiliser
- Les tests permettent de valider avant import complet
- L'import récupère systématiquement les xml_id
- Les erreurs sont clairement identifiées et documentées
- La bibliothèque est facilement partageable et maintenable

## Notes et Évolutions Futures

- Support d'autres versions d'Odoo (v20+)
- Import depuis d'autres sources (CSV, Excel)
- Export des mappings pour réutilisation
- Templates spécialisés par secteur d'activité
- Intégration avec d'autres outils de migration
