V100.7

# Admin menu tile landing page

The Admin navigation item now opens a four-tile landing page using the same
app-icon card style as the main Home page:

- Student Records
- Admin Records
- Resources
- System Settings

System Settings opens a smaller submenu containing Zoom Link and the existing
System Settings form. Admin-only controls retain their current visibility and
Worker-side authorization rules.

This is a frontend-only release. Deploy the files listed in
`CHANGED-FILES.txt`; no Worker or Apps Script deployment is required.

## Validation

- Admin menu integration regression test added.
- JavaScript syntax and package JSON checks pass.
- Existing Admin management UI test updated for the new stylesheet cache key.

---

V100.6

# Worker Settings become the environment source of truth

V100.6 removes development/production application values from `backend/wrangler.jsonc`. Cloudflare Worker **Variables and Secrets** now own environment-specific configuration. Wrangler retains only deployment/infrastructure bindings.

## Why

The previous arrangement duplicated several live Worker settings in `wrangler.jsonc`. That made it possible for repository values and dashboard values to drift or for a deployment to reintroduce an outdated URL/ID. V100.6 gives each concern one owner:

- Worker code: application behaviour and fixed backend ownership.
- Cloudflare Worker Settings: environment-specific application configuration.
- `wrangler.jsonc`: Worker infrastructure/bindings.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Google authentication credential.

## Values removed from wrangler.jsonc

Both production and development Wrangler `vars` blocks are removed. The following belong in Cloudflare Worker Settings instead:

- `APPS_SCRIPT_URL`
- `GOOGLE_SPREADSHEET_ID`
- `M4L_DRIVE_ACCESS_TTL_SECONDS`
- `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID`
- `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` (new)
- `M4L_STUDENT_LOGIN_BASE`
- `M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS`

Secrets already remain dashboard-owned:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `PIN_SECRET`
- `SESSION_SECRET`

`M4L_BACKEND_ROUTING_LOGS` may remain as an optional dashboard logging toggle.

## New service-account email guard

Add this **Text** variable separately to development and production Workers:

`M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL`

It is the human-readable expected Google service-account identity. The actual credential still comes from `GOOGLE_SERVICE_ACCOUNT_JSON`, but once the email variable is configured the Worker verifies that it matches `GOOGLE_SERVICE_ACCOUNT_JSON.client_email` before obtaining Google Sheets or Drive access.

This gives operators a visible account identity in Worker Settings without exposing the JSON secret and prevents an accidentally replaced credential from silently using the wrong Google account.

For a safe rollout, missing `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` does not break Google access. Admin routing diagnostics report `missing-expected-email` until it is configured. Once present, a mismatch is rejected.

## Diagnostics

`GET /api/admin/backend-routing` now also returns:

```text
googleServiceAccount.valid
googleServiceAccount.status
googleServiceAccount.expectedEmail
googleServiceAccount.credentialEmail
googleServiceAccount.match
googleServiceAccount.workerVariable
googleServiceAccount.credentialSource
```

Expected completed configuration:

```text
valid: true
status: "ok"
match: true
```

The endpoint is ADMIN-authenticated and never returns the private key or credential JSON.

## Bindings that remain in Wrangler

- `MEDIA_BUCKET` R2 binding.
- `AUTH_LOGIN_RATE_LIMITER` production/development bindings.
- Worker names, entry point, compatibility date and environment structure.
- `keep_vars: true` remains enabled, and deployment scripts continue using `--keep-vars`.

## Recommended deployment order

1. Confirm the existing development and production Worker Settings still contain the required values listed in `backend/WORKER-SETTINGS.md`.
2. Deploy V100.6 to development first.
3. Confirm Worker `/` reports version `100.6`.
4. Run Admin backend-routing diagnostics. Before adding the new email variable, `googleServiceAccount.status` should be `missing-expected-email` and `credentialEmail` will show the credential's service-account email.
5. Add `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` as a Text variable using that exact email.
6. Rerun diagnostics; require `status: "ok"` and `match: true`.
7. Verify Admin/Student login, Library browse/open, and Weekly Planner PNG Drive save.
8. Repeat for production.

Because all pre-existing application values are already stored in Worker Settings, removing them from Wrangler does not require changing their values; V100.6 only changes ownership.

## Validation

- JavaScript syntax checks passed for all changed source/test files.
- `wrangler.jsonc` parses successfully as JSON.
- Full backend regression suite: **24/24 test files passed**.
- Wrangler CLI dry-run was not run because a local Wrangler executable is not installed in the working environment.
