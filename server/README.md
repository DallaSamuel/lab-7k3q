# Anonymous usage intake: 10-minute setup

What you get: a Google Sheet with two tabs. "usage" has one row per install per day: phone type, time zone, local time, US Central time, screen size, language and simple counts and active time (seconds actually using the app, with a one-minute idle cutoff, plus number of sessions). "events" has one row per screen or button used, with the time. No trade data, prices, notes or names ever leave the phone, and nothing is sent unless the tester switches "Help improve PipFrame" on. Location and internet address are not collected: a Google Sheet cannot see them, and they are personal data.

1. Go to sheets.google.com and create a blank sheet. Name it "PipFrame usage".
2. In the sheet: Extensions, then Apps Script. Delete the sample code and paste all of `apps-script.gs` (its first line, `/** @OnlyCurrentDoc */`, limits the script to this one sheet). Save.
3. Click Deploy, then New deployment. Type: Web app. Execute as: Me. Who has access: Anyone. Click Deploy and allow the permissions it asks for (it only touches this sheet).
4. Copy the Web app URL (it ends in /exec).
5. Open the URL in a browser once. You should see: PipFrame intake is running.
6. Give the URL to Claude to wire in, or run it yourself in the app folder:
   `python3 wire-analytics.py <the /exec URL>`
   then `python3 seal.py index.html`, and upload the changed files (index.html, config.js, sw.js) to GitHub.
7. On a phone: Settings, Help improve PipFrame, switch on. A row appears in the "usage" tab within a minute.

Turn it off for everyone: `python3 wire-analytics.py --off`, then upload again.

Notes
- Deleting someone's data: they can read their anonymous id in the preview box. Delete rows with that id.
- Anyone who finds the URL could post fake rows. The script validates every field and keeps one row per install per day, so fakes cannot inject formulas or large data. For real scale, move to a proper backend.
- Google can change Apps Script limits. This is for the pilot, not for the final product.

Updating the script later (the address stays the same): paste the new code, save, then Deploy, Manage deployments, the pencil icon, Version: New version, Deploy.
