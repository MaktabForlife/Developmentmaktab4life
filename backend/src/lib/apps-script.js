export async function callAppsScript(env, payload) {
  if (!env.APPS_SCRIPT_URL) {
    throw new Error("Missing APPS_SCRIPT_URL environment variable");
  }

  const response = await fetch(env.APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(
      "Apps Script returned non-JSON response. HTTP " +
      response.status +
      ". First 200 chars: " +
      text.slice(0, 200)
    );
  }

  if (!response.ok) {
    throw new Error(
      "Apps Script HTTP error " +
      response.status +
      ": " +
      JSON.stringify(data).slice(0, 200)
    );
  }

  return data;
}

