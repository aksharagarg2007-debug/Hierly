# Hierly Backend Improvement Prompts

These are copy-ready prompts for making the requested changes **only inside `hierly_backend/`**. Run them in order, one at a time. Let each task finish and review its changes before starting the next. If an implementation decision is unclear, have the coding assistant ask before making a destructive or costly choice.

## Project facts to keep in mind

- The project has two separate Flask applications. These prompts apply only to `hierly_backend/`; do not edit the sibling `hierly/` prototype.
- `hierly_backend/` already has server-rendered Jinja templates for the landing, login/register, dashboard, resume, aptitude, coding, interview, reports, and admin pages. Improve these existing pages rather than assuming a separate frontend exists or introducing a new frontend framework.
- The backend currently uses Flask-SQLAlchemy and SQLite. SQL access exists in the app factory, models, seed script, auth, page/API routes, and scoring service; replacing only the database URI is not enough.
- The application has server-side session login, admin checks, and same-origin API endpoints. Preserve these behaviors unless the Firebase design requires a clearly explained change.
- No Firebase configuration was found in the repository when these prompts were written. Never commit service-account credentials, API secrets, or real `.env` values.
- Unless the project owner confirms that they use Firebase Realtime Database, use **Cloud Firestore** as the document database and the Firebase Admin SDK on the Flask server. Prefer Firebase Authentication for account credentials rather than storing passwords in Firestore. If the existing Firebase project uses a different product or auth arrangement, pause and ask before implementation.

---

## Step 1 — Improve the signed-in frontend

```text
Work only in the hierly_backend/ directory. Improve the frontend for every page after the landing page, using the existing Flask/Jinja templates and current backend routes. Do not edit the sibling hierly/ directory, create a separate frontend application, or change the database in this step.

First inspect the existing templates, route handlers, shared layout, and JavaScript. Keep the existing features and endpoint contracts working. Improve the signed-in experience across login/register, dashboard, resume analyzer, aptitude, coding, interview, reports, and admin pages. Make the design coherent, polished, responsive on mobile/tablet/desktop, and accessible (semantic structure, labels, keyboard focus, readable contrast, and useful validation/error/loading/empty states).

Use the existing project styling approach and shared template/layout where practical. Do not add a framework or dependency unless it is necessary and you explain why. Keep backend-generated values safely escaped; do not insert untrusted user/API text into the DOM with unsafe HTML. Preserve loading, success, and error feedback for asynchronous requests. Fix frontend bugs directly related to these changes, but avoid unrelated behavior changes.

Validate the rendered pages and the relevant JavaScript/template behavior using the existing project tooling or focused tests. If no frontend test tooling exists, use the smallest practical Flask test-client checks and report what was and was not verified. Update documentation only inside hierly_backend/ if setup or UI behavior changes.

At completion, summarize changed files, key UX changes, validation commands/results, and any remaining limitations. Do not proceed to Firebase/database work.
```

### Review checkpoint

Before moving on, run the app and manually inspect the landing, login/register, and every signed-in page at desktop and mobile widths. Confirm existing forms and API-backed interactions still work.

---

## Step 2 — Replace SQL persistence with Firebase

```text
Work only in hierly_backend/. Replace the SQLAlchemy/SQLite persistence layer with Firebase while preserving the Flask application, its server-rendered pages, existing API routes, and user-facing behavior wherever possible. Do not edit the sibling hierly/ directory.

Before editing, inspect all SQL models, queries, writes, seeding behavior, configuration, and tests. Confirm that the Firebase project is intended to use Cloud Firestore. If the existing project is Realtime Database, or if the authentication approach/project details needed for a safe implementation are unclear, stop and ask me rather than guessing.

Use the Firebase Admin Python SDK on the server for Firestore access. Do not store plaintext passwords or password hashes in Firestore. Integrate Firebase Authentication for registration/login and define how authenticated identity is safely represented in the existing Flask session/API requests. Preserve login-required and admin-only enforcement on both page and API routes. Keep all service-account credentials outside source control; support a documented environment-based credential setup or the standard Google Application Default Credentials flow. Fail clearly at startup or when a required Firebase operation cannot run—do not silently fall back to SQLite or fake data.

Create a clear Firestore document/collection design for users, resumes and analyses, aptitude questions and attempts, coding problems and submissions, interview sessions and answers, and performance reports. Preserve user ownership and admin access rules. Replace every SQLAlchemy model/query/write and remove SQLAlchemy/SQLite startup dependencies, including database creation and SQL-based seed logic. Keep reusable persistence behavior in an appropriate service/repository layer instead of duplicating Firestore calls through route handlers.

Handle Firestore document IDs, timestamps, ordering, pagination/query limitations, and nested interview answers explicitly. Preserve current API response shapes unless a change is necessary; if one is necessary, update the templates/docs and explain it. Add a safe, repeatable way to seed starter aptitude questions and coding problems without duplicating them on every app start. Do not silently discard or overwrite data. If existing SQLite records need migration, provide a separate explicit migration path and ask before running it; do not delete hierly.db.

Update requirements, configuration, .env.example, and README/setup documentation inside hierly_backend/. Add only safe placeholders and explain how to configure Firebase credentials and Firestore/Auth. Never print or commit credential contents.

Add focused tests using mocks and/or the Firebase Emulator Suite so tests do not require live credentials or charge a real project. Cover startup when Firebase is configured/misconfigured, persistence operations, registration/login/session behavior, ownership/admin enforcement, seeding idempotency, and existing API behavior. Run the focused suite and report any untested live-Firebase behavior.

At completion, search hierly_backend/ for remaining SQLAlchemy/SQLite references and explain any intentional ones. Summarize changed files, Firestore schema, authentication flow, setup steps, migration status, and test results. Do not begin broad endpoint testing beyond tests needed for the Firebase migration.
```

### Review checkpoint

Do not continue until you have verified the Firebase project type, credentials are not committed, app startup fails clearly without required configuration, and no active runtime code still depends on SQLAlchemy/SQLite. Confirm whether any existing local SQLite data needs migration before considering the replacement complete.

---

## Step 3 — Test backend parameters and end-to-end behavior

```text
Work only in hierly_backend/. Thoroughly test the backend after the frontend and Firebase changes. Inspect the final route handlers, validators, configuration, persistence layer, and service integrations first. Use the test framework already present; if there is none, add a minimal pytest setup and only the test dependencies needed. Never require real Firebase credentials, Gemini API keys, Judge0 credentials, or paid external requests for the normal automated test suite.

Build a route/parameter test matrix and cover every page/API route, input field, query/path parameter, and environment/configuration setting. At minimum include:

1. Auth: registration/login with valid and invalid email/password/name, duplicate email, wrong password, logout, profile GET/PUT, short/empty/overlong profile updates, unauthenticated page/API access, and non-admin/admin access to admin pages and mutations.
2. Resume: missing upload, wrong extension, invalid PDF bytes, unreadable/scanned PDF, valid text PDF, optional/empty/long job description, file-size limit, missing Gemini configuration, malformed/failed Gemini response, and successful analysis persistence. Mock PDF extraction/AI except for focused unit tests.
3. Aptitude: missing/malformed JSON, unknown category, missing answers, wrong answer count, invalid answer values/indexes, valid scoring, question ordering, and persisted attempt. Ensure correct answers are not exposed in the rendered question page before submission.
4. Coding: missing/malformed JSON, unknown problem ID, unsupported language, empty/oversized code, valid test execution, Judge0 missing configuration, timeout/HTTP/malformed responses, and persistence only when execution actually occurred.
5. Interview: malformed/missing lists, empty or excessive questions, mismatched question/answer lengths, empty answers, maximum field lengths, valid feedback, Gemini errors, and persisted answers/session. Confirm returned response shape matches the frontend.
6. History/dashboard/reports: each supported history kind, unknown kind, empty history, multiple activity types, score calculations, ordering, per-user data isolation, report downloads, and saved snapshots.
7. Admin: valid/invalid question creation, options and correct-answer boundaries, deletion of existing/missing question, and denial for ordinary users.
8. Firebase/configuration: required/optional env values, absent/malformed credential configuration, timestamp/document conversion, Firestore errors, idempotent seed behavior, and no accidental SQL/SQLite fallback. Use mocks or the Firebase Emulator Suite.
9. External services: test Gemini and Judge0 success, validation, timeout, non-success HTTP, and malformed payload behavior with mocked HTTP calls; do not send real requests.

For each invalid parameter, assert a deliberate client error (or the established repository-standard response), useful error body, and no unintended database write. Fix bugs revealed by these tests when they are within the requested backend scope; avoid broad unrelated refactors. Include regression tests for each fix.

Run the focused test suite, then any available lint/type/syntax checks. Report exact commands and pass/fail results. If a test cannot run because a tool or Firebase Emulator is unavailable, state that precisely and provide the command/configuration needed; do not claim unrun checks passed. Do not use production Firebase data or credentials.
```

### Final review checkpoint

Review the test report and ensure every route and configuration key has coverage or a documented reason it cannot be tested locally. Keep credentials and real user data out of test output and version control.
