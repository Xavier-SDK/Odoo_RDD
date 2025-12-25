/**
 * Script helper pour créer les fichiers Google nécessaires
 * À exécuter dans Google Apps Script
 * 
 * Instructions :
 * 1. Ouvrir https://script.google.com
 * 2. Créer un nouveau projet
 * 3. Coller ce code
 * 4. Exécuter la fonction createFiles()
 */

function createFiles() {
  const folderName = 'Odoo RDD';
  const templateName = 'Odoo_RDD_Template';
  const libraryName = 'Odoo_RDD_Library';
  
  try {
    // 1. Créer ou trouver le dossier
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
      Logger.log('Dossier existant trouvé: ' + folder.getName());
    } else {
      folder = DriveApp.createFolder(folderName);
      Logger.log('Dossier créé: ' + folder.getName());
    }
    
    // 2. Créer le Google Sheets Template
    let template;
    const sheets = folder.getFilesByName(templateName);
    if (sheets.hasNext()) {
      template = SpreadsheetApp.open(sheets.next());
      Logger.log('Template existant trouvé: ' + template.getName());
    } else {
      template = SpreadsheetApp.create(templateName);
      const templateFile = DriveApp.getFileById(template.getId());
      folder.addFile(templateFile);
      DriveApp.getRootFolder().removeFile(templateFile);
      Logger.log('Template créé: ' + template.getName());
    }
    
    // 3. Créer le projet Apps Script pour la Library
    // Note: Les Apps Script standalone doivent être créés manuellement
    // Ce script crée juste le fichier de base dans le dossier
    Logger.log('\n=== INFORMATIONS IMPORTANTES ===');
    Logger.log('1. Template Google Sheets créé:');
    Logger.log('   ID: ' + template.getId());
    Logger.log('   URL: https://docs.google.com/spreadsheets/d/' + template.getId());
    Logger.log('\n2. Pour créer le projet Apps Script Library:');
    Logger.log('   - Aller sur https://script.google.com');
    Logger.log('   - Créer un nouveau projet');
    Logger.log('   - Le nommer: ' + libraryName);
    Logger.log('   - Noter le Script ID depuis l\'URL ou les paramètres du projet');
    Logger.log('\n3. Pour ajouter la library au template:');
    Logger.log('   - Ouvrir le template');
    Logger.log('   - Extensions > Apps Script');
    Logger.log('   - Ressources > Bibliothèques');
    Logger.log('   - Ajouter le Script ID de la library');
    
    return {
      folderId: folder.getId(),
      templateId: template.getId(),
      templateUrl: 'https://docs.google.com/spreadsheets/d/' + template.getId()
    };
    
  } catch (error) {
    Logger.log('Erreur: ' + error.toString());
    throw error;
  }
}

