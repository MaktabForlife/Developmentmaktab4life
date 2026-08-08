/* M4L V100.6 - Private Google Drive read client.
   Uses the existing service-account credential with drive.readonly scope.
*/

import { assertGoogleServiceAccountEmailMatches } from "./google-service-account-email.js";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

let driveAccessTokenCache = {
  key: "",
  token: "",
  expiresAt: 0
};
let driveAccessTokenPromise = null;

export const GOOGLE_DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
export const GOOGLE_DRIVE_NATIVE_PREFIX = "application/vnd.google-apps.";

export async function listGoogleDriveFolder(env, folderId, options = {}) {
  const cleanFolderId = requireDriveId(folderId, "folder ID");
  const query = new URLSearchParams({
    q: `'${escapeDriveQueryValue(cleanFolderId)}' in parents and trashed = false`,
    spaces: "drive",
    corpora: "user",
    orderBy: "folder,name_natural",
    pageSize: String(Math.min(1000, Math.max(1, Number(options.pageSize || 500)))),
    fields: "nextPageToken,incompleteSearch,files(id,name,mimeType,size,parents,trashed,modifiedTime,capabilities(canDownload))"
  });

  if (options.pageToken) {
    query.set("pageToken", String(options.pageToken));
  }

  return callGoogleDriveJson(env, `/files?${query.toString()}`);
}

export async function getGoogleDriveFileMetadata(env, fileId) {
  const cleanFileId = requireDriveId(fileId, "file ID");
  const query = new URLSearchParams({
    fields: "id,name,mimeType,size,parents,trashed,modifiedTime,capabilities(canDownload)"
  });

  return callGoogleDriveJson(
    env,
    `/files/${encodeURIComponent(cleanFileId)}?${query.toString()}`
  );
}

export async function downloadGoogleDriveFile(env, fileId, options = {}) {
  const cleanFileId = requireDriveId(fileId, "file ID");
  const accessToken = await getGoogleDriveAccessToken(env);
  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`
  });

  if (options.range) {
    headers.set("Range", String(options.range));
  }

  return fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(cleanFileId)}?alt=media`,
    {
      method: options.method === "HEAD" ? "GET" : "GET",
      headers,
      cache: "no-store"
    }
  );
}

export function isGoogleDriveNativeMimeType(mimeType) {
  const value = String(mimeType || "").trim().toLowerCase();
  return value.startsWith(GOOGLE_DRIVE_NATIVE_PREFIX) && value !== GOOGLE_DRIVE_FOLDER_MIME;
}

async function callGoogleDriveJson(env, path) {
  const accessToken = await getGoogleDriveAccessToken(env);
  const response = await fetch(`${DRIVE_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Google Drive returned invalid JSON (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : "Google Drive request failed";
    throw new Error(`Google Drive API error ${response.status}: ${String(message).slice(0, 240)}`);
  }

  return data;
}

async function getGoogleDriveAccessToken(env) {
  const config = getGoogleServiceAccountConfig(env);
  const cacheKey = `${config.client_email}|${config.private_key_id || ""}|${DRIVE_SCOPE}`;
  const nowMs = Date.now();

  if (
    driveAccessTokenCache.key === cacheKey &&
    driveAccessTokenCache.token &&
    driveAccessTokenCache.expiresAt > nowMs + 60000
  ) {
    return driveAccessTokenCache.token;
  }

  if (driveAccessTokenPromise) {
    const pending = await driveAccessTokenPromise;
    return pending.accessToken;
  }

  driveAccessTokenPromise = requestGoogleAccessToken(config).finally(() => {
    driveAccessTokenPromise = null;
  });

  const result = await driveAccessTokenPromise;
  driveAccessTokenCache = {
    key: cacheKey,
    token: result.accessToken,
    expiresAt: nowMs + Math.max(300, result.expiresIn - 60) * 1000
  };

  return result.accessToken;
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

  assertGoogleServiceAccountEmailMatches(env, config.client_email);

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

async function requestGoogleAccessToken(config) {
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64urlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedClaims = base64urlText(JSON.stringify({
    iss: config.client_email,
    scope: DRIVE_SCOPE,
    aud: config.token_uri,
    iat: now,
    exp: now + 3600
  }));
  const unsignedJwt = `${encodedHeader}.${encodedClaims}`;
  const privateKey = await importPrivateKey(config.private_key);
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
    }).toString(),
    cache: "no-store"
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

async function importPrivateKey(pem) {
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

function requireDriveId(value, label) {
  const id = String(value || "").trim();

  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid Google Drive ${label}`);
  }

  return id;
}

function escapeDriveQueryValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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
