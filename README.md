# Termini – web aplikacija za rezervaciju termina šišanja

Web aplikacija koja omogućuje korisniku odabir slobodnog termina za šišanje i potvrdu rezervacije.  
Projekt je podijeljen na **frontend** (statičke HTML/CSS/JS stranice) i **backend** (Node.js server + baza).

## Funkcionalnosti
- Prikaz dostupnih termina
- Rezervacija odabranog termina
- Stranica potvrde rezervacije

## Tehnologije
- Backend: Node.js + Express
- Baza: (npr. MySQL / MariaDB) + SQL skripta za inicijalizaciju
- Frontend: HTML, CSS, JavaScript

## Struktura projekta

backend/ # Node.js server, API, spajanje na bazu
frontend/ # statičke stranice (UI)
sql/ # SQL skripta za kreiranje tablica / inicijalne podatke


## Preduvjeti
- Node.js (preporuka: LTS)
- Baza podataka (npr. MySQL/MariaDB)
- npm

## Instalacija i pokretanje

### 1) Postavi bazu
1. Kreiraj praznu bazu (npr. `termini`)
2. Pokreni skriptu:
   - `sql/terminal.sql`

### 2) Backend
```bash
cd backend
npm install
npm start
