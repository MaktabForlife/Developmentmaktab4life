import { json } from "./http.js";

export async function createSessionToken(payload, env) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const body = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24 * 7
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedBody = base64url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;
  const signature = await sign(data, env.SESSION_SECRET);

  return `${data}.${signature}`;
}

export async function verifySessionToken(token, env) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  const data = `${header}.${body}`;
  const expectedSignature = await sign(data, env.SESSION_SECRET);

  if (signature !== expectedSignature) {
    return null;
  }

  const payload = JSON.parse(
    atob(body.replace(/-/g, "+").replace(/_/g, "/"))
  );

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

async function sign(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );

  return [...new Uint8Array(signature)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64url(input) {
  return btoa(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}


export async function requireAdminOrSenior(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  if (authUser.role !== "ADMIN" && authUser.role !== "SENIOR") {
    return {
      ok: false,
      response: json({ success: false, error: "Forbidden" }, 403)
    };
  }

  return {
    ok: true,
    user: authUser
  };
}



export async function getAuthUser(request, env) {
  const auth = request.headers.get("Authorization");

  if (!auth || !auth.startsWith("Bearer ")) {
    return null;
  }

  const token = auth.replace("Bearer ", "").trim();
  return verifySessionToken(token, env);
}




export async function hashPin(pin, secret) {
  const data = new TextEncoder().encode(pin + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return [...new Uint8Array(hashBuffer)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeWhatsapp6(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "999999";
  }

  return digits.slice(-6).padStart(6, "0");
}

