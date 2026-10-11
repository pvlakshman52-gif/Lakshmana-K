#!/usr/bin/env python3
"""
MediClinic ERP - UI Production Packaging Script
Creates public/mediclinic-ui-build.zip and generates public/ui-build-info.json
containing complete details of the production build and customer deployment pipeline.
"""

import os
import shutil
import json
import zipfile
from datetime import datetime

DIST_DIR = 'dist'
PUBLIC_DIR = 'public'
ZIP_OUTPUT = os.path.join(PUBLIC_DIR, 'mediclinic-ui-build.zip')
INFO_OUTPUT = os.path.join(PUBLIC_DIR, 'ui-build-info.json')

def format_size(bytes_num):
    if bytes_num < 1024:
        return f"{bytes_num} B"
    elif bytes_num < 1024 * 1024:
        return f"{bytes_num / 1024:.1f} KB"
    else:
        return f"{bytes_num / (1024 * 1024):.2f} MB"

def main():
    if not os.path.exists(DIST_DIR):
        print(f"[ERROR] '{DIST_DIR}' directory does not exist! Please run 'npm run build' first.")
        return

    os.makedirs(PUBLIC_DIR, exist_ok=True)

    # Copy customer installer and bridge service artifacts into dist/ so they are inside the zip as well
    installer_files = [
        'MediClinic-ERP-Setup.bat',
        'MediClinic-ERP-Setup.ps1',
        'MediClinic-Setup.iss',
        'MediClinicSqlBridge.xml',
        'repair-service.ps1',
        'local-sql-bridge.js',
        'web.config'
    ]
    for ifile in installer_files:
        src_path = os.path.join(PUBLIC_DIR, ifile)
        if not os.path.exists(src_path) and os.path.exists(ifile):
            src_path = ifile
        if os.path.exists(src_path):
            shutil.copy2(src_path, os.path.join(DIST_DIR, ifile))

    files_list = []
    total_uncompressed_bytes = 0

    # 1. Package dist/ into ZIP
    print(f"[1/3] Packaging '{DIST_DIR}' into '{ZIP_OUTPUT}'...")
    with zipfile.ZipFile(ZIP_OUTPUT, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(DIST_DIR):
            for file in sorted(files):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, DIST_DIR)
                file_size = os.path.getsize(file_path)
                total_uncompressed_bytes += file_size

                # Determine file type
                ext = os.path.splitext(file)[1].lower()
                category = 'Asset'
                if file == 'local-sql-bridge.js': category = 'SQL Bridge Service'
                elif file == 'MediClinicSqlBridge.xml': category = 'Service Wrapper Config'
                elif ext == '.html': category = 'HTML Entry'
                elif ext == '.js': category = 'JavaScript Bundle'
                elif ext == '.css': category = 'CSS Stylesheet'
                elif ext in ['.json', '.webmanifest']: category = 'PWA Manifest'
                elif ext in ['.png', '.ico', '.svg']: category = 'Icon / Graphic'
                elif ext == '.config': category = 'IIS Configuration'
                elif ext == '.bat': category = 'Windows Installer (.bat)'
                elif ext == '.ps1': category = 'PowerShell Engine (.ps1)'
                elif ext == '.iss': category = 'Inno Setup Script (.iss)'

                files_list.append({
                    'name': rel_path,
                    'category': category,
                    'sizeBytes': file_size,
                    'sizeFormatted': format_size(file_size)
                })

                zipf.write(file_path, rel_path)

    zip_size_bytes = os.path.getsize(ZIP_OUTPUT)

    # 2. Write UI Build Info JSON
    print(f"[2/3] Writing build metadata to '{INFO_OUTPUT}'...")
    build_info = {
        'status': 'SUCCESS',
        'buildTimestamp': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
        'buildTimestampLocal': datetime.now().strftime('%Y-%m-%d %I:%M:%S %p'),
        'version': 'v2.8.2-prod',
        'zipDownloadUrl': '/mediclinic-ui-build.zip',
        'zipSizeBytes': zip_size_bytes,
        'zipSizeFormatted': format_size(zip_size_bytes),
        'uncompressedSizeBytes': total_uncompressed_bytes,
        'uncompressedSizeFormatted': format_size(total_uncompressed_bytes),
        'fileCount': len(files_list),
        'files': files_list,
        'pipeline': {
            'developerSide': [
                {'step': 'AI Studio', 'desc': 'Cloud development and feature customization'},
                {'step': 'Build', 'desc': 'Vite 8 production compilation with zero errors'},
                {'step': 'mediclinic-ui-build.zip', 'desc': 'Complete frontend bundle with pre-configured IIS web.config and bridge scripts'}
            ],
            'customerSide': [
                {'step': 'SQL Server', 'desc': 'Local or network Microsoft SQL Server instance (dynamically detected)'},
                {'step': 'MediClinic-ERP-Setup.exe / .bat', 'desc': 'Automated 1-click Windows elevated installer engine'},
                {'step': 'Automatic dependency check', 'desc': 'Checks and auto-provisions Node.js, IIS, URL Rewrite 2.1, ARR 3.0'},
                {'step': 'IIS + Rewrite + ARR', 'desc': 'Enables IIS features, installs rewrite modules, enables ARR proxy'},
                {'step': 'SQL Bridge Windows Service', 'desc': 'Installs native MediClinicSqlBridge Windows Service (port 5001, auto boot startup, auto-recovery)'},
                {'step': 'Extract UI ZIP', 'desc': 'Extracts production UI bundle directly to C:\\inetpub\\wwwroot\\mediclinic'},
                {'step': 'Configure API', 'desc': 'Configures reverse proxy: /api/* -> http://localhost:5001/api/*'},
                {'step': 'Health checks', 'desc': 'Probes port 5001, SQL query connection, IIS port 80, reverse proxy'},
                {'step': 'Go Live', 'desc': 'Creates Desktop shortcuts, opens browser to http://localhost/mediclinic'}
            ]
        }
    }

    with open(INFO_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(build_info, f, indent=2)

    # Also sync into dist/ so if someone reads from dist/ui-build-info.json it matches
    dist_info = os.path.join(DIST_DIR, 'ui-build-info.json')
    with open(dist_info, 'w', encoding='utf-8') as f:
        json.dump(build_info, f, indent=2)

    print(f"[3/3] UI Production Bundle Ready!")
    print(f"      - ZIP File: {ZIP_OUTPUT} ({format_size(zip_size_bytes)})")
    print(f"      - Files Packaged: {len(files_list)}")
    print(f"      - Metadata: {INFO_OUTPUT}")

if __name__ == '__main__':
    main()
