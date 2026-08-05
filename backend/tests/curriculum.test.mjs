import assert from "node:assert/strict";
import worker from "../src/worker.js";

const subjectRows = [
  ["SubjectID", "SubjectName", "Active", "CreateDate"],
  ["SUB2", "Zakat", "FALSE", "2026-07-02T00:00:00.000Z"],
  ["SUB1", "Aqidah", true, "2026-07-01T00:00:00.000Z"]
];
const taskRows = [
  ["TaskID", "SubjectID", "TaskName", "AudioLink", "VisualLink", "VideoLink", "PDFLink", "Active", "CreateDate"],
  ["TASK3", "SUB2", "Zakat C", "", "", "", "", true, "2026-07-03T00:00:00.000Z"],
  ["TASK2", "SUB1", "Lesson B", "audio-b", "", "", "pdf-b", "TRUE", "2026-07-02T00:00:00.000Z"],
  ["TASK1", "SUB1", "Lesson A", "", "visual-a", "", "", false, "2026-07-01T00:00:00.000Z"]
];
const subjectResourceRows = [
  ["ResourceID", "SubjectID", "ResourceName", "ResourceType", "ResourceLink", "Active", "CreateDate"],
  ["RES3", "SUB2", "Zakat Guide", "PDF", "https://example.test/zakat", true, "2026-07-03T00:00:00.000Z"],
  ["RES2", "SUB1", "Book B", "PDF", "https://example.test/b", "TRUE", "2026-07-02T00:00:00.000Z"],
  ["RES1", "SUB1", "Book A", "LINK", "https://example.test/a", "FALSE", "2026-07-01T00:00:00.000Z"]
];

const keyPair = await crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256"
  },
  true,
  ["sign", "verify"]
);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const sessionSecret = "curriculum-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "curriculum-test@example.iam.gserviceaccount.com",
    private_key_id: "curriculum-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_CURRICULUM_READ: "google-sheets",
  M4L_BACKEND_CURRICULUM_RESOURCES_READ: "google-sheets"
};
const adminToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Admin User",
  role: "ADMIN"
}, sessionSecret);
const originalFetch = globalThis.fetch;
const requestedRanges = [];
let missingSheetName = "";

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-curriculum-token", expires_in: 3600 });
  }

  if (url.hostname === "sheets.googleapis.com") {
    assert.equal(init.headers.Authorization, "Bearer mock-curriculum-token");
    const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
    requestedRanges.push(range);

    if (missingSheetName && range.startsWith(`${missingSheetName}!`)) {
      return response({ error: { message: `Unable to parse range: ${range}` } }, 400);
    }

    if (range === "SubjectList!A:ZZ") {
      return response({ values: subjectRows });
    }

    if (range === "TaskList!A:ZZ") {
      return response({ values: taskRows });
    }

    if (range === "SubjectResources!A:ZZ") {
      return response({ values: subjectResourceRows });
    }

    throw new Error(`Unexpected curriculum range: ${range}`);
  }

  throw new Error(`Unexpected direct-curriculum fetch: ${url}`);
};

try {
  const subjects = await postCurriculum(
    "/api/admin/subjects/list",
    adminToken,
    {},
    directEnv
  );
  assert.equal(subjects.response.status, 200);
  assert.equal(subjects.response.headers.get("X-M4L-Feature"), "curriculum-read");
  assert.equal(subjects.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    subjects.response.headers.get("X-M4L-Backend-Source"),
    "M4L_BACKEND_CURRICULUM_READ"
  );
  assert.deepEqual(subjects.data, {
    success: true,
    count: 2,
    subjects: [
      {
        subjectid: "SUB1",
        subjectname: "Aqidah",
        active: true,
        createdate: "2026-07-01T00:00:00.000Z"
      },
      {
        subjectid: "SUB2",
        subjectname: "Zakat",
        active: false,
        createdate: "2026-07-02T00:00:00.000Z"
      }
    ]
  });

  const tasks = await postCurriculum(
    "/api/admin/tasks/list",
    adminToken,
    { subjectid: "SUB1", activeOnly: true },
    directEnv
  );
  assert.equal(tasks.response.headers.get("X-M4L-Feature"), "curriculum-read");
  assert.equal(tasks.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(tasks.data.subjectid, "SUB1");
  assert.equal(tasks.data.count, 1);
  assert.deepEqual(tasks.data.tasks[0], {
    taskid: "TASK2",
    subjectid: "SUB1",
    taskname: "Lesson B",
    audiolink: "audio-b",
    visuallink: "",
    videolink: "",
    pdflink: "pdf-b",
    active: true,
    createdate: "2026-07-02T00:00:00.000Z"
  });

  const resources = await postCurriculum(
    "/api/admin/subject-resources/list",
    adminToken,
    { subjectid: "SUB1" },
    directEnv
  );
  assert.equal(resources.response.headers.get("X-M4L-Feature"), "curriculum-resources-read");
  assert.equal(resources.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    resources.response.headers.get("X-M4L-Backend-Source"),
    "M4L_BACKEND_CURRICULUM_RESOURCES_READ"
  );
  assert.equal(resources.data.subjectid, "SUB1");
  assert.deepEqual(
    resources.data.resources.map(resource => ({
      resourceid: resource.resourceid,
      resourcename: resource.resourcename,
      active: resource.active
    })),
    [
      { resourceid: "RES1", resourcename: "Book A", active: false },
      { resourceid: "RES2", resourcename: "Book B", active: true }
    ]
  );

  missingSheetName = "SubjectResources";
  const missingResources = await postCurriculum(
    "/api/admin/subject-resources/list",
    adminToken,
    { subjectid: "ALL" },
    directEnv
  );
  assert.deepEqual(missingResources.data, {
    success: false,
    error: "SubjectResources sheet not found"
  });
  assert.deepEqual(
    new Set(requestedRanges),
    new Set(["SubjectList!A:ZZ", "TaskList!A:ZZ", "SubjectResources!A:ZZ"])
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct Curriculum read tests passed.");

async function postCurriculum(path, token, body, env) {
  const response = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }), env);

  return {
    response,
    data: await response.json()
  };
}

async function makeSessionToken(payload, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + 3600 }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  );
  const hex = Array.from(signature)
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
  return `${data}.${hex}`;
}

function base64url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  const lines = base64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
