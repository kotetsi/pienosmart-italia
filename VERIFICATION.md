# Verification — 2026-11-07

Continued from the user-supplied v3 ZIP. No demonstration station prices are included.

## GitHub

Source uploaded to https://github.com/kotetsi/pienosmart-italia (public repository created by its owner). The daily workflow is configured at 09:25 UTC, with manual and importer-change triggers. Scheduled execution and successful ingestion are not yet verified.

## Actual import attempts

- Run 42367937934: the official MIMIT landing page timed out after approximately 45 seconds.
- Run 42368080519: the official station CSV endpoint timed out after approximately 45 seconds; fallback to the landing page also timed out.
- Both jobs failed before publishing a snapshot. No data/latest.json was generated or committed.
- Logs: https://github.com/kotetsi/pienosmart-italia/actions/runs/42368080519

The download blocker persists on both the local machine and GitHub's hosted runner. A working network path to MIMIT or locally downloaded official CSV files is required. Third-party or demo prices have not been substituted.

## Validation

JavaScript syntax and Python compilation passed locally. CSV parsing checks covered pipe delimiters, a quoted delimiter, extraction-date parsing, and rejection of empty datasets. Browser inspection verified the unavailable-feed state and the trip calculator page; populated search and map, physical mobile devices, and successful daily updates remain unverified.

## Behavior

Sorting after geolocation, Metano price units, snapshot-age notices, and calculator-example labels were improved. The importer rejects missing, future, stale or mismatched extraction dates and small datasets. Successful downloads record source URLs and SHA-256 hashes; failures preserve the previous snapshot.

## Deployment

The source repository is available, but the website has not been deployed. No domain was purchased. README v3 status sections describe the original package and should be read alongside this newer verification report.
