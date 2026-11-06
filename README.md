# WRLC Expense Report

A client-side React, TypeScript, and Vite expense report for WRLC. Reports and receipts are processed in the browser; there is no application server, analytics, account, or upload service.

## Use the published app

After GitHub Pages is enabled, open `https://wrlc.github.io/expense-report/`. On the WRLC Staff SharePoint homepage, add a Quick Link titled **Expense Report**, with description **Complete and download your WRLC expense report.** Set it to open in a new browser tab. The site is intended to be linked directly; it does not require iframe embedding.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

## Accounting email configuration

The organization has not supplied an accounting mailbox, so none is assumed. Once WRLC confirms the correct address, set `ACCOUNTING_EMAIL` in `src/config/appConfig.ts`. Users can also enter the address provided to them in the form. Email preparation opens their own email application with a draft; the application cannot send email or attach files automatically. The downloaded PDF must be attached by the employee.

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

Draft form values are autosaved to versioned localStorage on the current browser/device. Use **Export draft** for a portable JSON copy and **Restore draft** to load one. Clearing browser data removes the saved draft. Draft storage is device-specific and is not encrypted, synchronized, or suitable as long-term confidential records storage; do not save sensitive financial information on shared computers. The **Clear local draft** action removes the saved copy.

Receipt files are held only in memory for the active editing session. They are not sent to a server or saved in localStorage; reselect them after a reload. Supported receipts are PDF/JPG/JPEG/PNG up to 10 MB each. When included, image receipts and pages from PDF receipts are appended to the generated report. If a file cannot be incorporated, generation reports the error and directs the user to attach that original receipt separately. If receipt inclusion is turned off, attach originals to the email yourself.

The PDF contains the report, certification acknowledgement, notes, blank accounting approval fields, and selected receipt appendix. A typed name is an acknowledgement, not a cryptographically verified signature. GitHub Pages is public hosting and does not authenticate employees. This app does not meet requirements for centrally managed or encrypted records.

## Tests

Vitest tests exercise cent-accurate calculations, validation, and report data rules. CI runs tests before deploying.
