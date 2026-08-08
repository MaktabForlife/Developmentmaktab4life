﷽

# M4L Google Drive Library

## Production Configuration & Recovery Guide

**Proven production setup • 8 August 2026 • Worker baseline V100.6**

> **Purpose:** This guide records the production Google Drive Library configuration that has been tested end-to-end. It is intended for repeat setup, recovery, migration, and future maintenance.

## Production quick reference

| Item | Production value / rule |
|---|---|
| Cloudflare Worker | `rebootworker` |
| Production API | `https://api.rebootyourmaktab.maktabhelper.app` |
| Library root folder | `REBOOT YOUR MAKTAB- KITAABS` |
| Library root folder ID | `1Nx6dRnHtWflz-ucJuLeD6YUfYFh2ePok` |
| Worker root variable | `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID` |
| Private access TTL | `M4L_DRIVE_ACCESS_TTL_SECONDS = 3600` |
| Service-account email / guard | `reboot-maktab-prod@rebootyourmaktab-backend.iam.gserviceaccount.com` via Worker Text variable `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| Folder sharing | Production service account = Viewer |
| Student Drive permission | None required; students access files through authenticated M4L delivery. |
| Native Google Docs/Sheets/Slides | Not supported by the current Library flow; use uploaded downloadable files such as PDFs/media. |
| Environment source of truth | Cloudflare Worker Variables and Secrets. `wrangler.jsonc` is infrastructure/bindings only. |

> **Important separation:** The Library Drive root folder is configured by `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID`. The Weekly Planner PNG destination is a separate Apps Script feature and reads `WeeklyPlannerDriveFolderId` from the spreadsheet `SystemConfig` sheet.

# 1. Production architecture

**Private My Drive folder → production service account → Cloudflare Worker → authenticated M4L Library → student/admin browser.**

- The Drive folder stays private; do not enable public link sharing.
- The production Google service account is granted **Viewer** access to the Library root folder.
- The Worker uses `GOOGLE_SERVICE_ACCOUNT_JSON` to authenticate to Google APIs and verifies the expected identity from `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` once that guard is configured.
- `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID` locks browsing and file access to the configured root folder and descendants.
- M4L stores the resource record in the existing Google Sheet; the Drive file itself remains in Google Drive.
- Students receive authenticated M4L access, not a raw Google Drive permission requirement.
- PDFs open through the existing PDF.js viewer; audio/video can use protected streaming and byte ranges.

# 2. Fresh production setup - step by step

## Step 1 - Confirm Google Drive API

1. Open the Google Cloud project that owns the production service account.
2. Confirm Google Drive API (`drive.googleapis.com`) is enabled.
3. No Google Picker, OAuth consent screen, client ID, or API key is required for this server-to-server Library flow.

## Step 2 - Identify and lock the production service account

4. In Cloudflare Worker secrets, locate `GOOGLE_SERVICE_ACCOUNT_JSON`. Its `client_email` remains the authentication credential identity.
5. Add the Text variable `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` with the expected production identity:

   ```text
   reboot-maktab-prod@rebootyourmaktab-backend.iam.gserviceaccount.com
   ```

6. The expected email must match `GOOGLE_SERVICE_ACCOUNT_JSON.client_email`. V100.6 checks this before Google Sheets or Drive access so an accidentally replaced credential cannot silently use the wrong account.

> **Security:** `GOOGLE_SERVICE_ACCOUNT_JSON` is a secret. Never paste its private key into documentation, source code, screenshots, or chat logs. The `client_email` itself is not a secret.

## Step 3 - Create and share the production Drive folder

7. Create or select the private **My Drive** folder that will be the M4L Library root.
8. Share the folder with the production service-account `client_email` as **Viewer**.
9. Do not use public link sharing. Do not give students direct Drive access.
10. Copy the folder ID from the URL after `/folders/`.

**Production folder name:** `REBOOT YOUR MAKTAB- KITAABS`  
**Production folder ID:** `1Nx6dRnHtWflz-ucJuLeD6YUfYFh2ePok`

## Step 4 - Configure the production Worker

11. Cloudflare → Workers & Pages → `rebootworker` → Settings → Variables and Secrets.
12. Add a Text variable named `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID` with the production folder ID.
13. Add the Text variable `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` with the exact production service-account email shown in this guide.
14. Keep `M4L_DRIVE_ACCESS_TTL_SECONDS` at `3600` unless there is a deliberate reason to change the private access lifetime.
15. Deploy the Worker after configuration/code changes.

## Production Worker configuration to keep

| Name | Type | Purpose |
|---|---|---|
| `APPS_SCRIPT_URL` | Text | Retained only for Weekly Planner PNG-to-Drive bridge. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Secret | Google service-account credentials used by Sheets/Drive integrations. |
| `GOOGLE_SPREADSHEET_ID` | Text | Production M4L spreadsheet. |
| `M4L_DRIVE_ACCESS_TTL_SECONDS` | Text | Private Drive access URL lifetime; verified value 3600 seconds. |
| `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID` | Text | Production private Library root folder. |
| `M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS` | Text | Session security control; keep enabled as configured. |
| `M4L_STUDENT_LOGIN_BASE` | Text | Production personal student-link base URL. |
| `PIN_SECRET` | Secret | PIN pepper used by M4L credential hashing. |
| `SESSION_SECRET` | Secret | JWT/session signing secret. |
| `AUTH_LOGIN_RATE_LIMITER` | Binding | Cloudflare rate-limit binding; not shown in normal Variables table. |
| `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` | Text | Expected Google service-account identity guard; production value must match `GOOGLE_SERVICE_ACCOUNT_JSON.client_email`. |

> **V100.6 configuration ownership:** Cloudflare Worker Variables and Secrets are the source of truth for environment-specific URLs, IDs, account email, and application settings. `backend/wrangler.jsonc` contains deployment/infrastructure only (Worker names/entry point, compatibility/environment structure, `MEDIA_BUCKET`, and `AUTH_LOGIN_RATE_LIMITER`). Do not restore Wrangler `vars` blocks or retired `M4L_BACKEND_*` selector variables. During rollout, a missing expected email is backward-compatible but diagnostics report `missing-expected-email`; once `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` is configured, a mismatch is rejected.

# 3. Verification after setup or recovery

## Test A - Worker health

Open:

```text
https://api.rebootyourmaktab.maktabhelper.app/
```

Expected:

```json
{"success":true,"service":"rebootworker","version":"100.6"}
```

## Test B - fixed routing diagnostics

Run while logged into the production Admin app as an **ADMIN**:

```javascript
fetch("https://api.rebootyourmaktab.maktabhelper.app/api/admin/backend-routing", {
  method: "GET",
  headers: {
    "Authorization": "Bearer " + localStorage.getItem("maktab_token")
  }
})
.then(function(response) {
  return response.json().then(function(data) {
    console.log("STATUS:", response.status);
    console.log("AUTH:", data.features["auth"]);
    console.log("RESOURCES:", data.features["resources"]);
    console.log("PROGRESS:", data.features["progress-read"]);
    console.log("WEEKLY PLANNER DRIVE:", data.features["weekly-planner-drive"]);
    console.log("DRIVE LIBRARY:", data.features["drive-library"]);
    console.log("GOOGLE SERVICE ACCOUNT:", data.googleServiceAccount);
  });
});
```

Expected routing:

- AUTH → backend `google-sheets`, source `fixed`.
- RESOURCES → backend `google-sheets`, source `fixed`.
- PROGRESS → backend `google-sheets`, source `fixed`.
- WEEKLY PLANNER DRIVE → backend `apps-script`, source `fixed`.
- DRIVE LIBRARY → backend `worker`, source `fixed`.
- `envVar` should be empty for these fixed ownership routes.

Expected service-account guard:

- `expectedEmail` and `credentialEmail` both equal `reboot-maktab-prod@rebootyourmaktab-backend.iam.gserviceaccount.com`.
- `match: true`
- `status: "ok"`
- `valid: true`

## Test C - production Drive root browser

```javascript
fetch("https://api.rebootyourmaktab.maktabhelper.app/api/admin/drive/browse", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("maktab_token")
  },
  body: "{}"
})
.then(function(response) {
  console.log("STATUS:", response.status);
  return response.json();
})
.then(function(data) {
  console.log("DRIVE RESULT:", data);
});
```

Expected:

- HTTP status: `200`
- `success: true`
- `rootFolderId: "1Nx6dRnHtWflz-ucJuLeD6YUfYFh2ePok"`
- `folder.name: "REBOOT YOUR MAKTAB- KITAABS"`

## Test D - UI and student delivery

16. Admin → Add or Modify → Library → Add Resource.
17. Choose a resource type and **Browse Shared Folder**.
18. Select a supported file, choose Subject, Module, Available To, Active, and save.
19. Confirm the existing resource sheet receives the new row and the Library shows the resource.
20. Log in as a student with access and open the resource.
21. For a PDF/eBook/Printable, confirm it opens in the normal M4L PDF.js viewer without a Google permission prompt.

## Test E - access controls

- [ ] Active = false makes the resource disappear after Library refresh.
- [ ] Restoring Active makes the resource reappear.
- [ ] A group-specific resource appears for a student in that group.
- [ ] The same resource is absent for a student in another group.
- [ ] Available To = ALL restores access for all eligible active students.

# 4. Library data and UI rules

- Library hierarchy is **Subject → Module**. `ModuleList` is authoritative for active Module IDs, names, and sort order.
- Task is not part of the live Library navigation or permission model; the Task input has been removed from the resource form.
- Format is not user-managed; the visible Format input has been removed. M4L may still derive/store format information automatically for compatibility.
- Existing resource-sheet columns remain in place to avoid schema churn; unused `TaskId` cells can remain blank.
- Duplicate Drive-file protection prevents accidentally registering the same Drive file more than once across resource sheets.
- The Admin browser is restricted to the configured root folder and its descendants; it is not an unrestricted Google Drive browser.

# 5. Weekly Planner is a separate Apps Script bridge

> **Do not remove `APPS_SCRIPT_URL`.** All normal Google Sheets application reads/writes are Worker-owned, but Weekly Planner PNG submission still requires Apps Script Drive access.

- Current callable `doPost` action: `saveWeeklyPlannerPreviewToDrive`.
- Manual deployment/authorization helper: `authorizeM4LServices`.
- Apps Script reads `WeeklyPlannerDriveFolderId` from the bound spreadsheet `SystemConfig` sheet.
- Optional label: `WeeklyPlannerDriveFolderLabel`; default label is `Weekly Planner`.
- This Weekly Planner folder configuration is independent of `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID`.
- After Worker/variable housekeeping, always verify one normal production Weekly Planner PNG save to confirm the bridge still works.

# 6. Security and maintenance rules

- Keep the production Library root folder private. Share only with people/service accounts that actually need Drive-level access.
- The folder ID is infrastructure information, not an authentication secret. The service-account private key is a secret.
- Do not expose `GOOGLE_SERVICE_ACCOUNT_JSON` to frontend JavaScript or commit it to the repository.
- Do not store short-lived signed Drive access URLs in the spreadsheet; M4L mints them at runtime.
- Keep the production and development Library root folders separate.
- If the production service account changes, share the root folder with the new `client_email`, replace `GOOGLE_SERVICE_ACCOUNT_JSON`, and update `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` to the same expected identity. Then require diagnostics to return `match: true`, `status: "ok"`, `valid: true`.
- If the Library root folder changes, update `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID` and rerun the Drive-root browser test.
- If the production API hostname changes, review the Pages `/pdf-file` proxy allowlist so protected PDF.js delivery continues to work.
- Native Google Docs/Sheets/Slides are not part of the current file-delivery model. Export/upload a downloadable format when needed.

# 7. Troubleshooting

| Symptom | Likely area | First check |
|---|---|---|
| Drive browse returns 401 | M4L Admin authentication | Confirm `maktab_token` exists and current account is an authenticated ADMIN. |
| Drive browse returns permission/not found error | Drive sharing or folder ID | Confirm the root folder ID and that the production service-account `client_email` is a Viewer. |
| Folder opens but expected file is absent | File type / folder contents | Confirm file is inside the root tree and is a supported downloadable file type. |
| PDF appears but PDF.js will not open it | Protected PDF delivery / proxy | Confirm production API host is allowlisted by `/pdf-file` proxy and signed access path is being used. |
| Resource saved but student cannot see it | Active / Group / Subject-Module metadata | Check Active, Available To, student current group, and resource placement. |
| Weekly Planner Drive save fails | Apps Script bridge | Check `APPS_SCRIPT_URL`, `SystemConfig` `WeeklyPlannerDriveFolderId`, Apps Script deployment/authorization, and Drive access. |
| Routing diagnostics show source other than fixed | Wrong Worker build | Verify Worker health reports V100.6 or later and deploy the current routing/configuration code. |
| Diagnostics show `missing-expected-email` | V100.6 identity guard not yet configured | Google access remains backward-compatible during rollout, but diagnostics are not complete. Add `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` as Text using `credentialEmail` exactly, then rerun diagnostics. |
| Diagnostics show `email-mismatch` or Google access fails after an email/credential change | Service-account identity guard | Compare `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` with `GOOGLE_SERVICE_ACCOUNT_JSON.client_email`. Correct the unintended value, then require `match: true` / `status: "ok"` / `valid: true`. |

# 8. Recovery checklist

- [ ] Google Drive API enabled in the project owning the production service account.
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON` restored as a Worker secret.
- [ ] `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` is configured as Text and exactly matches `GOOGLE_SERVICE_ACCOUNT_JSON.client_email`.
- [ ] Cloudflare Worker Variables and Secrets contain the environment-specific configuration; `wrangler.jsonc` contains infrastructure/bindings only.
- [ ] Production Library folder shared to service-account `client_email` as Viewer.
- [ ] `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID` points to the intended private root folder.
- [ ] `M4L_DRIVE_ACCESS_TTL_SECONDS` is configured (verified value `3600`).
- [ ] Worker health reports the expected current version.
- [ ] Routing diagnostics show `google-sheets` / `apps-script` / `worker` with source `fixed`, and `googleServiceAccount` reports `match: true`, `status: "ok"`, `valid: true`.
- [ ] Admin Drive browser test returns the expected production root folder.
- [ ] Admin can add/modify a Library resource.
- [ ] Student can open an allowed PDF in PDF.js without Google Drive permissions.
- [ ] Active filtering verified.
- [ ] Group filtering verified.
- [ ] Weekly Planner PNG save verified through Apps Script.

# 9. Current proven production state

At the time this guide was created, the production setup passed all of the following:

- Worker V100.6 health check.
- Fixed routing diagnostics with environment-specific application values removed from `wrangler.jsonc` and owned by Cloudflare Worker Settings.
- Production service-account identity guard verified: `expectedEmail` and `credentialEmail` match; `status: "ok"`; `valid: true`.
- Production Weekly Planner PNG save previously verified after Worker housekeeping; rerun this test after recovery or major configuration changes.
- Production Drive root API browse.
- Admin Library folder browse and resource save.
- Student protected PDF opening in PDF.js.
- Active resource visibility control.
- Group-specific resource visibility control.

> **Operational rule:** Change one production configuration layer at a time and rerun the relevant test before moving on. Cloudflare Worker Settings own environment-specific values; do not mirror them back into `wrangler.jsonc`.
