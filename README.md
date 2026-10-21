# SerbisyoGuide

A responsive barangay document preparation guide built with HTML, CSS, Tailwind CSS, and vanilla JavaScript. No accounts, backend, database, or document uploads.

## Run
Open `index.html` directly, or serve this folder with any static web server. Tailwind utilities load from a CDN; the main custom design is in `styles.css`.

## Features
- Search and select three demo barangay services.
- Required questionnaire with first-time/repeat, purpose, adult/minor, and representative branches.
- Personalized checklist, progress tracking, and localStorage persistence of the latest generated checklist.
- Edit answers, clear saved progress with confirmation, copy, text download, and print / save PDF.
- Service-specific transaction steps, responsive navigation, and FAQ.
- Graceful handling of unavailable storage, malformed saved data, and clipboard failures.

## Service data
`services.js` contains JSON-compatible service records in a JavaScript wrapper so the site works when opened directly without a server. Update service names, purposes, requirements, and steps there. Conditional demo rules live in `getRequirements` in `script.js`.

All document requirements are illustrative and must be verified with a partner barangay before deployment. Office location, hours, and contact information are deliberately unverified placeholders. This website is an academic prototype and is not affiliated with Davao City. Its civic information layout takes inspiration from https://davaocity.gov.ph/ without using official seals or implying endorsement.

## Privacy
Only questionnaire answers and checklist completion are kept in this browser's localStorage. Clearing browser data or using another device will not retain that checklist. No personal identity information is requested.
