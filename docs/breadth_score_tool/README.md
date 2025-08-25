# 📊 Breadth Score Tool

Ein Tool zur Analyse von Marktbreitendaten (Market Breadth) für die Bewertung von Aktienmarkt-Trends.

## 🗂️ Projektstruktur

```
breadth_score_tool/
├── 📁 docs/                    # Dokumentation
│   ├── phases/                 # Entwicklungsphasen-Dokumentation
│   ├── project/               # Projektbezogene Dokumentation
│   └── README.md              # Detaillierte Projektdokumentation
├── 📁 scripts/                # Utility Scripts
│   ├── data-import/           # CSV Import Scripts
│   ├── testing/               # Test Scripts
│   └── analysis/              # Datenanalyse Scripts
├── 📁 source/                 # Original CSV Dateien
├── 📁 data/                   # Verarbeitete/bereinigte Daten
├── 📁 backend/                # Backend API (Node.js/Express)
├── 📁 frontend/               # Frontend Interface
├── 📁 archive/                # Archivierte/veraltete Dateien
└── README.md                  # Diese Datei
```

## 🚀 Quick Start

### Voraussetzungen
- Node.js (Version 14+)
- npm oder yarn

### Installation
```bash
# Repository klonen oder herunterladen
cd breadth_score_tool

# Backend Dependencies installieren
cd backend
npm install

# Frontend Dependencies installieren (falls vorhanden)
cd ../frontend
npm install
```

### Verwendung

#### Backend starten
```bash
cd backend
npm start
```
#### Daten importieren
```bash
# CSV-Dateien importieren
cd scripts/data-import
node import_csv.js

# Einzelnen Import testen
node test_single_import.js
```

#### Datenanalyse
```bash
# Datenverteilung nach Jahren analysieren
cd scripts/analysis
node analyze_data.js
```

## 📁 Verzeichnis-Details

### `/docs/`
Enthält die gesamte Projektdokumentation:
- **phases/**: Dokumentation der Entwicklungsphasen
- **project/**: Allgemeine Projektdokumentation

### `/scripts/`
Utility Scripts für verschiedene Aufgaben:
- **data-import/**: Scripts zum Importieren und Verarbeiten von CSV-Daten
- **testing/**: Test-Scripts für verschiedene Funktionalitäten
- **analysis/**: Scripts zur Datenanalyse

### `/source/`
Original CSV-Dateien mit Marktdaten von verschiedenen Jahren

### `/data/`
Verarbeitete und bereinigte Datenfiles

### `/backend/`
Node.js/Express Backend mit API-Endpunkten

### `/frontend/`
Frontend Interface (falls implementiert)

### `/archive/`
Veraltete oder nicht mehr verwendete Dateien
## 🔧 Entwicklung

### Scripts ausführen
Die meisten Scripts befinden sich im `/scripts/` Verzeichnis und können direkt mit Node.js ausgeführt werden:

```bash
# Beispiel: Datenanalyse ausführen
cd scripts/analysis
node analyze_data.js
```

### Neue Daten hinzufügen
1. CSV-Dateien in `/source/` ablegen
2. Import-Script in `/scripts/data-import/` ausführen
3. Daten werden in die Datenbank importiert

## 📝 Dokumentation

Detaillierte Dokumentation finden Sie in:
- `/docs/README.md` - Hauptdokumentation
- `/docs/phases/` - Entwicklungshistorie
- `/docs/project/` - Projektspezifische Docs

## 🗃️ Backup

Ein automatisches Backup wurde erstellt in:
`breadth_score_tool_backup_20250605_212749/`

---

**Letztes Update:** 05.06.2025 - Projektstruktur aufgeräumt und reorganisiert