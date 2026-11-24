# WRLC Expense Report

A client-side React, TypeScript, and Vite expense report for WRLC. Reports and receipts are processed in the browser; there is no application server, analytics, account, or upload service.

## Use the published app

After GitHub Pages is enabled, open `https://wrlc.github.io/expense-report/`. On the WRLC Staff SharePoint homepage, add a Quick Link titled **Expense Report**, with description **Complete and download your WRLC expense report.** Set it to open in a new browser tab. The site is intended to be linked directly; it does not require iframe embedding.

## Run locally

Requires Node.js 24 or later.

```sh
npm ci
npm run dev
```

## Sharing and email

The **Share PDF** action uses the device's native share sheet when available. **Gmail draft** downloads the PDF and opens a prefilled Gmail compose window with the report details. Add the recipient and attach the downloaded PDF before sending. The employee contact email is included in the PDF for replies.

## Build and deploy

```sh
npm run lint
npm test
npm run build
npm run preview
```

The workflow in `.github/workflows/deploy.yml` runs linting, tests, and a production build on every push to `main`, then deploys the build to GitHub Pages. No personal access token or secret is required. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source. The repository path is configured automatically as `/expense-report/` in the production bundle. The published URL is shown in the `github-pages` deployment environment and Pages settings.

For routine updates, push a change to `main`; Actions rebuilds and publishes it. The deployment workflow uses GitHub's supported Pages artifact and deploy actions with the minimum permissions needed for Pages.

## Drafts, receipts, and privacy

Named reports and their report fields are autosaved to versioned localStorage on the current browser/device. Switch reports to resume work, or use **Export reports** for a portable JSON copy and **Restore reports** to load saved reports. Clearing browser data removes the saved draft. Draft storage is device-specific and is not encrypted, synchronized, or suitable as long-term confidential records storage; do not save sensitive financial information on shared computers. **Clear report data** removes the saved reports and receipts; your employee profile stays saved in Settings.

Use **Settings** to manage report backups and save your employee name and email on this device. The Settings **Save and sync employee information** button applies those details to every report. Editing employee information in a report also updates the saved profile and syncs it across reports.

Receipt files are saved in IndexedDB on the current browser/device and restored with their report after a reload. They are not sent to a server or included in the JSON report export. Use the camera button on mobile devices to photograph a receipt, or attach a file from the device. PDF and image receipts up to 10 MB each are supported. When included, images and pages from PDF receipts are appended to the generated report. If a file cannot be incorporated, generation reports the error and directs the user to attach that original receipt separately. If receipt inclusion is turned off, download the PDF and attach original receipt files separately when submitting. **Clear report data** removes saved receipt files too.

Each PDF contains the selected report, employee contact email, certification acknowledgement, notes, and selected receipt appendix. The old approval signature fields are omitted. A typed name is an acknowledgement, not a cryptographically verified signature. GitHub Pages is public hosting and does not authenticate employees. This app does not meet requirements for centrally managed or encrypted records.

## Forms

The **Forms** page contains separate **Payroll Deductions**, **Retirement Contributions**, and **ACH Authorization** forms. The payroll form includes additional pre-tax retirement, additional Roth retirement, and HSA deductions; per-pay-period amounts; an optional catch-up contribution indication; an effective date; and optional one-time or time-limited deduction details. Retirement Contributions covers the 403(b) matching election, optional Roth allocation, continuation terms, and employee authorization. ACH Authorization collects the employee and bank details, an Add/Delete/Change request, and an authorization confirmation. Employee name and email are prefilled from Settings where available. Forms save independently in this browser and provide a **Print / Save as PDF** option; WRLC processing fields remain blank for completion after printing.

## Tests

Vitest tests exercise cent-accurate calculations, validation, and report data rules. CI runs tests before deploying.

The site is installable as a progressive web app. Install it from your browser's install option (or **Add to Home Screen** on iOS); the app interface can load offline after its first online visit. Report forms are stored on-device and receipt images remain in browser storage.
