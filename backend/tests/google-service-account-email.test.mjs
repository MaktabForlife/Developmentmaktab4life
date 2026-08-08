import assert from "node:assert/strict";
import {
  assertGoogleServiceAccountEmailMatches,
  getGoogleServiceAccountEmailDiagnostics
} from "../src/lib/google-service-account-email.js";

const credential = {
  type: "service_account",
  client_email: "m4l-prod@example.iam.gserviceaccount.com",
  private_key: "PRIVATE KEY"
};

assert.equal(
  assertGoogleServiceAccountEmailMatches(
    { M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL: credential.client_email },
    credential.client_email
  ),
  true
);

assert.equal(
  assertGoogleServiceAccountEmailMatches({}, credential.client_email),
  true,
  "Missing expected email remains backward-safe during rollout"
);

assert.throws(
  () => assertGoogleServiceAccountEmailMatches(
    { M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL: "different@example.iam.gserviceaccount.com" },
    credential.client_email
  ),
  /does not match/
);

const ok = getGoogleServiceAccountEmailDiagnostics({
  M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL: credential.client_email,
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(credential)
});
assert.equal(ok.valid, true);
assert.equal(ok.status, "ok");
assert.equal(ok.match, true);
assert.equal(ok.expectedEmail, credential.client_email);
assert.equal(ok.credentialEmail, credential.client_email);

const missingExpected = getGoogleServiceAccountEmailDiagnostics({
  GOOGLE_SERVICE_ACCOUNT_JSON: credential
});
assert.equal(missingExpected.valid, false);
assert.equal(missingExpected.status, "missing-expected-email");
assert.equal(missingExpected.credentialEmail, credential.client_email);

const mismatch = getGoogleServiceAccountEmailDiagnostics({
  M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL: "wrong@example.iam.gserviceaccount.com",
  GOOGLE_SERVICE_ACCOUNT_JSON: credential
});
assert.equal(mismatch.valid, false);
assert.equal(mismatch.status, "email-mismatch");
assert.equal(mismatch.match, false);

const invalid = getGoogleServiceAccountEmailDiagnostics({
  M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL: credential.client_email,
  GOOGLE_SERVICE_ACCOUNT_JSON: "not-json"
});
assert.equal(invalid.valid, false);
assert.equal(invalid.status, "invalid-credential");

console.log("Google service-account email guard tests passed.");
