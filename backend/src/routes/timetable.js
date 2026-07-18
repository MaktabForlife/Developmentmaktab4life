import { callAppsScript } from "../lib/apps-script.js";
import { getAuthUser, requireAdminOrSenior } from "../lib/auth.js";
import { json } from "../lib/http.js";

export async function getTimetableEndpoint(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();

  let groupNo = String(body.groupNo || body.classgroup || body.group || "ALL").trim();
  let assignedTeacher = String(body.assignedTeacher || body.teacher || "ALL").trim();

  if (authUser.type === "student") {
    groupNo = String(authUser.classgroup || groupNo || "ALL").trim();
    assignedTeacher = "ALL";
  }

  if (authUser.type === "admin" && authUser.role === "TEACHER") {
    groupNo = String(authUser.assignedgroup || groupNo || "ALL").trim();
    assignedTeacher = String(authUser.username || assignedTeacher || "ALL").trim();
  }

  const result = await callAppsScript(env, {
    action: "getTimetable",
    data: {
      groupNo,
      assignedTeacher,
      userType: authUser.type,
      role: authUser.role || ""
    }
  });

  return json(result);
}

export async function updateTimetableZoomLinkEndpoint(request, env) {
  const auth = await requireAdminOrSenior(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const zoomlink = String(body.zoomlink || body.zoomLink || body.link || "").trim();

  const result = await callAppsScript(env, {
    action: "updateTimetableZoomLink",
    data: {
      zoomlink,
      updatedBy: auth.user.username || "",
      groupNo: "ALL",
      assignedTeacher: "ALL"
    }
  });

  return json(result);
}

