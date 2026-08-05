import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/auth.js";
import worker from "../src/worker.js";

const subjectRows = [
  ["SubjectID", "SubjectName", "Active", "CreateDate"],
  ["SUB1", "Aqidah", true, "2026-07-01T00:00:00.000Z"],
  ["SUB2", "Zakat", true, "2026-07-02T00:00:00.000Z"]
];
const taskRows = [
  ["TaskID", "SubjectID", "TaskName", "AudioLink", "VisualLink", "VideoLink", "PDFLink", "Active", "CreateDate"],
  ["TASK3", "SUB2", "Zakat C", "", "", "", "", true, "2026-07-03T00:00:00.000Z"],
  ["TASK2", "SUB1", "Lesson B", "audio-b", "", "", "pdf-b", true, "2026-07-02T00:00:00.000Z"],
  ["TASK1", "SUB1", "Lesson A", "", "visual-a", "", "", false, "2026-07-01T00:00:00.000Z"]
];
const subjectResourceRows = [
  ["ResourceID", "SubjectID", "ResourceName", "ResourceType", "ResourceLink", "Active", "CreateDate"],
  ["RES3", "SUB2", "Zakat Guide", "PDF", "https://example.test/zakat", true, "2026-07-03T00:00:00.000Z"],
  ["RES2", "SUB1", "Book B", "PDF", "https://example.test/b", true, "2026-07-02T00:00:00.000Z"],
  ["RES1", "SUB1", "Book A", "LINK", "https://example.test/a", false, "2026-07-01T00:00:00.000Z"]
];
const systemConfigRows = [
  ["ConfigKey", "Value"],
  ["NextSubjectNumber", 10],
  ["NextTaskNumber", 20],
  ["NextResourceNumber", 30]
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
const sessionSecret = "curriculum-write-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "curriculum-write-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "curriculum-write-test@example.iam.gserviceaccount.com",
    private_key_id: "curriculum-write-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_CURRICULUM_WRITE: "google-sheets",
  M4L_BACKEND_CURRICULUM_RESOURCES_WRITE: "google-sheets"
};
const adminToken = await createSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Admin User",
  role: "ADMIN"
}, directEnv);
const teacherToken = await createSessionToken({
  type: "admin",
  adminid: "TEACHER1",
  username: "Teacher User",
  role: "TEACHER"
}, directEnv);
const originalFetch = globalThis.fetch;
const requests = [];

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-curriculum-write-token", expires_in: 3600 });
  }

  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected direct Curriculum write fetch: ${url}`);
  }

  assert.equal(init.headers.Authorization, "Bearer mock-curriculum-write-token");
  const encodedRange = url.pathname.split("/values/")[1] || "";
  const append = encodedRange.endsWith(":append");
  const range = decodeURIComponent(append ? encodedRange.slice(0, -7) : encodedRange);
  const method = String(init.method || "GET").toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;
  requests.push({ method, range, append, body });

  if (method === "GET") {
    if (range === "SubjectList!A:ZZ") return response({ values: subjectRows });
    if (range === "TaskList!A:ZZ") return response({ values: taskRows });
    if (range === "SubjectResources!A:ZZ") return response({ values: subjectResourceRows });
    if (range === "SystemConfig!A:B") return response({ values: systemConfigRows });
  }

  if (method === "PUT") {
    return response({ updatedRange: range, updatedRows: body.values.length });
  }

  if (method === "POST" && append) {
    return response({ updates: { updatedRange: range, updatedRows: body.values.length } });
  }

  throw new Error(`Unexpected direct Curriculum write request: ${method} ${range}`);
};

try {
  const forbidden = await postCurriculum(
    "/api/admin/subjects/create",
    teacherToken,
    { subjectName: "Forbidden Subject" },
    directEnv
  );
  assert.equal(forbidden.response.status, 403);
  assert.deepEqual(forbidden.data, { success: false, error: "Forbidden" });

  const requestCountBeforeDuplicate = requests.length;
  const duplicateSubject = await postCurriculum(
    "/api/admin/subjects/create",
    adminToken,
    { subjectName: "AQI-DAH" },
    directEnv
  );
  assert.equal(duplicateSubject.response.status, 200);
  assert.equal(duplicateSubject.data.duplicate, true);
  assert.equal(duplicateSubject.data.subject.subjectid, "SUB1");
  assert.equal(requests.length, requestCountBeforeDuplicate + 1);

  const createdSubject = await postCurriculum(
    "/api/admin/subjects/create",
    adminToken,
    { subjectName: "Fiqh" },
    directEnv
  );
  assertDirectHeaders(
    createdSubject.response,
    "curriculum-write",
    "M4L_BACKEND_CURRICULUM_WRITE"
  );
  assert.equal(createdSubject.data.success, true);
  assert.equal(createdSubject.data.subject.subjectid, "SUBJ10");
  assert.equal(createdSubject.data.subject.subjectname, "Fiqh");
  assert.equal(createdSubject.data.subject.active, true);
  assert.match(createdSubject.data.subject.createdate, /^\d{4}-\d{2}-\d{2}T/);
  assertWrite("PUT", "SystemConfig!B2", [[11]]);
  assertWrite("POST", "SubjectList!A:D", [[
    "SUBJ10",
    "Fiqh",
    true,
    createdSubject.data.subject.createdate
  ]]);

  const updatedSubject = await postCurriculum(
    "/api/admin/subjects/update",
    adminToken,
    { subjectid: "SUB2", subjectName: "Advanced Zakat", active: false },
    directEnv
  );
  assert.equal(updatedSubject.data.success, true);
  assert.equal(updatedSubject.data.subjectid, "SUB2");
  assertWrite("PUT", "SubjectList!A3:D3", [[
    "SUB2",
    "Advanced Zakat",
    false,
    "2026-07-02T00:00:00.000Z"
  ]]);

  const writesBeforeDuplicateUpdate = writeRequests().length;
  const duplicateSubjectUpdate = await postCurriculum(
    "/api/admin/subjects/update",
    adminToken,
    { subjectid: "SUB2", subjectName: "Aqidah" },
    directEnv
  );
  assert.equal(duplicateSubjectUpdate.data.duplicate, true);
  assert.equal(writeRequests().length, writesBeforeDuplicateUpdate);

  const duplicateTask = await postCurriculum(
    "/api/admin/tasks/create",
    adminToken,
    { subjectid: "SUB1", taskName: "Lesson B" },
    directEnv
  );
  assert.equal(duplicateTask.data.duplicate, true);
  assert.equal(duplicateTask.data.task.taskid, "TASK2");

  const createdTask = await postCurriculum(
    "/api/admin/tasks/create",
    adminToken,
    {
      subjectid: "SUB2",
      taskName: "Lesson D",
      audioLink: "audio-d",
      visualLink: "visual-d",
      videoLink: "",
      pdfLink: "pdf-d"
    },
    directEnv
  );
  assertDirectHeaders(
    createdTask.response,
    "curriculum-write",
    "M4L_BACKEND_CURRICULUM_WRITE"
  );
  assert.equal(createdTask.data.task.taskid, "TASK20");
  assertWrite("PUT", "SystemConfig!B3", [[21]]);
  assertWrite("POST", "TaskList!A:I", [[
    "TASK20",
    "SUB2",
    "Lesson D",
    "audio-d",
    "visual-d",
    "",
    "pdf-d",
    true,
    createdTask.data.task.createdate
  ]]);

  const updatedTask = await postCurriculum(
    "/api/admin/tasks/update",
    adminToken,
    {
      taskid: "TASK1",
      subjectid: "SUB2",
      taskName: "Lesson A2",
      audioLink: "audio-a2",
      active: true
    },
    directEnv
  );
  assert.equal(updatedTask.data.success, true);
  assertWrite("PUT", "TaskList!A4:I4", [[
    "TASK1",
    "SUB2",
    "Lesson A2",
    "audio-a2",
    "visual-a",
    "",
    "",
    true,
    "2026-07-01T00:00:00.000Z"
  ]]);

  const createdResource = await postCurriculum(
    "/api/admin/subject-resources/create",
    adminToken,
    {
      subjectid: "SUB2",
      resourceName: "Zakat Audio",
      resourceType: "audio",
      resourceLink: "https://example.test/zakat-audio"
    },
    directEnv
  );
  assertDirectHeaders(
    createdResource.response,
    "curriculum-resources-write",
    "M4L_BACKEND_CURRICULUM_RESOURCES_WRITE"
  );
  assert.equal(createdResource.data.resource.resourceid, "RES30");
  assert.equal(createdResource.data.resource.resourcetype, "AUDIO");
  assertWrite("PUT", "SystemConfig!B4", [[31]]);
  assertWrite("POST", "SubjectResources!A:G", [[
    "RES30",
    "SUB2",
    "Zakat Audio",
    "AUDIO",
    "https://example.test/zakat-audio",
    true,
    createdResource.data.resource.createdate
  ]]);

  const updatedResource = await postCurriculum(
    "/api/admin/subject-resources/update",
    adminToken,
    {
      resourceid: "RES1",
      resourceName: "Book A Revised",
      resourceType: "PDF",
      resourceLink: "https://example.test/a-revised",
      active: true
    },
    directEnv
  );
  assert.equal(updatedResource.data.success, true);
  assertWrite("PUT", "SubjectResources!A4:G4", [[
    "RES1",
    "SUB1",
    "Book A Revised",
    "PDF",
    "https://example.test/a-revised",
    true,
    "2026-07-01T00:00:00.000Z"
  ]]);

  const writesBeforeInvalidResource = writeRequests().length;
  const invalidResource = await postCurriculum(
    "/api/admin/subject-resources/create",
    adminToken,
    {
      subjectid: "SUB1",
      resourceName: "Invalid Resource",
      resourceType: "EXECUTABLE",
      resourceLink: "https://example.test/invalid"
    },
    directEnv
  );
  assert.equal(invalidResource.response.status, 400);
  assert.deepEqual(invalidResource.data, { success: false, error: "Invalid resourceType" });
  assert.equal(writeRequests().length, writesBeforeInvalidResource);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct Curriculum write tests passed.");

function writeRequests() {
  return requests.filter(request => request.method === "PUT" || request.method === "POST");
}

function assertWrite(method, range, values) {
  const match = requests.find(request => (
    request.method === method &&
    request.range === range &&
    JSON.stringify(request.body?.values) === JSON.stringify(values)
  ));
  assert.ok(match, `Expected ${method} ${range} with ${JSON.stringify(values)}`);
}

function assertDirectHeaders(responseValue, feature, source) {
  assert.equal(responseValue.headers.get("X-M4L-Feature"), feature);
  assert.equal(responseValue.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(responseValue.headers.get("X-M4L-Backend-Source"), source);
}

async function postCurriculum(path, token, body, env) {
  const responseValue = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }), env);

  return {
    response: responseValue,
    data: await responseValue.json()
  };
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}
