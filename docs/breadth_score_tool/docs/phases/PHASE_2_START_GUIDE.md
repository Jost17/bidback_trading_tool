# 🚀 PHASE 2 STARTANLEITUNG - CSV-Import Engine

## SOFORT STARTEN

### 1. Server initialisieren
```bash
cd /Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/backend
npm install
npm run init-db
npm run dev
```

### 2. CSV-Import aus Knowledge Base starten
```javascript
// In REPL ausführen:
const csvFiles = [
  'Stockbee Market Monitor 2025  2025.csv',
  'Stockbee Market Monitor 2025  2024.csv', 
  'Stockbee Market Monitor 2025  2023.csv',
  // ... alle anderen CSV-Dateien
];

// Für jede Datei:
const csv = await window.fs.readFile(filename, { encoding: 'utf8' });
// Dann über POST /api/csv-import/process importieren
```

## WICHTIGE DATENVALIDIERUNG

### Bei Format-Problemen FRAGEN:
1. **Datumsformat:** MM/DD/YYYY vs DD/MM/YYYY?
2. **Fehlende T2108:** In 2007-2010 - NULL setzen?
3. **Duplikate:** Überschreiben oder überspringen?
4. **Spalten-Mismatch:** Welche Felder ignorieren?

## IMPLEMENTIERUNGSSTATUS

### ✅ FERTIG - Phase 1
- Backend-Server (Express + SQLite)
- API-Endpunkte (12 Stück)
- Multi-Format CSV-Parser
- Breadth Score Engine
- Datenbank-Schema
- Frontend-Setup (React + TypeScript)

### 🎯 NÄCHSTE TASKS - Phase 2
1. CSV-Dateien aus Knowledge Base lesen
2. Format-Erkennung testen
3. Batch-Import aller Jahre
4. Datenvalidierung mit User-Feedback
5. Breadth Score für importierte Daten berechnen

## DATEI-MAPPING

### Format 2025 (16 Spalten) - READY ✅
```
0: Date → date
1: Number of stocks up 4% plus today → stocks_up_4pct
2: Number of stocks down 4% plus today → stocks_down_4pct
3: 5 day ratio → ratio_5day
4: 10 day ratio → ratio_10day
// ... komplettes Mapping in csvImport.js implementiert
```

### Format 2010 (20 Spalten) - MAPPING NEEDED ⚠️
```
0: Date → date
1: 4% plus daily → stocks_up_4pct  
2: 4% down daily → stocks_down_4pct
// ... Legacy-Mapping erforderlich
```

## TROUBLESHOOTING

### Server läuft nicht?
```bash
cd backend
npm install
node src/database/init.js  # Datenbank erstellen
node src/server.js         # Server starten
```

### CSV-Import funktioniert nicht?
1. Check: `curl http://localhost:3001/health`
2. Check: Database file in `data/market_monitor.db`
3. Check: Console logs für Parsing-Errors

## CONTINUATION POINT

**Nächster Agent kann hier weitermachen:**
1. Phase 1 ist 100% fertig ✅
2. Alle Files sind dokumentiert und ready
3. CSV-Parser ist implementiert 
4. Nur noch: Knowledge Base → Database Import
5. Bei Problemen: User fragen (siehe Validierung oben)

**KRITISCH:** Breadth Score Gewichtungen sind konfigurierbar über `/api/breadth-score/weights`

---
**STATUS:** Ready for Phase 2 🚀
**ALLE DATEIEN GESPEICHERT:** ✅ 
**DOKUMENTATION VOLLSTÄNDIG:** ✅