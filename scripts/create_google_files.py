#!/usr/bin/env python3
"""
Script pour créer les fichiers Google nécessaires via l'API Google Drive
Nécessite l'installation de google-api-python-client et google-auth
"""

import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Scopes nécessaires
SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/script.projects'
]

FOLDER_NAME = 'Odoo RDD'
TEMPLATE_NAME = 'Odoo_RDD_Template'
LIBRARY_NAME = 'Odoo_RDD_Library'

def authenticate():
    """Authentification OAuth2"""
    creds = None
    token_file = 'token.json'
    
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        with open(token_file, 'w') as token:
            token.write(creds.to_json())
    
    return creds

def create_folder(service, parent_id=None):
    """Créer ou trouver le dossier"""
    try:
        # Chercher le dossier existant
        query = f"name='{FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'"
        if parent_id:
            query += f" and '{parent_id}' in parents"
        else:
            query += " and 'root' in parents"
        
        results = service.files().list(q=query).execute()
        items = results.get('files', [])
        
        if items:
            folder_id = items[0]['id']
            print(f"✓ Dossier existant trouvé: {FOLDER_NAME} (ID: {folder_id})")
            return folder_id
        else:
            # Créer le dossier
            file_metadata = {
                'name': FOLDER_NAME,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            if parent_id:
                file_metadata['parents'] = [parent_id]
            
            folder = service.files().create(body=file_metadata, fields='id').execute()
            folder_id = folder.get('id')
            print(f"✓ Dossier créé: {FOLDER_NAME} (ID: {folder_id})")
            return folder_id
            
    except HttpError as error:
        print(f"✗ Erreur lors de la création du dossier: {error}")
        return None

def create_spreadsheet(service, folder_id):
    """Créer le Google Sheets Template"""
    try:
        # Chercher le fichier existant
        query = f"name='{TEMPLATE_NAME}' and mimeType='application/vnd.google-apps.spreadsheet'"
        query += f" and '{folder_id}' in parents"
        
        results = service.files().list(q=query).execute()
        items = results.get('files', [])
        
        if items:
            sheet_id = items[0]['id']
            print(f"✓ Template existant trouvé: {TEMPLATE_NAME} (ID: {sheet_id})")
            return sheet_id
        else:
            # Créer le spreadsheet via l'API Sheets
            from googleapiclient.discovery import build as build_sheets
            sheets_service = build_sheets('sheets', 'v4', credentials=service._http.credentials)
            
            spreadsheet = {
                'properties': {
                    'title': TEMPLATE_NAME
                }
            }
            spreadsheet = sheets_service.spreadsheets().create(body=spreadsheet).execute()
            sheet_id = spreadsheet.get('spreadsheetId')
            
            # Déplacer dans le dossier
            file = service.files().get(fileId=sheet_id, fields='parents').execute()
            previous_parents = ",".join(file.get('parents'))
            service.files().update(
                fileId=sheet_id,
                addParents=folder_id,
                removeParents=previous_parents,
                fields='id, parents'
            ).execute()
            
            print(f"✓ Template créé: {TEMPLATE_NAME} (ID: {sheet_id})")
            return sheet_id
            
    except HttpError as error:
        print(f"✗ Erreur lors de la création du template: {error}")
        return None

def main():
    """Fonction principale"""
    print("=== Création des fichiers Google pour Odoo RDD ===\n")
    
    print("⚠️  Note: Ce script nécessite:")
    print("   1. L'installation de google-api-python-client et google-auth-oauthlib")
    print("   2. Un fichier credentials.json (téléchargé depuis Google Cloud Console)")
    print("   3. L'activation des APIs: Drive API, Sheets API, Apps Script API\n")
    
    print("Pour une méthode plus simple, utilisez le script Apps Script:")
    print("   scripts/create_google_files.js\n")
    
    try:
        creds = authenticate()
        service = build('drive', 'v3', credentials=creds)
        
        # Créer le dossier
        folder_id = create_folder(service)
        if not folder_id:
            return
        
        # Créer le template
        template_id = create_spreadsheet(service, folder_id)
        if not template_id:
            return
        
        print("\n=== RÉSULTATS ===")
        print(f"Dossier ID: {folder_id}")
        print(f"Template ID: {template_id}")
        print(f"Template URL: https://docs.google.com/spreadsheets/d/{template_id}")
        print("\n⚠️  Pour créer le projet Apps Script Library:")
        print("   - Aller sur https://script.google.com")
        print("   - Créer un nouveau projet nommé: " + LIBRARY_NAME)
        print("   - Noter le Script ID depuis les paramètres du projet")
        
    except FileNotFoundError:
        print("✗ Fichier credentials.json non trouvé.")
        print("   Téléchargez-le depuis: https://console.cloud.google.com/apis/credentials")
    except Exception as error:
        print(f"✗ Erreur: {error}")

if __name__ == '__main__':
    main()

