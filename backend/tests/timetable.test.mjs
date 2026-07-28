import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { buildTimetableResponse } from "../src/routes/timetable.js";

const timetableRows = [
  [
    "SessionID",
    "SubjectID",
    "SubjectName",
    "DayofWeek",
    "StartTime",
    "ZoomLink",
    "GroupNo",
    "AssignedTeacher"
  ],
  ["S1", "SUB1", "Quran", "Monday", "09:00", "https://zoom.test/global", "ALL", "ALL"],
  ["S2", "SUB2", "Fiqh", "Tuesday", "10:00", "", "1", "Teacher A"],
  ["S3", "SUB3", "Hadith", "Wednesday", "11:00", "", "1", "Teacher C"],
  ["S4", "SUB4", "History", "Thursday", "12:00", "", "2", "Teacher B"],
  ["S5", "SUB5", "", "Friday", "13:00", "", "1", "Teacher A"]
];

const transformed = buildTimetableResponse(timetableRows, {
  groupNo: " 1 ",
  assignedTeacher: "Teacher A"
});

assert.deepEqual(transformed, {
  success: true,
  sessions: [
    {
      row: 2,
      sessionid: "S1",
      subjectid: "SUB1",
      subjectname: "Quran",
      dayofweek: "Monday",
      starttime: "09:00",
      zoomlink: "https://zoom.test/global",
      groupno: "ALL",
      assignedteacher: "ALL"
    },
    {
      row: 3,
      sessionid: "S2",
      subjectid: "SUB2",
      subjectname: "Fiqh",
      dayofweek: "Tuesday",
      starttime: "10:00",
      zoomlink: "",
      groupno: "1",
      assignedteacher: "Teacher A"
    }
  ],
  zoomlink: "https://zoom.test/global",
  groupno: "1",
  assignedteacher: "Teacher A",
  count: 2
});

assert.deepEqual(buildTimetableResponse([]), {
  success: true,
  sessions: [],
  zoomlink: "",
  count: 0
});

assert.deepEqual(
  buildTimetableResponse([
    ["SubjectName", "DayofWeek"],
    ["Quran", "Monday"]
  ]),
  {
    success: false,
    error: "TimeTable sheet must include SubjectName, DayofWeek and StartTime columns",
    sessions: [],
    zoomlink: ""
  }
);

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
const sessionSecret = "timetable-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "timetable-test@example.iam.gserviceaccount.com",
    private_key_id: "timetable-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_TIMETABLE_READ: "google-sheets",
  M4L_BACKEND_TIMETABLE_WRITE: "google-sheets"
};
const studentToken = await makeSessionToken({
  type: "student",
  studentid: "STUDENT1",
  classgroup: "1"
}, sessionSecret);
const teacherToken = await makeSessionToken({
  type: "admin",
  username: "Teacher A",
  role: "TEACHER",
  assignedgroup: "1"
}, sessionSecret);
const seniorToken = await makeSessionToken({
  type: "admin",
  username: "Senior Admin",
  role: "SENIOR"
}, sessionSecret);
const originalFetch = globalThis.fetch;
const requestedRanges = [];
const sheetUpdates = [];
let missingSheet = false;
let directRows = timetableRows;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-timetable-token", expires_in: 3600 });
  }

  if (url.hostname === "sheets.googleapis.com") {
    assert.equal(init.headers.Authorization, "Bearer mock-timetable-token");
    const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");

    if (missingSheet) {
      return response({
        error: { message: "Unable to parse range: TimeTable!A:ZZ" }
      }, 400);
    }

    if ((init.method || "GET") === "PUT") {
      sheetUpdates.push({ range, body: JSON.parse(init.body) });
      return response({ updatedRows: 1 });
    }

    requestedRanges.push(range);
    return response({ values: directRows });
  }

  throw new Error(`Unexpected direct-timetable fetch: ${url}`);
};

try {
  const unauthorized = await worker.fetch(new Request(
    "https://worker.test/api/timetable/get",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
  ), directEnv);
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("X-M4L-Feature"), "timetable-read");
  assert.equal(unauthorized.headers.get("X-M4L-Backend"), "google-sheets");

  const studentResult = await postTimetable(
    "/api/student/timetable/get",
    studentToken,
    { groupNo: "2", assignedTeacher: "Teacher B" },
    directEnv
  );
  assert.equal(studentResult.response.status, 200);
  assert.equal(studentResult.response.headers.get("X-M4L-Feature"), "timetable-read");
  assert.equal(studentResult.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    studentResult.response.headers.get("X-M4L-Backend-Source"),
    "M4L_BACKEND_TIMETABLE_READ"
  );
  assert.equal(studentResult.data.groupno, "1", "Student reads must use the authenticated group");
  assert.equal(studentResult.data.assignedteacher, "ALL");
  assert.deepEqual(
    studentResult.data.sessions.map(session => session.sessionid),
    ["S1", "S2", "S3"]
  );

  const teacherResult = await postTimetable(
    "/api/admin/timetable/get",
    teacherToken,
    { groupNo: "2", assignedTeacher: "Teacher B" },
    directEnv
  );
  assert.equal(teacherResult.data.groupno, "1", "Teacher reads must use the assigned group");
  assert.equal(
    teacherResult.data.assignedteacher,
    "Teacher A",
    "Teacher reads must use the authenticated teacher name"
  );
  assert.deepEqual(
    teacherResult.data.sessions.map(session => session.sessionid),
    ["S1", "S2"]
  );

  missingSheet = true;
  const missingResult = await postTimetable(
    "/api/timetable/get",
    studentToken,
    {},
    directEnv
  );
  assert.deepEqual(missingResult.data, {
    success: false,
    error: "TimeTable sheet not found",
    sessions: [],
    zoomlink: ""
  });
  assert.deepEqual(new Set(requestedRanges), new Set(["TimeTable!A:ZZ"]));

  missingSheet = false;
  directRows = timetableRows.map(row => row.slice());
  sheetUpdates.length = 0;

  const directZoomWrite = await postTimetable(
    "/api/admin/timetable/update-zoom",
    seniorToken,
    { zoomlink: "https://zoom.test/direct" },
    directEnv
  );
  assert.equal(directZoomWrite.response.status, 200);
  assert.equal(directZoomWrite.response.headers.get("X-M4L-Feature"), "timetable-write");
  assert.equal(directZoomWrite.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    directZoomWrite.response.headers.get("X-M4L-Backend-Source"),
    "M4L_BACKEND_TIMETABLE_WRITE"
  );
  assert.equal(directZoomWrite.data.success, true);
  assert.equal(directZoomWrite.data.zoomlink, "https://zoom.test/direct");
  assert.equal(directZoomWrite.data.message, "Zoom link saved");
  assert.deepEqual(sheetUpdates, [{
    range: "TimeTable!F2",
    body: {
      range: "TimeTable!F2",
      majorDimension: "ROWS",
      values: [["https://zoom.test/direct"]]
    }
  }]);

  directRows = timetableRows.map(row => row.filter((value, index) => index !== 5));
  sheetUpdates.length = 0;

  const missingHeaderWrite = await postTimetable(
    "/api/admin/timetable/update-zoom",
    seniorToken,
    { zoomLink: "https://zoom.test/header-created" },
    directEnv
  );
  assert.equal(missingHeaderWrite.data.success, true);
  assert.equal(missingHeaderWrite.data.zoomlink, "https://zoom.test/header-created");
  assert.deepEqual(sheetUpdates, [
    {
      range: "TimeTable!H1",
      body: {
        range: "TimeTable!H1",
        majorDimension: "ROWS",
        values: [["ZoomLink"]]
      }
    },
    {
      range: "TimeTable!H2",
      body: {
        range: "TimeTable!H2",
        majorDimension: "ROWS",
        values: [["https://zoom.test/header-created"]]
      }
    }
  ]);
} finally {
  globalThis.fetch = originalFetch;
}

let appsScriptPayload = null;
globalThis.fetch = async (input, init = {}) => {
  assert.equal(String(input), "https://script.example.test/exec");
  appsScriptPayload = JSON.parse(init.body);
  return response({ success: true, sessions: [], zoomlink: "", count: 0 });
};

try {
  const legacyRead = await postTimetable(
    "/api/timetable/get",
    studentToken,
    { groupNo: "2", assignedTeacher: "Teacher B" },
    {
      SESSION_SECRET: sessionSecret,
      APPS_SCRIPT_URL: "https://script.example.test/exec"
    }
  );

  assert.equal(legacyRead.response.headers.get("X-M4L-Feature"), "timetable-read");
  assert.equal(legacyRead.response.headers.get("X-M4L-Backend"), "apps-script");
  assert.equal(legacyRead.response.headers.get("X-M4L-Backend-Source"), "default");
  assert.deepEqual(appsScriptPayload, {
    action: "getTimetable",
    data: {
      groupNo: "1",
      assignedTeacher: "ALL",
      userType: "student",
      role: ""
    }
  });

  appsScriptPayload = null;
  const zoomWrite = await worker.fetch(new Request(
    "https://worker.test/api/admin/timetable/update-zoom",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${seniorToken}`
      },
      body: JSON.stringify({ zoomlink: "https://zoom.test/new" })
    }
  ), {
    SESSION_SECRET: sessionSecret,
    APPS_SCRIPT_URL: "https://script.example.test/exec",
    M4L_BACKEND_TIMETABLE_READ: "google-sheets"
  });

  assert.equal(zoomWrite.status, 200);
  assert.equal(zoomWrite.headers.get("X-M4L-Feature"), "timetable-write");
  assert.equal(zoomWrite.headers.get("X-M4L-Backend"), "apps-script");
  assert.equal(zoomWrite.headers.get("X-M4L-Backend-Source"), "default");
  assert.deepEqual(appsScriptPayload, {
    action: "updateTimetableZoomLink",
    data: {
      zoomlink: "https://zoom.test/new",
      updatedBy: "Senior Admin",
      groupNo: "ALL",
      assignedTeacher: "ALL"
    }
  });
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct TimeTable read/write tests passed.");

async function postTimetable(path, token, body, env) {
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
