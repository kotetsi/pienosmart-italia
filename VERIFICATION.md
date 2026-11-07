# Verification — 2026-11-07

## Official API import verified

The CSV host timed out, but the separate official Osservaprezzi API worked locally and in GitHub Actions.

- 21,664 stations and 92,806 valid prices from queries across all 20 regions. This does not independently certify exhaustive national coverage.
- 11 invalid prices rejected; 10 stations without usable coordinates remain searchable but cannot appear on the map.
- 51,218 self-service and 41,588 attended records.
- GitHub run https://github.com/kotetsi/pienosmart-italia/actions/runs/42369038134 completed successfully, including committing data/latest.json.
- Cloud download completed 2026-11-07T11:39:42Z. The published raw JSON was independently downloaded and returned HTTP 200, CORS *, and the expected counts.
- A local national snapshot compared with an earlier Rome request matched 3,473 of 3,474 overlapping prices. One changed between requests; these are mutable, sequential queries, not an atomic national snapshot.
- The API supplies station update times, not individual price dates. The UI distinguishes station and download times.

## Tests

Python compilation, JavaScript syntax, referential integrity, unique station IDs, price bounds, service modes, 20-region provenance, quoted CSV fields/date parsing and empty dataset rejection passed. A DOM-stub application test against the real feed passed counts, Rome search, date labels, Metano units, price sorting after geolocation and trip calculation.

An earlier browser check verified the layout without data. Current populated map appearance and physical mobile devices remain unverified. A private Sites deployment is being prepared; its final status must be checked separately.

Daily execution is configured at 09:25 UTC. Successful on-demand execution is verified; the next scheduled daily run has not occurred yet. Failed imports preserve the previous snapshot. No demonstration station prices are included. No domain was purchased.
