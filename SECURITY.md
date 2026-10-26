# Security

PipFrame is a local-first web app: trades, prices, balances and notes stay in the browser on the user's device.
The only data that ever leaves a device is the opt-in usage numbers described in [privacy.html](privacy.html).

## Reporting a problem

If you find a security or privacy problem, please do not open a public issue.
Contact the maintainer privately through GitHub (profile DallaSamuel) and describe what you found and how to reproduce it.
You will get an answer, and credit if you want it, once it is fixed.

## What is in place

- Content Security Policy: scripts and styles only from this site, no inline scripts, no plugins, no outside connections except the opt-in usage address.
- Every stored, restored and imported record is cleaned (wrong types dropped, text capped); user text is only ever shown as text.
- CSV exports neutralise spreadsheet formulas.
- Optional password-locked backups: PBKDF2-SHA256 (600,000 rounds) and AES-256-GCM in the browser; the password is never stored.
- The usage intake validates every field, rate-limits per device and globally, and caps rows per day. Usage rows are kept for the length of the test and deleted on request or when it ends.
- Automated tests on every push, including hostile backup and report files; CodeQL scanning weekly and on every change.

## Known limits

- GitHub Pages cannot send security headers, so framing protection relies on a script; a host with real headers is planned.
- Anyone with the unlocked device, or a malicious browser extension, can read the journal. This cannot be fixed in a web app.
- This is the builders' own testing, not an independent audit.
