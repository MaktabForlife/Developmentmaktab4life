# M4L V100.0 — PIN Security Hardening

## Scope

V100.0 hardens the active Cloudflare Worker authentication routes while preserving the existing Google Sheets schema.

## Implemented

1. **PIN setup overwrite blocked**
   - `/api/setup-pin` and `/api/admin/setup-pin` now return HTTP `409` with code `PIN_ALREADY_SET` when either `PinSetup` is already true or a hash is already present.
   - Only the authorised admin reset flow can clear a Student PIN before setup is allowed again.

2. **Login throttling**
   - Cloudflare's `AUTH_LOGIN_RATE_LIMITER` binding allows five valid-format login attempts per account key per 60 seconds.
   - A blocked request returns HTTP `429`, code `AUTH_RATE_LIMITED`, and `Retry-After: 60`.
   - Production and development use separate rate-limit namespaces.

3. **Worker-side four-digit validation**
   - Active Student and Admin setup/login routes accept only a JSON string matching exactly four ASCII digits.
   - Numeric JSON values, letters, spaces, and longer or shorter values are rejected before Sheets access.

4. **PIN reset invalidates active sessions**
   - V100 tokens are cryptographically bound to the current stored PIN hash and authentication row.
   - Every authenticated API request validates the account ID, `PinSetup`, and current credential fingerprint using a single-row Google Sheets read.
   - Resetting the PIN clears the hash, so existing tokens immediately fail authentication.
   - Pre-V100 tokens do not contain the credential binding and are rejected when `M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS=true`.

5. **PIN/hash logging protection**
   - No active authentication route logs request bodies, plaintext PINs, or PIN hashes.
   - The Worker now returns a generic HTTP 500 response without exposing exception details.
   - Backend routing logs continue to include only route/feature/backend metadata.

6. **Salted hashing with transparent migration**
   - The confirmed legacy format remains `SHA-256(PIN + PIN_SECRET)` only for verification of existing records.
   - New hashes use:
     - format version `v2`
     - PBKDF2-HMAC-SHA-256
     - 100,000 iterations
     - random 16-byte per-PIN salt
     - existing `PIN_SECRET` as a server-side pepper
     - 32-byte derived key
   - The salt and algorithm metadata are encoded inside the existing `PinHash` cell, so no Google Sheet columns are required.
   - After a successful legacy login, the Worker writes a new salted hash before issuing the V100 token.
   - Incorrect legacy PIN attempts never trigger migration.

## Deployment order

1. Deploy the Pages/frontend changed files first.
2. Deploy the Worker with the changed backend files and `wrangler.jsonc`.
3. Confirm that the existing `PIN_SECRET`, `SESSION_SECRET`, and `GOOGLE_SERVICE_ACCOUNT_JSON` secrets remain configured. Do not rotate them as part of V100.
4. Confirm the rate-limit namespace IDs `100100` and `100101` are unused in the Cloudflare account. Replace them with unused positive integer strings if necessary.
5. Test in development:
   - Existing Student login succeeds and converts the stored hash to a value beginning `v2$pbkdf2-sha256$`.
   - Existing Admin login succeeds and migrates likewise.
   - Reposting to either setup route after setup returns `409`.
   - Six rapid login attempts produce a `429` response within the Cloudflare location.
   - Resetting a Student PIN causes an already-open Student session to return to login on its next API request.
6. Deploy to production after development verification.

## Expected rollout behaviour

- Users keep their current four-digit PINs.
- Each account migrates only after its first successful V100 login.
- Accounts that have not logged in remain in the legacy hash format temporarily.
- Any session issued before V100 is intentionally invalidated on its next authenticated API request.
- No Sheet schema migration is needed.

## Verification completed

- All backend test files passed.
- JavaScript syntax checks passed for all modified JavaScript files.
- JSON validation passed for `package.json` and `wrangler.jsonc`.
- A Wrangler dry-run could not be executed in the build environment because its package registry did not provide the Wrangler package. The configuration was checked against the current Cloudflare rate-limit binding schema and parsed successfully as JSON.
