# M4L Worker Settings

V102.3

Cloudflare Worker **Variables and Secrets** are the source of truth for values that differ between development and production. `backend/wrangler.jsonc` contains deployment structure and bindings only; it must not contain environment-specific URLs, IDs, account emails, or application settings.

## Text variables

Configure these separately on `devrebootworker` and `rebootworker`:

- `APPS_SCRIPT_URL` — Weekly Planner PNG-to-Drive Apps Script web-app URL.
- `GOOGLE_SPREADSHEET_ID` — spreadsheet used by that Worker environment.
- `PLATFORM_SPREADSHEET_ID` — separate central Platform Sheet containing the
  V102 course registry, identities, memberships and global curriculum. V102.3
  authenticates unified accounts and validates course/role contexts against
  this target, but does not yet move existing application-data routes to it.
- `M4L_DRIVE_ACCESS_TTL_SECONDS` — private Drive access lifetime, currently expected to be `3600` unless intentionally changed.
- `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID` — temporary Reboot Library root fallback.
  The Library is course-specific; a later V102 cutover reads
  `LibraryRootFolderID` from the authenticated course's local `SystemConfig`.
- `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` — human-readable expected service-account identity. It must match `GOOGLE_SERVICE_ACCOUNT_JSON.client_email` once configured.
- `M4L_STUDENT_LOGIN_BASE` — environment-specific Student personal-link base URL.
- `M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS` — normally `true` for legacy
  Admin/Student sessions. V102 central account tokens are always revalidated.

Optional:

- `M4L_BACKEND_ROUTING_LOGS` — diagnostics/logging toggle only; it is not a backend selector.
- `M4L_ACCOUNT_AUTH_DIAGNOSTICS` — development troubleshooting only. Leave
  absent or `false` in normal development and production operation.

## V102.3 account-route boundary

No new Worker variable or secret is required for V102.3. `AccountLoginBaseUrl`
remains a row in central `PlatformConfig`, not a Worker variable. Keep
`M4L_STUDENT_LOGIN_BASE` while the legacy Student route remains operational.

The new `account` token type is intentionally not accepted by existing course
application endpoints. This protects course isolation until those endpoints
resolve their target SpreadsheetID from the authenticated CourseID.

## Secrets

- `GOOGLE_SERVICE_ACCOUNT_JSON` — Google service-account credential JSON.
- `PIN_SECRET` — PIN pepper/secret.
- `SESSION_SECRET` — session-signing secret.

Never place secret values in this repository.

## Wrangler-owned bindings

These remain in `backend/wrangler.jsonc` because they describe Worker infrastructure rather than environment application configuration:

- `MEDIA_BUCKET` R2 binding.
- `AUTH_LOGIN_RATE_LIMITER` rate-limit binding and its environment-specific namespace IDs.
- Worker names, entry point, compatibility date and environment structure.

## Service-account identity check

The credential remains the authentication source, but `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` acts as an expected-identity guard.

- If the expected email is not yet configured, existing Google access remains backward-compatible and diagnostics report `missing-expected-email`.
- Once configured, Google Sheets and Google Drive access require it to match `GOOGLE_SERVICE_ACCOUNT_JSON.client_email`.
- A mismatch is rejected rather than silently authenticating as an unexpected Google service account.

The authenticated Admin routing diagnostics endpoint reports the expected email, credential email, match state and status without exposing the private key or credential JSON.
