export async function onRequestGet(context) {
  const encoded = context.params.encoded;

  if (!encoded) {
    return new Response("Missing encoded URL", { status: 400 });
  }

  let targetUrlRaw;

  try {
    targetUrlRaw = base64UrlDecode(encoded);
  } catch (err) {
    return new Response("Invalid encoded URL", { status: 400 });
  }

  let targetUrl;

  try {
    targetUrl = new URL(targetUrlRaw);
  } catch (err) {
    return new Response("Invalid target URL", { status: 400 });
  }

  if (targetUrl.protocol !== "https:") {
    return new Response("Only https URLs are allowed", { status: 400 });
  }

  const hostname = targetUrl.hostname.toLowerCase();

  const allowed =
    hostname.endsWith(".r2.dev") ||
    hostname === "drive.google.com" ||
    hostname === "docs.google.com" ||
    hostname === "lh3.googleusercontent.com";

  if (!allowed) {
    return new Response("PDF host not allowed", { status: 403 });
  }

  targetUrl = normaliseGoogleDriveUrl(targetUrl);

  const upstreamHeaders = new Headers();

  const range = context.request.headers.get("Range");
  if (range) {
    upstreamHeaders.set("Range", range);
  }

  const upstreamResponse = await fetch(targetUrl.toString(), {
    method: "GET",
    headers: upstreamHeaders
  });

  const responseHeaders = new Headers(upstreamResponse.headers);

  responseHeaders.set("Content-Type", "application/pdf");
  responseHeaders.set("Content-Disposition", "inline; filename=\"resource.pdf\"");
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Cache-Control", "public, max-age=3600");
  responseHeaders.set("Accept-Ranges", "bytes");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders
  });
}

function base64UrlDecode(input) {
  let base64 = String(input || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (base64.length % 4) {
    base64 += "=";
  }

  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function normaliseGoogleDriveUrl(url) {
  const hostname = url.hostname.toLowerCase();

  if (hostname !== "drive.google.com" && hostname !== "docs.google.com") {
    return url;
  }

  const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
  if (fileMatch && fileMatch[1]) {
    return new URL(`https://drive.google.com/uc?export=download&id=${fileMatch[1]}`);
  }

  const openId = url.searchParams.get("id");
  if (openId) {
    return new URL(`https://drive.google.com/uc?export=download&id=${openId}`);
  }

  return url;
}