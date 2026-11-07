# Verification — 2026-11-07

The CSV host timed out locally and in two GitHub runs. The independent official Osservaprezzi API returned HTTP 200 and real prices.

## Successful local import

- 21,664 distinct stations; 92,806 valid fuel/service prices.
- All 20 regions queried sequentially. Returned records do not certify exhaustive national coverage.
- 11 invalid prices rejected; 10 stations without valid coordinates remain searchable but cannot appear on the map.
- 51,218 self-service and 41,588 attended records.
- Download completed 2026-11-07T11:34:23Z.
- An earlier independent Rome query provided 3,474 overlapping prices: 3,473 matched exactly. One changed between requests. The source is mutable and the import is not an atomic national snapshot.
- Individual price dates are not supplied. Station timestamps and download time are distinguished.

## Checks passed

Python compilation, JavaScript syntax, station referential integrity, distinct station IDs, price bounds, service modes, 20-region provenance, quoted CSV fields/date parsing and empty dataset rejection.

Application logic was tested against the real snapshot: counts, Rome address search, date labels, Metano units, sorting after geolocation and trip calculation. This is a DOM-stub test, not visual browser verification.

Earlier browser inspection verified layout and calculator without data. Current populated map, physical mobile devices, hosted deployment and cloud ingestion remain unverified in this report. Daily workflow is being switched to the API.

No demonstration station prices are included. No domain was purchased.
