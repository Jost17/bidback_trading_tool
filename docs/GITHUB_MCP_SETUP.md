# GitHub MCP Setup für BIDBACK Trading Tool

## Status
✅ Git Repository initialisiert
✅ GitHub MCP installiert (`@modelcontextprotocol/server-github`)
⚠️ GitHub Personal Access Token noch nicht konfiguriert

## Nächste Schritte

### 1. GitHub Personal Access Token erstellen
1. Gehe zu GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Klicke auf "Generate new token"
3. Wähle die benötigten Scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)
   - `workflow` (Update GitHub Action workflows)
4. Kopiere den generierten Token

### 2. Token in Claude konfigurieren
```bash
# Token in Claude konfigurieren
claude mcp update github --env GITHUB_PERSONAL_ACCESS_TOKEN=dein_github_token_hier
```

### 3. GitHub Repository erstellen (optional)
```bash
# Neues Repository auf GitHub erstellen
gh repo create bidback-trading-tool --private --description "Professional Trading Management Tool with Market Breadth Analysis"

# Oder manuell auf GitHub erstellen und dann:
git remote add origin https://github.com/dein-username/bidback-trading-tool.git
git branch -M main
git push -u origin main
```

### 4. Verbindung testen
```bash
# MCP Verbindung prüfen
claude mcp list

# GitHub MCP sollte als "✓ Connected" erscheinen
```

## Vorteile des GitHub MCP
- Direkter Zugriff auf GitHub Repositories
- Issues und Pull Requests Management
- Code Search über Repositories
- Workflow Automation Support
- Bessere Integration mit Git-basiertem Development

## Troubleshooting
Falls die Verbindung fehlschlägt:
1. Prüfe ob der Token korrekt ist
2. Stelle sicher, dass der Token die richtigen Permissions hat
3. Restart Claude Code nach Token-Änderungen

---
Erstellt: 2025-08-25