/* M4L V100.6 - Human-readable Google service-account identity guard.
   Cloudflare Worker Settings owns M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL.
   The credential JSON remains the authentication secret; when an expected
   email is configured, it must match GOOGLE_SERVICE_ACCOUNT_JSON.client_email.
*/

export function assertGoogleServiceAccountEmailMatches(env = {}, credentialEmail = "") {
  const expectedEmail = normalizeEmail(env?.M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const actualEmail = normalizeEmail(credentialEmail);

  // Backward-safe rollout: the expected email becomes an enforced guard as
  // soon as it is configured in Worker Settings.
  if (!expectedEmail) {
    return true;
  }

  if (!actualEmail || expectedEmail !== actualEmail) {
    throw new Error(
      "M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL does not match GOOGLE_SERVICE_ACCOUNT_JSON client_email"
    );
  }

  return true;
}

export function getGoogleServiceAccountEmailDiagnostics(env = {}) {
  const expectedEmail = clean(env?.M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const credential = readCredentialSummary(env?.GOOGLE_SERVICE_ACCOUNT_JSON);
  const credentialEmail = credential.email;
  const expectedNormalized = normalizeEmail(expectedEmail);
  const credentialNormalized = normalizeEmail(credentialEmail);

  let status = "ok";
  let valid = true;

  if (!credential.configured) {
    status = "missing-credential";
    valid = false;
  } else if (credential.error) {
    status = "invalid-credential";
    valid = false;
  } else if (!expectedEmail) {
    status = "missing-expected-email";
    valid = false;
  } else if (!credentialEmail || expectedNormalized !== credentialNormalized) {
    status = "email-mismatch";
    valid = false;
  }

  return {
    valid,
    status,
    expectedEmail,
    credentialEmail,
    match: Boolean(expectedNormalized && credentialNormalized && expectedNormalized === credentialNormalized),
    workerVariable: "M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL",
    credentialSource: "GOOGLE_SERVICE_ACCOUNT_JSON.client_email"
  };
}

function readCredentialSummary(raw) {
  if (!raw) {
    return { configured: false, email: "", error: "" };
  }

  let config = raw;

  if (typeof raw === "string") {
    try {
      config = JSON.parse(raw);
    } catch (error) {
      return { configured: true, email: "", error: "invalid-json" };
    }
  }

  if (!config || typeof config !== "object" || config.type !== "service_account") {
    return { configured: true, email: "", error: "not-service-account" };
  }

  return {
    configured: true,
    email: clean(config.client_email),
    error: config.client_email ? "" : "missing-client-email"
  };
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function clean(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}
