/* M4L v96.1 - Reusable direct Google Sheets client.
   Keeps service-account authentication, token caching and generic Sheets value
   operations independent from feature-specific Worker routes.
*/

let accessTokenCache = {
  key: "",
  token: "",
  expiresAt: 0
};
let accessTokenPromise = null;

export async function readGoogleSheetValues(env, range) {
  const result = await callGoogleSheetsValuesApi(env, range, {
    method: "GET",
    query: {
      majorDimension: "ROWS"
    }
  });

  return Array.isArray(result.values) ? result.values : [];
}

export async function updateGoogleSheetValues(env, range, values) {
  return callGoogleSheetsValuesApi(env, range, {
    method: "PUT",
    query: {
      valueInputOption: "RAW"
    },
    body: {
      range,
      majorDimension: "ROWS",
      values
    }
  });
}

export async function appendGoogleSheetValues(env, range, values) {
  return callGoogleSheetsValuesApi(env, range, {
    method: "POST",
    action: "append",
    query: {
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS"
    },
    body: {
      range,
      majorDimension: "ROWS",
      values
    }
  });
}

export async function batchUpdateGoogleSheetValues(env, data) {
  const spreadsheetId = String(env.GOOGLE_SPREADSHEET_ID || "").trim();

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SPREADSHEET_ID Worker variable");
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Google Sheets batch update requires at least one range");
  }

  const accessToken = await getGoogleSheetsAccessToken(env);
  const url = [
    "https://sheets.googleapis.com/v4/spreadsheets/",
    encodeURIComponent(spreadsheetId),
    "/values:batchUpdate"
  ].join("");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json;charset=UTF-8"
    },
    body: JSON.stringify({
      valueInputOption: "RAW",
      data
    })
  });

  return parseGoogleSheetsResponse(response);
}

function getGoogleServiceAccountConfig(env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON Worker secret");
  }

  let config = raw;

  if (typeof raw === "string") {
    try {
      config = JSON.parse(raw);
    } catch (error) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
  }

  if (!config || config.type !== "service_account") {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must be a service-account credential");
  }

  if (!config.client_email || !config.private_key) {
    throw new Error("Google service-account credential is incomplete");
  }

  const tokenUri = String(config.token_uri || "https://oauth2.googleapis.com/token").trim();
  const allowedTokenUris = new Set([
    "https://oauth2.googleapis.com/token",
    "https://accounts.google.com/o/oauth2/token"
  ]);

  if (!allowedTokenUris.has(tokenUri)) {
    throw new Error("Google service-account token URI is not allowed");
  }

  return {
    ...config,
    token_uri: tokenUri,
    private_key: String(config.private_key).replace(/\\n/g, "\n")
  };
}

async function getGoogleSheetsAccessToken(env) {
  const config = getGoogleServiceAccountConfig(env);
  const cacheKey = `${config.client_email}|${config.private_key_id || ""}`;
  const nowMs = Date.now();

  if (
    accessTokenCache.key === cacheKey &&
    accessTokenCache.token &&
    accessTokenCache.expiresAt > nowMs + 60000
  ) {
    return accessTokenCache.token;
  }

  if (accessTokenPromise) {
    const pendingResult = await accessTokenPromise;
    return pendingResult.accessToken;
  }

  accessTokenPromise = requestGoogleSheetsAccessToken(config).finally(() => {
    accessTokenPromise = null;
  });

  const tokenResult = await accessTokenPromise;
  accessTokenCache = {
    key: cacheKey,
    token: tokenResult.accessToken,
    expiresAt: nowMs + Math.max(300, tokenResult.expiresIn - 60) * 1000
  };

  return tokenResult.accessToken;
}

async function requestGoogleSheetsAccessToken(config) {
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64urlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedClaims = base64urlText(JSON.stringify({
    iss: config.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: config.token_uri,
    iat: now,
    exp: now + 3600
  }));
  const unsignedJwt = `${encodedHeader}.${encodedClaims}`;
  const privateKey = await importGoogleServiceAccountPrivateKey(config.private_key);
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    new TextEncoder().encode(unsignedJwt)
  );
  const assertion = `${unsignedJwt}.${base64urlBytes(new Uint8Array(signature))}`;
  const response = await fetch(config.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    }).toString()
  });
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Google OAuth returned invalid JSON (HTTP ${response.status})`);
  }

  if (!response.ok || !data.access_token) {
    const message = data.error_description || data.error || "Access token request failed";
    throw new Error(`Google OAuth error ${response.status}: ${String(message).slice(0, 240)}`);
  }

  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in || 3600)
  };
}

async function importGoogleServiceAccountPrivateKey(pem) {
  const base64 = String(pem || "")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  if (!base64) {
    throw new Error("Google service-account private key is empty");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function base64urlText(input) {
  return btoa(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlBytes(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function callGoogleSheetsValuesApi(env, range, options = {}) {
  const spreadsheetId = String(env.GOOGLE_SPREADSHEET_ID || "").trim();

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SPREADSHEET_ID Worker variable");
  }

  const accessToken = await getGoogleSheetsAccessToken(env);
  const query = new URLSearchParams(options.query || {});
  const queryText = query.toString();
  const actionSuffix = options.action === "append" ? ":append" : "";
  const url = [
    "https://sheets.googleapis.com/v4/spreadsheets/",
    encodeURIComponent(spreadsheetId),
    "/values/",
    encodeURIComponent(range),
    actionSuffix,
    queryText ? `?${queryText}` : ""
  ].join("");
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json;charset=UTF-8"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  return parseGoogleSheetsResponse(response);
}

async function parseGoogleSheetsResponse(response) {
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Google Sheets returned invalid JSON (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : "Google Sheets request failed";
    throw new Error(`Google Sheets API error ${response.status}: ${String(message).slice(0, 240)}`);
  }

  return data;
}
