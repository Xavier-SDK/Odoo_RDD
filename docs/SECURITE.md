# Sécurité - Protection contre les Injections

## Vue d'ensemble

Ce document décrit les mesures de sécurité mises en place pour protéger le formulaire de configuration contre les tentatives d'injection malveillantes.

## Risques identifiés

### 1. XSS (Cross-Site Scripting)
**Risque** : Injection de scripts JavaScript dans les champs de saisie
**Exemple** : `<script>alert('XSS')</script>`

### 2. XML Injection
**Risque** : Injection de code XML malveillant dans les requêtes XML-RPC
**Exemple** : `</string></value></param><param><value><string>malicious`

### 3. SQL Injection
**Risque** : Injection de commandes SQL (bien que nous utilisions XML-RPC, pas SQL direct)
**Exemple** : `'; DROP TABLE users; --`

### 4. Command Injection
**Risque** : Injection de commandes système
**Exemple** : `; rm -rf /`

## Mesures de protection

### Fonction de validation : `validateAndSanitizeConfig()`

Cette fonction est appelée **avant** tout enregistrement de configuration et effectue :

1. **Détection de patterns suspects** :
   - Balises HTML/JavaScript (`<script>`, `<iframe>`, etc.)
   - Handlers d'événements JavaScript (`onclick=`, `onerror=`, etc.)
   - Protocoles JavaScript (`javascript:`)
   - Structures XML malveillantes (`<![CDATA[`, `<?xml`)
   - Commandes SQL suspectes
   - Entités HTML encodées suspectes

2. **Validation de format** :
   - **URL** : Format URL valide (`https?://...`)
   - **Base de données** : Alphanumérique, tirets et underscores uniquement
   - **Utilisateur** : Alphanumérique, points, underscores, @ et tirets
   - **API Key** : Longueur minimale de 8 caractères

3. **Limites de longueur** :
   - URL : 500 caractères maximum
   - Base de données : 100 caractères maximum
   - Utilisateur : 100 caractères maximum
   - API Key : 500 caractères maximum

4. **Nettoyage** :
   - Suppression des caractères de contrôle (0x00-0x1F, 0x7F)
   - Trim des espaces en début/fin

5. **Logging de sécurité** :
   - Toutes les tentatives d'injection sont loggées dans les logs Apps Script
   - Format : `⚠️ Tentative d'injection détectée dans [champ]: [contenu]`

## Flux de validation

```
Utilisateur saisit des données
         ↓
validateAndSanitizeConfig()
         ↓
    ┌────┴────┐
    │  Valid? │
    └────┬────┘
    No   │   Yes
    ↓    │    ↓
Rejet  │  Sanitisation
       │    ↓
       │  saveConfig()
       │    ↓
       │  Stockage sécurisé
```

## Comportement en cas de détection

1. **Rejet immédiat** : L'enregistrement est rejeté
2. **Message d'erreur** : Un message générique est affiché à l'utilisateur
3. **Marquage des champs** : Les champs problématiques sont mis en évidence en rouge
4. **Logging** : L'incident est enregistré dans les logs Apps Script

## Protection supplémentaire

### Échappement XML
Les valeurs sont également échappées lors de la construction des requêtes XML-RPC via la fonction `escapeXml()` dans `library/OdooConnection.gs` :
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&apos;`

### Protection Google Sheets
Google Sheets (`SpreadsheetApp.setValue()`) échappe automatiquement les valeurs lors du stockage, offrant une protection supplémentaire.

## Exemples de tentatives bloquées

### XSS
```
<script>alert('XSS')</script>
→ ❌ Rejeté : "Caractères ou patterns suspects détectés"
```

### XML Injection
```
</string></value></param><param><value><string>malicious
→ ❌ Rejeté : "Caractères ou patterns suspects détectés"
```

### Format invalide
```
Base de données : "my-db@123"
→ ❌ Rejeté : "Le nom de base de données ne peut contenir que des lettres, chiffres, tirets et underscores"
```

## Recommandations

1. **Ne jamais désactiver la validation** : La fonction `validateAndSanitizeConfig()` doit toujours être appelée
2. **Examiner les logs** : En cas de tentatives répétées, examiner les logs Apps Script
3. **Mettre à jour les patterns** : Si de nouveaux vecteurs d'attaque sont découverts, mettre à jour `suspiciousPatterns`
4. **Tests réguliers** : Tester régulièrement avec des payloads d'injection connus

## Limitations

- La validation est effectuée côté serveur (Apps Script), pas côté client
- Les patterns de détection peuvent avoir des faux positifs dans certains cas rares
- La validation ne remplace pas une architecture sécurisée globale

## Références

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [XML Injection Prevention](https://owasp.org/www-community/vulnerabilities/XML_Injection)

