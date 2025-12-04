# US Army Orgchart Generator

Kurzbeschreibung: Dieses Tool generiert aus einer PostgreSQL-Datenbank automatisch ein Organigramm (SVG + PNG) auf Basis einer US‑Army‑ähnlichen Hierarchie.

## Voraussetzungen
- PostgreSQL (z. B. unter WSL)
- Node.js + npm
- Zugriff auf die Datei `schema.sql`
- Installierte Node‑Pakete: `pg`, `sharp`

## Anleitung

### 1. PostgreSQL-Datenbank einrichten
```bash
createdb usarmy
psql -d usarmy -f schema.sql
```

### 2. Konfiguration anpassen
In `generate_org_chart.js` die DB‑Zugangsdaten ändern:
```javascript
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'usarmy',
  password: 'PASSWORT',
  port: 5432
};
```

### 3. Dependencies installieren
```bash
npm install
```

### 4. Organigramm erzeugen
```bash
node generate_usarmy_chart.js
```

Ergebnis:
- `org_chart.svg`
- `org_chart.png`

### 5. Fertig
Die Dateien liegen im Projektverzeichnis und können weiterverwendet werden.
