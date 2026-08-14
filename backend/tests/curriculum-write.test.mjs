import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/auth.js";
import worker from "../src/worker.js";

const subjectRows = [
  ["SubjectID", "SubjectName", "Active", "CreateDate", "CreatedByAdminID",
    "CreatedByAdminName", "ModifiedByAdminID", "ModifiedByAdminName", "ModifiedDate"],
  ["SUB1", "Aqidah", true, "2026-07-01T00:00:00.000Z"],
  ["SUB2", "Zakat", true, "2026-07-02T00:00:00.000Z"],
  ["SUBJ17", "", true, ""]
];
const moduleRows = [[
  "ModuleID", "ModuleName", "SubjectID", "SubjectName", "Sort Order", "Active",
  "CreatedDate", "classgroup", "CreatedByAdminID", "CreatedByAdminName",
  "ModifiedByAdminID", "ModifiedByAdminName", "ModifiedDate"
]];
const taskRows = [
  ["TaskID", "SubjectID", "TaskName", "AudioLink", "VisualLink", "VideoLink", "PDFLink", "Active", "CreateDate",
    "CreatedByAdminID", "CreatedByAdminName", "ModifiedByAdminID", "ModifiedByAdminName", "ModifiedDate"],
  ["TASK3", "SUB2", "Zakat C", "", "", "", "", true, "2026-07-03T00:00:00.000Z"],
  ["TASK2", "SUB1", "Lesson B", "audio-b", "", "", "pdf-b", true, "2026-07-02T00:00:00.000Z"],
  ["TASK1", "SUB1", "Lesson A", "", "visual-a", "", "", false, "2026-07-01T00:00:00.000Z"],
  ["TASK120", "", "", "", "", "", "", false, ""]
];
const subjectResourceRows = [
  ["ResourceID", "SubjectID", "ResourceName", "ResourceType", "ResourceLink", "Active", "CreateDate",
    "CreatedByAdminID", "CreatedByAdminName", "ModifiedByAdminID", "ModifiedByAdminName", "ModifiedDate"],
  ["RES3", "SUB2", "Zakat Guide", "PDF", "https://example.test/zakat", true, "2026-07-03T00:00:00.000Z"],
  ["RES2", "SUB1", "Book B", "PDF", "https://example.test/b", true, "2026-07-02T00:00:00.000Z"],
  ["RES1", "SUB1", "Book A", "LINK", "https://example.test/a", false, "2026-07-01T00:00:00.000Z"]
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
const auditRows = [[
  "AuditID", "DateStamp", "AdminID", "AdminName", "Role", "Action",
  "RecordType", "RecordID", "ChangedFields"
]];

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
    if (range === "ModuleList!A:ZZ") return response({ values: moduleRows });
    if (range === "TaskList!A:ZZ") return response({ values: taskRows });
    if (range === "SubjectResources!A:ZZ") return response({ values: subjectResourceRows });
    if (range === "AdminAuditLog!A1:I1") return response({ values: [auditRows[0]] });
  }

  if (method === "PUT") {
    return response({ updatedRange: range, updatedRows: body.values.length });
  }

  if (method === "POST" && append) {
    if (range === "ModuleList!A:M") moduleRows.push(...body.values);
    if (range === "AdminAuditLog!A:I") auditRows.push(...body.values);
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
  assert.equal(createdSubject.data.subject.subjectid, "SUBJ18");
  assert.equal(createdSubject.data.subject.subjectname, "Fiqh");
  assert.equal(createdSubject.data.subject.active, true);
  assert.match(createdSubject.data.subject.createdate, /^\d{4}-\d{2}-\d{2}T/);
  assertWrite("POST", "SubjectList!A:I", [[
    "SUBJ18",
    "Fiqh",
    true,
    createdSubject.data.subject.createdate
  ]]);
  assert.equal(writeRow("POST", "SubjectList!A:I")[4], "ADMIN1");
  assert.equal(writeRow("POST", "SubjectList!A:I")[5], "Admin User");

  const updatedSubject = await postCurriculum(
    "/api/admin/subjects/update",
    adminToken,
    { subjectid: "SUB2", subjectName: "Advanced Zakat", active: false },
    directEnv
  );
  assert.equal(updatedSubject.data.success, true);
  assert.equal(updatedSubject.data.subjectid, "SUB2");
  assertWrite("PUT", "SubjectList!A3:I3", [[
    "SUB2",
    "Advanced Zakat",
    false,
    "2026-07-02T00:00:00.000Z"
  ]]);
  assert.equal(writeRow("PUT", "SubjectList!A3:I3")[6], "ADMIN1");

  const writesBeforeDuplicateUpdate = writeRequests().length;
  const duplicateSubjectUpdate = await postCurriculum(
    "/api/admin/subjects/update",
    adminToken,
    { subjectid: "SUB2", subjectName: "Aqidah" },
    directEnv
  );
  assert.equal(duplicateSubjectUpdate.data.duplicate, true);
  assert.equal(writeRequests().length, writesBeforeDuplicateUpdate);

  const createdModule = await postCurriculum(
    "/api/admin/modules/create",
    adminToken,
    { subjectid: "SUB1", moduleName: "Belief Foundations" },
    directEnv
  );
  assert.equal(createdModule.data.success, true);
  assert.equal(createdModule.data.module.moduleid, "MOD1");
  assert.equal(createdModule.data.module.sortorder, 1);
  assertWrite("POST", "ModuleList!A:M", [[
    "MOD1", "Belief Foundations", "SUB1", "Aqidah", 1, true,
    createdModule.data.module.createddate, "ALL"
  ]]);
  assert.equal(writeRow("POST", "ModuleList!A:M")[8], "ADMIN1");
  assert.equal(writeRow("POST", "ModuleList!A:M")[9], "Admin User");

  const updatedModule = await postCurriculum(
    "/api/admin/modules/update",
    adminToken,
    {
      moduleid: "MOD1",
      subjectid: "SUB1",
      moduleName: "Core Beliefs",
      sortOrder: 2,
      active: false
    },
    directEnv
  );
  assert.equal(updatedModule.data.success, true);
  assertWrite("PUT", "ModuleList!A2:M2", [[
    "MOD1", "Core Beliefs", "SUB1", "Aqidah", 2, false,
    createdModule.data.module.createddate, "ALL"
  ]]);
  assert.equal(writeRow("PUT", "ModuleList!A2:M2")[10], "ADMIN1");

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
  assert.equal(createdTask.data.task.taskid, "TASK121");
  assertWrite("POST", "TaskList!A:N", [[
    "TASK121",
    "SUB2",
    "Lesson D",
    "audio-d",
    "visual-d",
    "",
    "pdf-d",
    true,
    createdTask.data.task.createdate
  ]]);
  assert.equal(writeRow("POST", "TaskList!A:N")[9], "ADMIN1");

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
  assertWrite("PUT", "TaskList!A4:N4", [[
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
  assert.equal(writeRow("PUT", "TaskList!A4:N4")[11], "ADMIN1");

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
  assert.equal(createdResource.data.resource.resourceid, "RES4");
  assert.equal(createdResource.data.resource.resourcetype, "AUDIO");
  assertWrite("POST", "SubjectResources!A:L", [[
    "RES4",
    "SUB2",
    "Zakat Audio",
    "AUDIO",
    "https://example.test/zakat-audio",
    true,
    createdResource.data.resource.createdate
  ]]);
  assert.equal(writeRow("POST", "SubjectResources!A:L")[7], "ADMIN1");

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
  assertWrite("PUT", "SubjectResources!A4:L4", [[
    "RES1",
    "SUB1",
    "Book A Revised",
    "PDF",
    "https://example.test/a-revised",
    true,
    "2026-07-01T00:00:00.000Z"
  ]]);
  assert.equal(writeRow("PUT", "SubjectResources!A4:L4")[9], "ADMIN1");

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
  assert.ok(auditRows.some(row => row[5] === "CREATE" && row[7] === "SUBJ18"));
  assert.ok(auditRows.some(row => row[5] === "UPDATE" && row[7] === "MOD1"));
  assert.ok(auditRows.some(row => row[5] === "UPDATE" && row[7] === "TASK1"));
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
    Array.isArray(request.body?.values) &&
    request.body.values.length === values.length &&
    request.body.values.every((row, index) => (
      JSON.stringify(row.slice(0, values[index].length)) === JSON.stringify(values[index])
    ))
  ));
  assert.ok(match, `Expected ${method} ${range} with ${JSON.stringify(values)}`);
}

function writeRow(method, range) {
  const match = requests.find(request => request.method === method && request.range === range);
  assert.ok(match, `Expected ${method} ${range}`);
  return match.body.values[0];
}

function assertDirectHeaders(responseValue, feature, _source) {
  assert.equal(responseValue.headers.get("X-M4L-Feature"), feature);
  assert.equal(responseValue.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(responseValue.headers.get("X-M4L-Backend-Source"), "fixed");
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
