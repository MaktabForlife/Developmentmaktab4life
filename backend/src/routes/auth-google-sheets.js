import { createSessionToken, getAuthUser, hashPin } from "../lib/auth.js";
import {
  batchUpdateGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";

const ADMIN_RECORDS_SHEET = "AdminRecords";
const STUDENT_RECORDS_SHEET = "StudentRecords";
const FULL_SHEET_RANGE = "A:ZZ";

export async function checkAdminGoogleSheetsEndpoint(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  const rows = await readAuthenticationSheet(env, ADMIN_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(ADMIN_RECORDS_SHEET);
  }

  const admin = findAdminByUniqueId(rows, uniqueid);

  if (!admin) {
    return json({ success: false, error: "Invalid admin link" }, 404);
  }

  if (admin.active !== true) {
    return json({ success: false, error: "Admin account disabled" }, 403);
  }

  return json({
    success: true,
    admin: publicAdmin(admin, true)
  });
}

export async function setupAdminPinGoogleSheetsEndpoint(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;
  const pin = body.pin;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (!/^\d{4}$/.test(pin)) {
    return json({ success: false, error: "PIN must be 4 digits" }, 400);
  }

  const rows = await readAuthenticationSheet(env, ADMIN_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(ADMIN_RECORDS_SHEET);
  }

  const admin = findAdminByUniqueId(rows, uniqueid);

  if (!admin) {
    return json({ success: false, error: "Admin not found" });
  }

  const pinhash = await hashPin(pin, env.PIN_SECRET);
  await updateGoogleSheetValues(
    env,
    `${ADMIN_RECORDS_SHEET}!D${admin.row}:E${admin.row}`,
    [[true, pinhash]]
  );

  return json({
    success: true,
    adminid: admin.adminid,
    username: admin.username,
    role: admin.role,
    assignedgroup: admin.assignedgroup
  });
}

export async function adminLoginGoogleSheetsEndpoint(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;
  const pin = body.pin;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (!/^\d{4}$/.test(pin)) {
    return json({ success: false, error: "PIN must be 4 digits" }, 400);
  }

  const rows = await readAuthenticationSheet(env, ADMIN_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(ADMIN_RECORDS_SHEET);
  }

  const admin = findAdminByUniqueId(rows, uniqueid);

  if (!admin) {
    return json({ success: false, error: "Invalid admin link" }, 404);
  }

  if (admin.active !== true) {
    return json({ success: false, error: "Account disabled" }, 403);
  }

  if (admin.pinsetup !== true) {
    return json({ success: false, error: "Admin PIN not set up yet" }, 403);
  }

  const enteredHash = await hashPin(pin, env.PIN_SECRET);

  if (enteredHash !== admin.pinhash) {
    return json({ success: false, error: "Incorrect PIN" }, 401);
  }

  const token = await createSessionToken({
    type: "admin",
    adminid: admin.adminid,
    username: admin.username,
    role: admin.role,
    assignedgroup: admin.assignedgroup
  }, env);

  return json({
    success: true,
    message: "Admin login successful",
    token,
    admin: publicAdmin(admin, false)
  });
}

export async function checkStudentGoogleSheetsEndpoint(request, env) {
  const body = await request.json();
  const rows = await readAuthenticationSheet(env, STUDENT_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(STUDENT_RECORDS_SHEET);
  }

  const student = findStudentByUniqueId(rows, body.uniqueid);

  if (!student) {
    return json({ success: false, error: "Invalid login link" }, 404);
  }

  if (student.active !== true) {
    return json({ success: false, error: "Account disabled" }, 403);
  }

  return json({
    success: true,
    student: publicStudent(student, true)
  });
}

export async function setupStudentPinGoogleSheetsEndpoint(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;
  const pin = body.pin;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (!/^\d{4}$/.test(pin)) {
    return json({ success: false, error: "PIN must be 4 digits" }, 400);
  }

  const rows = await readAuthenticationSheet(env, STUDENT_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(STUDENT_RECORDS_SHEET);
  }

  const student = findStudentByUniqueId(rows, uniqueid);

  if (!student) {
    return json({ success: false, error: "Student not found" });
  }

  const pinhash = await hashPin(pin, env.PIN_SECRET);
  await updateStudentPinFields(env, student.row, true, pinhash);

  return json({
    success: true,
    studentid: student.studentid,
    username: student.username
  });
}

export async function studentLoginGoogleSheetsEndpoint(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;
  const pin = body.pin;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (!/^\d{4}$/.test(pin)) {
    return json({ success: false, error: "PIN must be 4 digits" }, 400);
  }

  const rows = await readAuthenticationSheet(env, STUDENT_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(STUDENT_RECORDS_SHEET);
  }

  const student = findStudentByUniqueId(rows, uniqueid);

  if (!student) {
    return json({ success: false, error: "Invalid login link" }, 404);
  }

  if (student.active !== true) {
    return json({ success: false, error: "Account disabled" }, 403);
  }

  if (student.pinsetup !== true) {
    return json({ success: false, error: "PIN not set up yet" }, 403);
  }

  const enteredHash = await hashPin(pin, env.PIN_SECRET);

  if (enteredHash !== student.pinhash) {
    return json({ success: false, error: "Incorrect PIN" }, 401);
  }

  const token = await createSessionToken({
    type: "student",
    studentid: student.studentid,
    username: student.username,
    classgroup: student.classgroup
  }, env);

  return json({
    success: true,
    message: "Login successful",
    token,
    student: publicStudent(student, false)
  });
}

export async function resetStudentPinGoogleSheetsEndpoint(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  if (authUser.role !== "ADMIN" && authUser.role !== "SENIOR") {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  const body = await request.json();
  const uniqueid = body.uniqueid;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  const rows = await readAuthenticationSheet(env, STUDENT_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(STUDENT_RECORDS_SHEET);
  }

  const student = findStudentByUniqueId(rows, uniqueid);

  if (!student) {
    return json({ success: false, error: "Student not found" });
  }

  await updateStudentPinFields(env, student.row, false, "");

  return json({
    success: true,
    message: "PIN reset successfully",
    studentid: student.studentid,
    username: student.username
  });
}

async function updateStudentPinFields(env, row, pinsetup, pinhash) {
  await batchUpdateGoogleSheetValues(env, [
    {
      range: `${STUDENT_RECORDS_SHEET}!E${row}:F${row}`,
      majorDimension: "ROWS",
      values: [[pinsetup, pinhash]]
    },
    {
      range: `${STUDENT_RECORDS_SHEET}!J${row}`,
      majorDimension: "ROWS",
      values: [[0]]
    }
  ]);
}

async function readAuthenticationSheet(env, sheetName) {
  try {
    return await readGoogleSheetValues(env, `${sheetName}!${FULL_SHEET_RANGE}`);
  } catch (error) {
    if (isMissingSheetError(error, sheetName)) {
      return null;
    }

    throw error;
  }
}

function findStudentByUniqueId(rows, uniqueid) {
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];

    if (String(getValue(row, 3)).trim() === uniqueid) {
      return {
        row: index + 1,
        studentid: getValue(row, 0),
        username: getValue(row, 1),
        uniqueid: getValue(row, 3),
        pinsetup: normalizeBooleanCell(getValue(row, 4)),
        pinhash: getValue(row, 5),
        classgroup: getValue(row, 6),
        lastlogin: getValue(row, 8),
        failedattempts: getValue(row, 9),
        active: normalizeBooleanCell(getValue(row, 10))
      };
    }
  }

  return null;
}

function findAdminByUniqueId(rows, uniqueid) {
  const searchUniqueId = String(uniqueid).trim();

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];

    if (String(getValue(row, 2)).trim() === searchUniqueId) {
      return {
        row: index + 1,
        adminid: getValue(row, 0),
        username: getValue(row, 1),
        uniqueid: getValue(row, 2),
        pinsetup: normalizeBooleanCell(getValue(row, 3)),
        pinhash: getValue(row, 4),
        role: getValue(row, 5),
        assignedgroup: getValue(row, 6),
        active: normalizeBooleanCell(getValue(row, 7)),
        createdate: getValue(row, 8),
        lastlogin: getValue(row, 9)
      };
    }
  }

  return null;
}

function publicStudent(student, includePinSetup) {
  const result = {
    studentid: student.studentid,
    username: student.username,
    classgroup: student.classgroup
  };

  if (includePinSetup) {
    result.pinsetup = student.pinsetup;
  }

  return result;
}

function publicAdmin(admin, includePinSetup) {
  const result = {
    adminid: admin.adminid,
    username: admin.username,
    uniqueid: admin.uniqueid,
    role: admin.role,
    assignedgroup: admin.assignedgroup
  };

  if (includePinSetup) {
    result.pinsetup = admin.pinsetup;
  }

  return result;
}

function missingSheetResponse(sheetName) {
  return json({ success: false, error: `${sheetName} sheet not found` });
}

function isMissingSheetError(error, sheetName) {
  const message = error && error.message ? error.message : String(error || "");
  return message.includes("Google Sheets API error 400:") &&
    message.includes("Unable to parse range") &&
    message.toLowerCase().includes(String(sheetName).toLowerCase());
}

function getValue(row, index) {
  const value = Array.isArray(row) ? row[index] : "";
  return value === undefined || value === null ? "" : value;
}

function normalizeBooleanCell(value) {
  if (value === true || value === false) {
    return value;
  }

  const text = String(value === undefined || value === null ? "" : value)
    .trim()
    .toLowerCase();

  if (text === "true") return true;
  if (text === "false") return false;

  return value;
}
