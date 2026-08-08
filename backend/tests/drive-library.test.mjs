import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { createSaltedPinHash, createSessionToken } from "../src/lib/auth.js";

const pinSecret = "drive-library-pin-secret";
const sessionSecret = "drive-library-session-secret";
const adminHash = await createSaltedPinHash("1234", pinSecret);
const studentFourHash = await createSaltedPinHash("2222", pinSecret);
const studentThreeHash = await createSaltedPinHash("3333", pinSecret);
const adminRows = [[
  "AdminID", "Username", "UniqueID", "PinSetup", "PinHash", "Role",
  "AssignedGroup", "Active", "CreateDate", "LastLogin"
], ["ADMIN1", "Main Admin", "MAINLINK", true, adminHash, "ADMIN", "ALL", true, "", ""]];
const studentRows = [[
  "StudentID", "Username", "WhatsApp", "UniqueID", "PinSetup", "PinHash",
  "ClassGroup", "CreatedDate", "LastLogin", "TaskCount", "Active"
],
["STUDENT4", "Group Four", "", "STUDENT4LINK", true, studentFourHash, "4", "", "", 0, true],
["STUDENT3", "Group Three", "", "STUDENT3LINK", true, studentThreeHash, "3", "", "", 0, true]];
const subjectRows = [["SubjectID", "SubjectName", "Active", "CreatedDate"], ["SUB1", "Fiqh", true, ""]];
const moduleRows = [
  ["ModuleID", "SubjectID", "SubjectName", "ModuleName", "Sort Order", "Active"],
  ["MOD2", "SUB1", "Fiqh", "Module Two", 2, true],
  ["MOD1", "SUB1", "Fiqh", "Module One from ModuleList", 1, true],
  ["MOD3", "SUB1", "Fiqh", "Module Three No Tasks", 3, true],
  ["MODX", "SUB1", "Fiqh", "Inactive Module", 0, false]
];
const taskRows = [
  ["TaskID", "SubjectID", "TaskName", "ModuleID", "ModuleName", "Active"],
  ["TASK1", "SUB1", "Lesson 1", "MOD1", "Wrong TaskList Module Name", true],
  ["TASK2", "SUB1", "Lesson 2", "MOD2", "Wrong TaskList Module Two", true],
  ["TASKX", "SUB1", "Inactive module task", "MODX", "Inactive Module", true]
];
const ebookRows = [[
  "eBookId", "eBookName", "SubjectId", "SubjectName", "ModuleId", "ModuleName",
  "TaskId", "GroupNo", "ebookFormat", "eBookLink", "Active", "Date"
]];
const printableRows = [["PrintableId", "PrintableName", "SubjectId", "SubjectName", "ModuleId", "ModuleName", "TaskId", "GroupNo", "PrintableFormat", "PrintableLink", "Active", "Date"]];
const audioRows = [["AudioId", "AudioName", "SubjectId", "SubjectName", "ModuleId", "ModuleName", "TaskId", "GroupNo", "AudioFormat", "AudioLink", "Active", "Date"]];
const videoRows = [["VideoId", "VideoName", "SubjectId", "SubjectName", "ModuleId", "ModuleName", "TaskId", "GroupNo", "VideoFormat", "VideoLink", "Active", "Date"]];
const otherRows = [["OtherResourceID", "OtherResourceName", "SubjectId", "SubjectName", "ModuleId", "ModuleName", "TaskId", "GroupNo", "OtherResourceFormat", "OtherResourceLink", "Active", "Date"]];
const sheets = new Map([
  ["AdminRecords!A:ZZ", adminRows],
  ["StudentRecords!A:ZZ", studentRows],
  ["SubjectList!A:ZZ", subjectRows],
  ["ModuleList!A:ZZ", moduleRows],
  ["TaskList!A:ZZ", taskRows],
  ["eBooks!A:ZZ", ebookRows],
  ["Printable!A:ZZ", printableRows],
  ["Audio!A:ZZ", audioRows],
  ["Video!A:ZZ", videoRows],
  ["OtherResource!A:ZZ", otherRows]
]);

const keyPair = await crypto.subtle.generateKey({
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256"
}, true, ["sign", "verify"]);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const env = {
  PIN_SECRET: pinSecret,
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID: "ROOT123",
  M4L_DRIVE_ACCESS_TTL_SECONDS: "3600",
  M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS: "true",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "drive-library@example.iam.gserviceaccount.com",
    private_key_id: "drive-library-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  })
};
const adminToken = await createSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Main Admin",
  role: "ADMIN",
  assignedgroup: "ALL",
  authrow: 2,
  credentialHash: adminHash
}, env);
const studentFourToken = await createSessionToken({
  type: "student",
  studentid: "STUDENT4",
  username: "Group Four",
  classgroup: "4",
  authrow: 2,
  credentialHash: studentFourHash
}, env);
const studentThreeToken = await createSessionToken({
  type: "student",
  studentid: "STUDENT3",
  username: "Group Three",
  classgroup: "3",
  authrow: 3,
  credentialHash: studentThreeHash
}, env);

const driveItems = new Map([
  ["ROOT123", { id: "ROOT123", name: "M4L Resources", mimeType: "application/vnd.google-apps.folder", parents: [], trashed: false }],
  ["FOLDER1", { id: "FOLDER1", name: "Fiqh", mimeType: "application/vnd.google-apps.folder", parents: ["ROOT123"], trashed: false }],
  ["FILE123", { id: "FILE123", name: "Fiqh Lesson 1.pdf", mimeType: "application/pdf", size: "26", parents: ["FOLDER1"], trashed: false, capabilities: { canDownload: true } }],
  ["FILEMP4", { id: "FILEMP4", name: "Fiqh Lesson Video.mp4", mimeType: "application/octet-stream", size: "1024", parents: ["FOLDER1"], trashed: false, capabilities: { canDownload: true } }]
]);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-token", expires_in: 3600 });
  }

  if (url.hostname === "sheets.googleapis.com") {
    return handleSheets(url, init);
  }

  if (url.hostname === "www.googleapis.com" && url.pathname.startsWith("/drive/v3/files")) {
    return handleDrive(url, init);
  }

  throw new Error(`Unexpected fetch: ${url}`);
};

try {
  const browse = await post("/api/admin/drive/browse", {}, adminToken);
  assert.equal(browse.response.status, 200);
  assert.equal(browse.data.folder.id, "ROOT123");
  assert.equal(browse.data.items.length, 1);
  assert.equal(browse.data.items[0].id, "FOLDER1");

  const browseFolder = await post("/api/admin/drive/browse", { folderId: "FOLDER1" }, adminToken);
  assert.equal(browseFolder.response.status, 200);
  const pdfItem = browseFolder.data.items.find(item => item.id === "FILE123");
  const mp4Item = browseFolder.data.items.find(item => item.id === "FILEMP4");
  assert.ok(pdfItem);
  assert.ok(mp4Item);
  assert.deepEqual(pdfItem.supportedTypes, ["EBOOK", "PRINTABLE"]);
  assert.deepEqual(mp4Item.supportedTypes, ["VIDEO"]);
  assert.equal(mp4Item.format, "MP4");

  const options = await post("/api/admin/resources/options", {}, adminToken);
  assert.equal(options.response.status, 200);
  assert.equal(options.data.subjects[0].subjectname, "Fiqh");
  assert.deepEqual(
    options.data.subjects[0].modules.map(module => module.moduleid),
    ["MOD1", "MOD2", "MOD3"]
  );
  assert.equal(options.data.subjects[0].modules[0].modulename, "Module One from ModuleList");
  assert.equal(options.data.subjects[0].modules[0].tasks[0].taskid, "TASK1");
  assert.equal(options.data.subjects[0].modules[1].tasks[0].taskid, "TASK2");
  assert.equal(options.data.subjects[0].modules[2].tasks.length, 0);
  assert.equal(options.data.subjects[0].modules.some(module => module.moduleid === "MODX"), false);

  const created = await post("/api/admin/resources/create", {
    resourceType: "EBOOK",
    fileId: "FILE123",
    name: "Fiqh Lesson 1",
    subjectId: "SUB1",
    moduleId: "MOD1",
    taskId: "TASK1",
    groupNo: "ALL",
    active: true
  }, adminToken);
  assert.equal(created.response.status, 200);
  assert.equal(created.data.resource.resourceid, "EBOOK1");
  assert.equal(created.data.resource.fileid, "FILE123");
  assert.equal(ebookRows.length, 2);
  assert.match(ebookRows[1][9], /\/api\/library\/drive\/file\/FILE123$/);

  const duplicate = await post("/api/admin/resources/create", {
    resourceType: "PRINTABLE",
    fileId: "FILE123",
    name: "Duplicate",
    subjectId: "SUB1",
    groupNo: "ALL",
    active: true
  }, adminToken);
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.data.code, "DUPLICATE_DRIVE_RESOURCE");

  const managed = await post("/api/admin/resources/manage-list", {}, adminToken);
  assert.equal(managed.response.status, 200);
  assert.equal(managed.data.count, 1);
  assert.equal(managed.data.resources[0].resourceid, "EBOOK1");

  const access = await post("/api/library/drive/access", {
    resourceType: "EBOOK",
    resourceId: "EBOOK1"
  }, adminToken);
  assert.equal(access.response.status, 200);
  assert.match(access.data.url, /\/api\/library\/drive\/file\/FILE123\?access=/);

  const fileResponse = await worker.fetch(new Request(access.data.url), env);
  assert.equal(fileResponse.status, 200);
  assert.equal(fileResponse.headers.get("Content-Type"), "application/pdf");
  assert.equal(await fileResponse.text(), "abcdefghijklmnopqrstuvwxyz");

  const rangeResponse = await worker.fetch(new Request(access.data.url, {
    headers: { Range: "bytes=5-9" }
  }), env);
  assert.equal(rangeResponse.status, 206);
  assert.equal(rangeResponse.headers.get("Content-Range"), "bytes 5-9/26");
  assert.equal(await rangeResponse.text(), "fghij");

  const grouped = await post("/api/admin/resources/update", {
    resourceType: "EBOOK",
    resourceId: "EBOOK1",
    fileId: "FILE123",
    name: "Fiqh Lesson 1 Updated",
    subjectId: "SUB1",
    moduleId: "MOD1",
    taskId: "TASK1",
    groupNo: "4",
    active: true
  }, adminToken);
  assert.equal(grouped.response.status, 200);
  assert.equal(grouped.data.resource.groupno, "4");

  const groupFourList = await post("/api/resources/list", {}, studentFourToken);
  assert.equal(groupFourList.response.status, 200);
  assert.equal(groupFourList.data.count, 1);

  const groupThreeList = await post("/api/resources/list", {}, studentThreeToken);
  assert.equal(groupThreeList.response.status, 200);
  assert.equal(groupThreeList.data.count, 0);

  const groupFourAccess = await post("/api/library/drive/access", {
    resourceType: "EBOOK",
    resourceId: "EBOOK1"
  }, studentFourToken);
  assert.equal(groupFourAccess.response.status, 200);

  const groupThreeAccess = await post("/api/library/drive/access", {
    resourceType: "EBOOK",
    resourceId: "EBOOK1"
  }, studentThreeToken);
  assert.equal(groupThreeAccess.response.status, 403);
  assert.equal(groupThreeAccess.data.error, "Resource is not available to this group");

  const updated = await post("/api/admin/resources/update", {
    resourceType: "EBOOK",
    resourceId: "EBOOK1",
    fileId: "FILE123",
    name: "Fiqh Lesson 1 Updated",
    subjectId: "SUB1",
    moduleId: "MOD1",
    taskId: "TASK1",
    groupNo: "4",
    active: false
  }, adminToken);
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.resource.active, false);

  const inactiveAccess = await post("/api/library/drive/access", {
    resourceType: "EBOOK",
    resourceId: "EBOOK1"
  }, adminToken);
  assert.equal(inactiveAccess.response.status, 403);
  assert.equal(inactiveAccess.data.error, "Resource is inactive");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Drive Library tests passed.");

async function post(path, body, token) {
  const responseObject = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }), env);
  return { response: responseObject, data: await responseObject.json() };
}

function handleSheets(url, init) {
  const rawRange = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  const range = rawRange.replace(/:append$/, "");

  if (init.method === "GET") {
    const authMatch = /^AdminRecords!A(\d+):J\1$/.exec(range);
    if (authMatch) return response({ values: [adminRows[Number(authMatch[1]) - 1] || []] });
    const studentAuthMatch = /^StudentRecords!A(\d+):K\1$/.exec(range);
    if (studentAuthMatch) return response({ values: [studentRows[Number(studentAuthMatch[1]) - 1] || []] });
    if (!sheets.has(range)) throw new Error(`Unexpected sheet read: ${range}`);
    return response({ values: sheets.get(range) });
  }

  if (init.method === "POST" && rawRange.endsWith(":append")) {
    const payload = JSON.parse(init.body);
    const sheetName = range.split("!")[0];
    const target = sheets.get(`${sheetName}!A:ZZ`);
    target.push(payload.values[0]);
    return response({ updates: { updatedRows: 1 } });
  }

  if (init.method === "PUT") {
    const payload = JSON.parse(init.body);
    const match = /^([^!]+)!A(\d+):([A-Z]+)\2$/.exec(range);
    if (!match) throw new Error(`Unexpected sheet update: ${range}`);
    const target = sheets.get(`${match[1]}!A:ZZ`);
    target[Number(match[2]) - 1] = payload.values[0];
    return response({ updatedRows: 1 });
  }

  throw new Error(`Unexpected Sheets request: ${init.method} ${range}`);
}

function handleDrive(url, init) {
  const fileMatch = /^\/drive\/v3\/files\/([A-Za-z0-9_-]+)$/.exec(url.pathname);

  if (fileMatch && url.searchParams.get("alt") === "media") {
    const text = "abcdefghijklmnopqrstuvwxyz";
    const range = new Headers(init.headers).get("Range");
    if (!range) {
      return new Response(text, {
        status: 200,
        headers: { "Content-Type": "application/pdf", "Content-Length": String(text.length), "Accept-Ranges": "bytes" }
      });
    }
    const match = /^bytes=(\d+)-(\d+)$/.exec(range);
    const start = Number(match[1]);
    const end = Number(match[2]);
    const part = text.slice(start, end + 1);
    return new Response(part, {
      status: 206,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(part.length),
        "Content-Range": `bytes ${start}-${end}/${text.length}`,
        "Accept-Ranges": "bytes"
      }
    });
  }

  if (fileMatch) {
    const item = driveItems.get(fileMatch[1]);
    return item ? response(item) : response({ error: { message: "Not found" } }, 404);
  }

  if (url.pathname === "/drive/v3/files") {
    const query = url.searchParams.get("q") || "";
    const parentMatch = /^'([^']+)' in parents/.exec(query);
    const parentId = parentMatch ? parentMatch[1] : "";
    const files = Array.from(driveItems.values()).filter(item => item.parents?.includes(parentId));
    return response({ files });
  }

  throw new Error(`Unexpected Drive request: ${init.method || "GET"} ${url}`);
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64").match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----`;
}
