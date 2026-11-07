# PienoSmart Italia — MVP

Static Italian-language website with MIMIT station-level CSV import, search, map (Leaflet / OpenStreetMap, internet required), detour-savings calculator, trip-cost calculator, fuel log (localStorage), and distribution histogram.

## Run

Open `index.html` or run `python -m http.server 8000` in this folder and visit `http://localhost:8000`.

## Real data

Official source: https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti

Download **anagrafica_impianti_attivi.csv** and **prezzo_alle_8.csv**, then import both using the website. Data is processed in-browser and is not sent to our server. The 2026 format uses pipe delimiters and two header lines. The prices published each day represent values in force at 08:00 on the preceding day, **not live pump prices**. The interface never invents station prices.

Data attribution: Ministero delle Imprese e del Made in Italy (MIMIT), Osservaprezzi Carburanti; Italian Open Data License 2.0. Mapping © OpenStreetMap contributors.

## Production requirements

- Server-side daily fetch and validated import, caching, database/API, scheduled updates and monitoring. Browser cannot reliably auto-download MIMIT files due to cross-origin restrictions.
- Production routing, toll APIs, historical ingestion, EV pricing, hotels/affiliate features, account sync and notification alerts are **not implemented**.
- Review hosting, privacy/cookie policy, terms and security before public launch.
- The current design is an MVP; it is not deployed and no domain is needed yet.

## Automated feed (v2)

Run `python scripts/update_feed.py` on a network-enabled server to discover and download both official CSV files from the MIMIT landing page, validate them and atomically publish `data/latest.json`. The website automatically loads this snapshot on startup, with manual import as fallback. The included `.github/workflows/update-data.yml` runs daily at 09:25 UTC and commits only validated snapshots; repository Actions write permissions must be enabled. To test the importer with local official CSV files: `MIMIT_STATIONS_FILE=/path/anagrafica.csv MIMIT_PRICES_FILE=/path/prezzi.csv python scripts/update_feed.py`.

**Status:** The importer passed a synthetic 1,001-station integration test. Live download has NOT been verified in this execution environment because outbound DNS is unavailable. No live prices or sample prices are included. Scheduled updates start only after the project is hosted in a GitHub repository with Actions enabled. The official source may change link structure, requiring a small update to discovery logic.

## v3: mobile / PWA and driver tools
- Installable PWA with manifest, icons, service worker and mobile bottom navigation. Requires HTTPS or localhost; opening index.html as file does not install PWA.
- Star/favorite stations stored locally, filter by favorites.
- Fuel-log estimated consumption between consecutive full-tank refills, assuming each refill is a complete fill-up; do not interpret partial fills as measured consumption.
- The offline service worker caches the app shell, **not** official fuel prices. No offline price guarantee.
- Not yet deployed; no real feed verified, routing and push notifications still not implemented.
