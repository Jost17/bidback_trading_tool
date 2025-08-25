# Market Breadth Data Management Integration

## Projekt-Kontext
Ich möchte die Daten-Management-Funktionen aus einem Market Breadth Modul in meine neue Applikation integrieren. Es geht um die Grundfunktionen für Datenerfassung und -verwaltung.

## Benötigte Features

### 1. 📋 Historical Data Display
- Tabellarische Darstellung der Market Breadth Daten
- Sortierung und einfache Filterung
- Datum, Indikatoren und Werte in übersichtlicher Form

### 2. ✏️ Manual Data Entry  
- Formular für manuelle Dateneingabe
- Strukturierte Eingabefelder für alle Indikatoren
- Validation und Error Handling
- Submit zu Database

### 3. 📁 CSV Upload
- File Upload Interface mit Drag & Drop
- CSV Parsing und Datenvalidierung  
- Preview vor dem Import
- Batch-Insert in Database

## Market Breadth Indicators (Datenstruktur)

**Primary Indicators:**
- Stocks up/down 4% daily
- Stocks up/down 25% quarterly
- 5-day ratio, 10-day ratio

**Secondary Indicators:**
- Stocks up/down 25% monthly
- Stocks up/down 50% monthly  
- Stocks up/down 13% in 34 days

**Overarching Indicators:**
- T2108 (% Stocks above 40-day MA)
- Worden Common Stocks
- S&P Reference

## Database Schema
PostgreSQL Tabelle `market_breadth_daily` mit:
- Date (Primary Key)
- Alle Indicator-Spalten (INTEGER/DECIMAL)
- Metadata (data_source, timestamps)
- Custom columns support

## Technische Requirements
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Backend**: API Routes für CRUD Operations
- **Database**: PostgreSQL mit Connection Pooling
- **Validation**: Type-safe mit Zod
- **File Processing**: CSV parsing mit intelligenter Spalten-Erkennung

## Integration-Anforderung
Implementiere diese 3 Kernfunktionen als separaten Bereich in meiner App:

1. **HistoricalData.tsx** - Datentabelle mit Basis-Funktionen
2. **ManualDataEntry.tsx** - Eingabeformular mit allen Feldern  
3. **DataUpload.tsx** - CSV Upload mit Validation

**Ziel**: Solide Datenerfassung und -verwaltung als Basis für weitere Features.