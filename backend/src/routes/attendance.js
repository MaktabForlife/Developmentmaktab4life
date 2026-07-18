import { callAppsScript } from "../lib/apps-script.js";
import { getAuthUser } from "../lib/auth.js";
import { json } from "../lib/http.js";

export async function submitAbsentAttendance(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();

  const date = String(body.date || "").trim();

  const absentStudents = Array.isArray(body.absentStudents)
    ? body.absentStudents
    : [];

  if (!date) {
    return json({ success: false, error: "Missing date" }, 400);
  }

  for (const student of absentStudents) {
    if (!student.studentid) {
      return json({
        success: false,
        error: "Missing studentid in absent list"
      }, 400);
    }

    if (authUser.role === "TEACHER" && student.classgroup !== authUser.assignedgroup) {
      return json({
        success: false,
        error: "Teacher cannot submit attendance for another group"
      }, 403);
    }
  }

  const result = await callAppsScript(env, {
    action: "submitAbsentStudents",
    data: {
      date,
    absentStudents,
    adminid: authUser.adminid
    }
  });

  return json(result);
}

export async function attendanceStudents(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();

  let classgroup = String(body.classgroup || "ALL").trim();

  if (authUser.role === "TEACHER") {
    classgroup = authUser.assignedgroup;
  }

  const result = await callAppsScript(env, {
    action: "getStudentsForAttendance",
    classgroup
  });

  return json(result);
}

export async function attendanceReport(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();

  const startDate = String(body.startDate || "").trim();
  const endDate = String(body.endDate || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return json({ success: false, error: "startDate must be YYYY-MM-DD" }, 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return json({ success: false, error: "endDate must be YYYY-MM-DD" }, 400);
  }

  let classgroup = String(body.classgroup || "ALL").trim();

  if (authUser.role === "TEACHER") {
    classgroup = authUser.assignedgroup;
  }

  const result = await callAppsScript(env, {
    action: "getAttendanceReport",
    data: {
      startDate,
      endDate,
      classgroup
    }
  });

  return json(result);
}



