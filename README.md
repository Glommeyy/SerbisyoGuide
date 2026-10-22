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

## Staff management and review
Open `admin.html` or choose **Staff workspace** from the resident navigation.

1. Add a service or edit an existing service. Enter an editor name, description, purposes, base requirements, and ordered steps.
2. Save the draft, then submit it for review. Drafts, rejected changes, and pending changes remain hidden from residents.
3. Open **Review queue**. Compare current and proposed information, enter a different reviewer name, and acknowledge that the information was checked.
4. Approve to publish locally, or return with a required correction note. Returned drafts can be edited and resubmitted.

Published data and the review queue are stored under `serbisyoGuide.catalog.v1`. Failed storage writes do not publish changes. Concurrent changes in another tab require a reload before saving. Published revisions invalidate old resident checklists so changed requirements are not silently marked as prepared. The checklist can filter missing/prepared items; print includes every requirement.

**Scope limitation:** localStorage cannot authenticate authorized barangay staff, enforce trustworthy roles, share changes across devices, or provide a secure audit log. Different editor/reviewer names demonstrate a review process only. Anyone with browser access can use the workspace or alter storage. For a shared deployment without a backend, copy verified, approved data into `services.js` and republish the static site. Actual secure personnel authorization requires a change to the localStorage-only architecture.

All sample applicant-specific reminders still come from `getRequirements` in `script.js`; the staff form manages base requirements. Local approval does not make demo data official.

## Verification
Run `node tests/catalog.test.cjs` to verify review state transitions, unpublished draft isolation, new service publication, persistence, concurrency protection, invalid data, storage failure, document search coverage, DOM targets, and all 80 sample questionnaire combinations.
