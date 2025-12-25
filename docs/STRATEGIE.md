# Stratégie de Développement - Odoo RDD (Reprise De Données)

## Vue d'ensemble

Ce projet vise à créer un système complet de migration de données vers Odoo (versions 18 et 19) via Google Sheets. L'objectif est de faciliter la reprise de données pour nos clients en leur fournissant un outil intuitif et puissant qui guide chaque étape du processus de migration.

## Architecture Technique : Modèle "Hub & Spoke"

### Principe

Pour éviter la duplication de code et faciliter la maintenance, nous utilisons une architecture centralisée :

- **Bibliothèque Centrale (Library)** : Script "Parent" (`Odoo_Migration_Core`) contenant toute l'intelligence métier
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

**Tâches** :
- [ ] Créer la structure d'onglets standardisée (Contacts, Produits, Commandes, etc.)
- [ ] Définir les formats de données acceptés
- [ ] Créer un guide utilisateur pour le remplissage des onglets
- [ ] Documenter les risques de dégradation des données (intitulés, formatage)

**Livrables** :
- Template Google Sheets avec onglets pré-configurés
- Documentation utilisateur pour le remplissage

---

#### Étape 2 : Ajout de la bibliothèque
**Objectif** : Intégrer la bibliothèque centrale au fichier Google Sheets.

**Tâches** :
- [ ] Créer le script de bibliothèque `Odoo_Migration_Core`
- [ ] Développer la fonction `onOpen()` qui déclenche l'initialisation
- [ ] Configurer le partage de la bibliothèque
- [ ] Tester l'héritage des fonctions dans le template

**Livrables** :
- Bibliothèque Apps Script fonctionnelle
- Script `onOpen()` opérationnel

---

#### Étape 3 : Initialisation du fichier
**Objectif** : Vérifier et créer l'onglet "Paramètres" avec configuration Odoo.

**Tâches** :
- [ ] Créer la fonction de vérification de l'onglet "Paramètres"
- [ ] Développer le formulaire de configuration (user, base de données, URL, API key)
- [ ] Créer l'interface utilisateur (Sidebar HTML/CSS)
- [ ] Implémenter la sauvegarde sécurisée des paramètres
- [ ] Valider la connexion Odoo au moment de la configuration

**Livrables** :
- Onglet "Paramètres" avec structure de données
- Sidebar de configuration fonctionnelle
- Validation de connexion Odoo

---

### Phase 2 : Mapping et Structuration

#### Étape 4 : Mapping des onglets avec les objets Odoo
**Objectif** : Associer chaque onglet du fichier à un modèle Odoo (res.partner, product.product, etc.).

**Tâches** :
- [ ] Créer l'interface de mapping (Sidebar)
- [ ] Lister les modèles Odoo disponibles via `models_get()`
- [ ] Permettre la sélection d'un modèle pour chaque onglet
- [ ] Sauvegarder les associations dans l'onglet "Paramètres"
- [ ] Afficher visuellement les onglets mappés

**Livrables** :
- Interface de mapping onglet → modèle Odoo
- Stockage des associations

---

#### Étape 5 : Mapping des en-têtes de colonnes avec les champs Odoo
**Objectif** : Associer chaque colonne du Sheet aux champs techniques Odoo.

**Tâches** :
- [ ] Appeler `fields_get()` pour le modèle sélectionné
- [ ] Générer une ligne de validation avec les noms techniques Odoo
- [ ] Créer des menus déroulants pour le mapping colonne → champ
- [ ] Gérer les types de champs (many2one, many2many, etc.)
- [ ] Ajouter des notes de cellules explicatives (many2one, xml_id, etc.)
- [ ] Valider la cohérence des mappings (champs obligatoires, types)

**Livrables** :
- Interface de mapping colonne → champ Odoo
- Ligne de validation avec menus déroulants
- Documentation contextuelle via notes de cellules

---

### Phase 3 : Traitement des Données

#### Étape 6 : Dédoublonnage des données
**Objectif** : Fournir des fonctions personnalisées pour identifier et gérer les doublons.

**Tâches** :
- [ ] Créer la fonction `ODOO_FIND_DUPLICATES(range)` 
- [ ] Créer la fonction `ODOO_MERGE_DUPLICATES(range)`
- [ ] Créer la fonction `ODOO_CHECK_EXISTS(value, model)` pour vérifier l'existence dans Odoo
- [ ] Développer l'algorithme de détection de doublons (fuzzy matching)
- [ ] Créer le menu "Traitement des données > Dédoublonnage"
- [ ] Documenter l'utilisation des formules

**Livrables** :
- Fonctions personnalisées de dédoublonnage
- Menu et documentation

---

#### Étape 7 : Formatage des données
**Objectif** : Fournir des fonctions pour formater les données selon les standards Odoo.

**Tâches** :
- [ ] Créer `ODOO_CLEAN_VAT(value)` : Formatage numéro de TVA
- [ ] Créer `ODOO_CHECK_IBAN(value)` : Validation IBAN
- [ ] Créer `ODOO_FORMAT_PHONE(value)` : Formatage téléphone
- [ ] Créer `ODOO_FORMAT_EMAIL(value)` : Validation et formatage email
- [ ] Créer `ODOO_FORMAT_DATE(value, format)` : Formatage dates
- [ ] Créer `ODOO_FORMAT_CURRENCY(value, currency)` : Formatage monétaire
- [ ] Créer le menu "Traitement des données > Formatage"
- [ ] Documenter toutes les fonctions disponibles

**Livrables** :
- Bibliothèque de fonctions de formatage
- Menu et documentation

---

#### Étape 8 : Enrichissement des données
**Objectif** : Utiliser l'IA pour enrichir et catégoriser les données.

**Tâches** :
- [ ] Intégrer l'API Gemini ou OpenAI
- [ ] Créer `ODOO_IA_CATEGORIZE(description, model)` : Suggestion de catégorie
- [ ] Créer `ODOO_IA_TRANSLATE(text, target_lang)` : Traduction
- [ ] Créer `ODOO_IA_EXTRACT_ENTITIES(text)` : Extraction d'entités
- [ ] Créer `ODOO_IA_SUGGEST_TAGS(description)` : Suggestion de tags
- [ ] Créer le menu "Traitement des données > Enrichissement"
- [ ] Gérer les quotas et limites API
- [ ] Documenter l'utilisation

**Livrables** :
- Fonctions IA d'enrichissement
- Menu et documentation
- Gestion des appels API

---

#### Étape 9 : Analyse de la cohérence des données
**Objectif** : Valider les dépendances et la cohérence des données avant import.

**Tâches** :
- [ ] Créer la fonction de validation des dépendances (many2one, many2many)
- [ ] Vérifier l'existence des références dans Odoo
- [ ] Valider les champs obligatoires
- [ ] Vérifier les contraintes métier (unicité, etc.)
- [ ] Créer le menu "Traitement des données > Validation"
- [ ] Générer un rapport de validation avec erreurs/warnings
- [ ] Afficher les résultats dans une colonne "Status" avec mise en forme conditionnelle

**Livrables** :
- Système de validation de cohérence
- Rapport de validation visuel
- Menu et documentation

---

### Phase 4 : Tests et Import

#### Étape 10 : Test d'échantillon d'un onglet
**Objectif** : Tester l'import des 10 premiers enregistrements d'un onglet via `load()`.

**Tâches** :
- [ ] Implémenter la méthode `load()` d'Odoo (dry run)
- [ ] Créer le menu "Odoo > Echantillon onglet"
- [ ] Sélectionner les 10 premières lignes de l'onglet actif
- [ ] Transformer les données selon le mapping
- [ ] Envoyer à Odoo en mode test
- [ ] Afficher les erreurs dans une colonne "Status"
- [ ] Mise en forme conditionnelle (rouge pour erreurs, vert pour succès)

**Livrables** :
- Fonction de test d'échantillon par onglet
- Affichage des résultats dans le Sheet

---

#### Étape 11 : Test d'échantillon global
**Objectif** : Tester l'import des 10 premiers enregistrements de tous les onglets.

**Tâches** :
- [ ] Créer le menu "Odoo > Echantillon global"
- [ ] Parcourir tous les onglets mappés
- [ ] Pour chaque onglet, exécuter le test d'échantillon
- [ ] Générer un rapport consolidé
- [ ] Afficher les résultats dans un onglet "Rapport Tests"
- [ ] Identifier les onglets avec erreurs

**Livrables** :
- Fonction de test global
- Rapport consolidé des tests

---

#### Étape 12 : Importation des données
**Objectif** : Importer toutes les données et récupérer les xml_id générés.

**Tâches** :
- [ ] Créer le menu "Odoo > Importation"
- [ ] Parcourir tous les onglets mappés
- [ ] Transformer les données selon les mappings
- [ ] Gérer les dépendances (ordre d'import)
- [ ] Implémenter l'import par lots (batch)
- [ ] Récupérer les xml_id générés par Odoo
- [ ] Stocker les xml_id dans une colonne dédiée
- [ ] Gérer les erreurs et les retry
- [ ] Créer un journal d'import (onglet "Log")
- [ ] Afficher la progression de l'import

**Livrables** :
- Système d'import complet
- Récupération et stockage des xml_id
- Journal d'import détaillé

---

### Phase 5 : Maintenance

#### Étape 13 : Réparation du fichier RDD
**Objectif** : Fonction bonus pour réparer un fichier GS endommagé.

**Tâches** :
- [ ] Créer le menu "Outils > Réparation"
- [ ] Détecter les onglets manquants
- [ ] Restaurer la structure d'onglets standard
- [ ] Vérifier l'intégrité des mappings
- [ ] Restaurer les menus personnalisés
- [ ] Valider la connexion à la bibliothèque
- [ ] Générer un rapport de réparation

**Livrables** :
- Fonction de réparation automatique
- Rapport de réparation

---

## Fonctionnalités Transverses

### Interface Utilisateur

#### Sidebars HTML/CSS
- [ ] Créer le système de Sidebars réutilisables
- [ ] Sidebar de configuration Odoo
- [ ] Sidebar de mapping onglets
- [ ] Sidebar de mapping colonnes
- [ ] Sidebar de validation
- [ ] Design responsive et ergonomique

#### Menus Personnalisés
- [ ] Menu "Traitement des données" avec sous-menus
- [ ] Menu "Odoo" avec sous-menus
- [ ] Menu "Outils"
- [ ] Menu "Aide" avec documentation

### Documentation Intégrée

- [ ] Notes de cellules explicatives pour les champs many2one
- [ ] Notes pour les xml_id
- [ ] Tooltips dans les Sidebars
- [ ] Guide contextuel selon l'étape du workflow

### Gestion des Erreurs et Logs

- [ ] Onglet "Log" caché pour les erreurs
- [ ] Journalisation de chaque tentative d'import
- [ ] Messages d'erreur Odoo détaillés
- [ ] Système de notification utilisateur

### Sécurité

- [ ] Stockage sécurisé des credentials (API key, etc.)
- [ ] Validation des permissions utilisateur
- [ ] Gestion des droits sur la bibliothèque (lecture seule pour utilisateurs)

---

## Structure Technique

### Bibliothèque Apps Script (`Odoo_Migration_Core`)

#### Modules à développer :

1. **OdooConnection**
   - Connexion XML-RPC
   - Authentification
   - Gestion des sessions

2. **OdooModels**
   - `models_get()` : Liste des modèles
   - `fields_get()` : Champs d'un modèle
   - `load()` : Test d'import
   - `create()` : Création d'enregistrements

3. **DataTransformation**
   - Transformation selon mappings
   - Gestion des types de champs
   - Conversion des valeurs

4. **DataValidation**
   - Validation des dépendances
   - Vérification des contraintes
   - Détection d'erreurs

5. **DataCleaning**
   - Fonctions de formatage
   - Dédoublonnage
   - Nettoyage des données

6. **AIEnrichment**
   - Intégration Gemini/OpenAI
   - Catégorisation IA
   - Extraction d'entités

7. **UIManager**
   - Gestion des Sidebars
   - Menus personnalisés
   - Dialogs et notifications

8. **Logger**
   - Journalisation
   - Gestion des logs
   - Rapports d'erreurs

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

---

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

---

## Critères de Succès

- ✅ Le client peut remplir ses données sans formation technique
- ✅ Le mapping est intuitif et guidé
- ✅ Les fonctions personnalisées sont faciles à utiliser
- ✅ Les tests permettent de valider avant import complet
- ✅ L'import récupère systématiquement les xml_id
- ✅ Les erreurs sont clairement identifiées et documentées
- ✅ La bibliothèque est facilement partageable et maintenable

---

## Notes et Évolutions Futures

- Support d'autres versions d'Odoo (v20+)
- Import depuis d'autres sources (CSV, Excel)
- Export des mappings pour réutilisation
- Templates spécialisés par secteur d'activité
- Intégration avec d'autres outils de migration

---

## Documentation à Créer

- [ ] Guide utilisateur complet
- [ ] Documentation technique de la bibliothèque
- [ ] Guide de déploiement
- [ ] FAQ et dépannage
- [ ] Exemples d'utilisation

---

*Document créé le : [Date]*
*Dernière mise à jour : [Date]*

