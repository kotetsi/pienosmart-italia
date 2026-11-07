# PienoSmart Italia

Italian fuel-price comparison PWA, continued from the supplied v3 package.

## Verified real import — 7 November 2026

The official CSV host timed out locally and in GitHub Actions. The separate public API used by the official Osservaprezzi website works:

- Source: https://carburanti.mise.gov.it/ospzSearch/home
- Registry: GET https://carburanti.mise.gov.it/ospzApi/registry/region
- Prices: POST https://carburanti.mise.gov.it/ospzApi/search/area
- First local import: 21,664 stations, 92,806 prices, all 20 regions queried. 11 invalid prices rejected; 10 stations lacked usable map coordinates.

These are prices returned by the ministry service, not generated examples. Queries do not independently certify exhaustive national coverage. The API insertDate describes a station update, not an individual fuel-price timestamp. The website displays download time separately. Actual pump prices can differ.

## Updates and local use

Run `python scripts/update_api_feed.py` to fetch regions sequentially and atomically replace data/latest.json only on success. Request hashes, fetch times, regional counts and exclusions are retained. The GitHub workflow runs at 09:25 UTC, on importer changes and manually. Hosted execution must be checked separately from a local run.

Production pages fetch the published snapshot from this public GitHub repository. Localhost uses data/latest.json. Failed imports preserve the previous snapshot. The site flags downloads over 48 hours old; a fresh download does not guarantee every operator recently updated its prices.

The original scripts/update_feed.py and manual CSV import remain alternatives. Uploaded file origins are not independently certified.

For local preview run `python -m http.server 8000` and open http://localhost:8000. Maps require internet; PWA installation requires localhost or HTTPS. Favorites and fuel logs stay in browser storage. Trip and detour calculators use user inputs with labeled examples. Routing, history, notifications and account sync are not implemented.

Source: Ministero delle Imprese e del Made in Italy — Osservaprezzi Carburanti. Mapping: OpenStreetMap contributors. No domain purchase is required.
