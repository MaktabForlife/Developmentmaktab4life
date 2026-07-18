import { callAppsScript } from "../lib/apps-script.js";
import { getAuthUser } from "../lib/auth.js";
import { json } from "../lib/http.js";

export async function getStudentTasksEndpoint(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();

  let studentid = String(body.studentid || "").trim();
  const subjectid = String(body.subjectid || "ALL").trim();

  if (authUser.type === "student") {
    studentid = authUser.studentid;
  }

  if (authUser.type === "admin") {
    if (!studentid) {
      return json({ success: false, error: "Missing studentid" }, 400);
    }
  }

  if (!studentid) {
    return json({ success: false, error: "Missing studentid" }, 400);
  }

  const result = await callAppsScript(env, {
    action: "getStudentTasks",
    data: {
      studentid,
      subjectid
    }
  });

  return json(result);
}
function hasOwnProgressField(source, key) {
  return !!source && Object.prototype.hasOwnProperty.call(source, key);
}

function normalizeProgressCompleteStatus(value) {
  if (value === true) return "COMPLETE";
  if (value === false || value === null || value === undefined) return "";

  const text = String(value || "").trim();
  if (!text) return "";

  const normalized = text.toLowerCase();
  if (["true", "1", "yes", "y", "complete", "completed"].includes(normalized)) {
    return "COMPLETE";
  }
  if (["false", "0", "no", "n", "blank", "clear", "incomplete"].includes(normalized)) {
    return "";
  }

  return text;
}

function normalizeProgressVerifyStatus(value) {
  if (value === true) return "VERIFIED";
  if (value === false || value === null || value === undefined) return "";

  const text = String(value || "").trim();
  if (!text) return "";

  const normalized = text.toLowerCase();
  if (["true", "1", "yes", "y", "verify", "verified"].includes(normalized)) {
    return "VERIFIED";
  }
  if (["false", "0", "no", "n", "blank", "clear", "unverified", "not verified"].includes(normalized)) {
    return "";
  }

  return text;
}

function getProgressUpdateRows(body) {
  if (Array.isArray(body)) {
    return body;
  }
  if (body && Array.isArray(body.updates)) {
    return body.updates;
  }
  return [body || {}];
}

function getProgressActorForAppsScript(authUser) {
  return {
    type: authUser.type || "",
    studentid: authUser.studentid || "",
    adminid: authUser.adminid || "",
    username: authUser.username || "",
    role: authUser.role || "",
    assignedgroup: authUser.assignedgroup || ""
  };
}

function normalizeProgressStatusUpdates(body, mode, authUser) {
  const sourceRows = getProgressUpdateRows(body);
  const updates = [];
  const errors = [];

  sourceRows.forEach((row, index) => {
    const source = row || {};
    const studenttaskid = String(
      source.studenttaskid ||
      source.studentTaskId ||
      source.StudentTaskID ||
      ""
    ).trim();

    if (!studenttaskid) {
      errors.push({ index, error: "Missing studenttaskid" });
      return;
    }

    const update = { studenttaskid };

    if (hasOwnProgressField(source, "completeStatus")) {
      update.completeStatus = normalizeProgressCompleteStatus(source.completeStatus);
    } else if (hasOwnProgressField(source, "complete")) {
      update.completeStatus = normalizeProgressCompleteStatus(source.complete);
    } else if (mode === "complete" && !hasOwnProgressField(source, "verifyStatus") && !hasOwnProgressField(source, "verified")) {
      update.completeStatus = normalizeProgressCompleteStatus(source.complete === true);
    }

    if (hasOwnProgressField(source, "verifyStatus")) {
      update.verifyStatus = normalizeProgressVerifyStatus(source.verifyStatus);
    } else if (hasOwnProgressField(source, "verified")) {
      update.verifyStatus = normalizeProgressVerifyStatus(source.verified);
    } else if (mode === "verify" && !hasOwnProgressField(source, "completeStatus") && !hasOwnProgressField(source, "complete")) {
      update.verifyStatus = normalizeProgressVerifyStatus(source.verified === true);
    }

    if (authUser.type === "student" && hasOwnProgressField(update, "verifyStatus")) {
      errors.push({ index, studenttaskid, error: "Students cannot verify tasks" });
      return;
    }

    if (!hasOwnProgressField(update, "completeStatus") && !hasOwnProgressField(update, "verifyStatus")) {
      errors.push({ index, studenttaskid, error: "No progress status supplied" });
      return;
    }

    updates.push(update);
  });

  return { updates, errors };
}

export async function updateTaskComplete(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();
  const normalized = normalizeProgressStatusUpdates(body, "complete", authUser);

  if (normalized.errors.length > 0) {
    return json({
      success: false,
      error: normalized.errors[0].error || "Invalid progress update",
      errors: normalized.errors
    }, 400);
  }

  const result = await callAppsScript(env, {
    action: "updateStudentTaskStatus",
    data: {
      updates: normalized.updates,
      actor: getProgressActorForAppsScript(authUser)
    }
  });

  return json(result);
}
export async function verifyStudentTask(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();
  const normalized = normalizeProgressStatusUpdates(body, "verify", authUser);

  if (normalized.errors.length > 0) {
    return json({
      success: false,
      error: normalized.errors[0].error || "Invalid progress update",
      errors: normalized.errors
    }, 400);
  }

  const result = await callAppsScript(env, {
    action: "updateStudentTaskStatus",
    data: {
      updates: normalized.updates,
      actor: getProgressActorForAppsScript(authUser)
    }
  });

  return json(result);
}
export async function taskProgressReport(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();

  let studentid = String(body.studentid || "ALL").trim();
  let classgroup = String(body.classgroup || "ALL").trim();
  const subjectid = String(body.subjectid || "ALL").trim();

  if (authUser.type === "student") {
    studentid = authUser.studentid;
    classgroup = "ALL";
  }

  if (authUser.type === "admin" && authUser.role === "TEACHER") {
    classgroup = authUser.assignedgroup;
  }

  const result = await callAppsScript(env, {
    action: "getTaskProgressReport",
    data: {
      studentid,
      classgroup,
      subjectid
    }
  });

  return json(result);
}

export async function taskProgressDetail(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();

  let studentid = String(body.studentid || "ALL").trim();
  let classgroup = String(body.classgroup || "ALL").trim();
  const subjectid = String(body.subjectid || "ALL").trim();
  const taskid = String(body.taskid || "ALL").trim();

  if (authUser.type === "student") {
    studentid = authUser.studentid;
    classgroup = "ALL";
  }

  if (authUser.type === "admin" && authUser.role === "TEACHER") {
    classgroup = authUser.assignedgroup;
  }

  const result = await callAppsScript(env, {
    action: "getTaskProgressDetail",
    data: {
      studentid,
      classgroup,
      subjectid,
      taskid
    }
  });

  return json(result);
}













