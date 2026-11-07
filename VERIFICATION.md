# Verification — 2026-11-07

Continued from the supplied v3 ZIP. No demonstration station prices are included.

- JavaScript syntax check passed.
- Browser opened the site and the trip calculator successfully. The unavailable-feed status was visible. A single desktop-width browser view was inspected; real mobile devices and populated maps remain unverified.
- Live importer executed, but the MIMIT page timed out. Direct CSV requests to the ministry domains also timed out. No official snapshot was produced. Daily automation has NOT been activated or verified.
- Importer preserves the previous snapshot on download/validation failure; now rejects missing, future or stale extraction dates and records source URLs and SHA-256 hashes.
- Fixed sorting after geolocation, price units (Metano €/kg), snapshot age notice, and explicit labels for calculator example inputs.
- GitHub-ready source includes a daily workflow. This is not a remotely created GitHub repository. GitHub account integration is not installed in this session.

## Publish on GitHub

Create an empty private repository, upload this source (including `.github`), and run **Actions → Update Italian fuel prices → Run workflow**. A successful import must produce `data/latest.json`. Check its extraction date, provenance URLs, counts, and representative station prices against the downloaded official CSV files before publication. The daily schedule is 09:25 UTC and can be delayed by GitHub.

For a public site, enable GitHub Pages for the repository only after validating the real import. Publishing audience is a separate choice; no domain purchase is needed.

## Local preview

Run `python -m http.server 8000` in this folder, then open http://localhost:8000. No feed is bundled: the empty state is intentional until a real import succeeds.
