import { callAppsScript } from "../lib/apps-script.js";
import { getAuthUser, normalizeWhatsapp6, requireAdminOrSenior } from "../lib/auth.js";
import { json } from "../lib/http.js";

export async function checkStudentDuplicateAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();

  const username = body.username;
  const whatsapp6 = normalizeWhatsapp6(body.whatsapp6);
  const classgroup = body.classgroup;

  if (!username) {
    return json({ success: false, error: "Missing username" }, 400);
  }

  if (!classgroup) {
    return json({ success: false, error: "Missing classgroup" }, 400);
  }

  const result = await callAppsScript(env, {
    action: "checkStudentDuplicate",
    data: {
      username,
      whatsapp6,
      classgroup
    }
  });

  return json(result);
}

export async function registerStudentAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();

  const username = String(body.username || "").trim();
  const whatsapp6 = normalizeWhatsapp6(body.whatsapp6);
  const classgroup = String(body.classgroup || "1").trim();
  const confirmDuplicate = body.confirmDuplicate === true;
  const assignmentMode = body.assignmentMode === "selected" ? "selected" : "all";
  const selectedModules = Array.isArray(body.selectedModules) ? body.selectedModules : [];

  if (!username) {
    return json({ success: false, error: "Missing username" }, 400);
  }

  if (!classgroup) {
    return json({ success: false, error: "Missing classgroup" }, 400);
  }

  // Manual subject/module assignment is temporarily disabled in the frontend.
  // If an older page submits selected mode without modules, safely fall back to all active tasks.
  const safeAssignmentMode = assignmentMode === "selected" && selectedModules.length > 0 ? "selected" : "all";

  const registeredby = String(
    permission.user.username ||
    permission.user.name ||
    permission.user.adminid ||
    permission.user.uniqueid ||
    "ADMIN"
  ).trim();

  const result = await callAppsScript(env, {
    action: "registerStudent",
    data: {
      username,
      whatsapp6,
      classgroup,
      confirmDuplicate,
      registeredby,
      registeredbyAdminId: permission.user.adminid || "",
      assignmentMode: safeAssignmentMode,
      selectedModules: safeAssignmentMode === "selected" ? selectedModules : []
    }
  });

  return json(result);
}

export async function updateStudentAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();

  const uniqueid = body.uniqueid;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (body.username !== undefined && String(body.username).trim() === "") {
    return json({ success: false, error: "Username cannot be empty" }, 400);
  }

  if (body.classgroup !== undefined && String(body.classgroup).trim() === "") {
    return json({ success: false, error: "classgroup cannot be empty" }, 400);
  }

  if (
    body.active !== undefined &&
    typeof body.active !== "boolean"
  ) {
    return json({ success: false, error: "active must be true or false" }, 400);
  }

  const updateData = {
    uniqueid
  };

  if (body.username !== undefined) {
    updateData.username = String(body.username).trim();
  }

  if (body.whatsapp6 !== undefined) {
    updateData.whatsapp6 = normalizeWhatsapp6(body.whatsapp6);
  }

  if (body.classgroup !== undefined) {
    updateData.classgroup = String(body.classgroup).trim();
  }

  if (body.active !== undefined) {
    updateData.active = body.active;
  }

  const result = await callAppsScript(env, {
    action: "updateStudent",
    data: updateData
  });

  return json(result);
}

export async function searchStudentsAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const query = String(body.query || "").trim();
  const whatsapp6 = String(body.whatsapp6 || "").replace(/\D/g, "").slice(-6);
  const listAll = body.listAll === true;

  if (!query && !whatsapp6 && !listAll) {
    return json({ success: false, error: "Enter a name or WhatsApp last 6 digits" }, 400);
  }

  const result = await callAppsScript(env, {
    action: "searchStudents",
    data: {
      query,
      whatsapp6,
      listAll
    }
  });

  return json(result);
}

export async function getStudentAssignmentOptionsAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const result = await callAppsScript(env, {
    action: "getStudentAssignmentOptions"
  });

  return json(result);
}

export async function createSubjectAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();

  const subjectName = String(body.subjectName || "").trim();

  if (!subjectName) {
    return json({ success: false, error: "Missing subjectName" }, 400);
  }

  const result = await callAppsScript(env, {
    action: "createSubject",
    data: {
      subjectName
    }
  });

  return json(result);
}

export async function listSubjectsAdmin(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const result = await callAppsScript(env, {
    action: "listSubjects"
  });

  return json(result);
}

export async function updateSubjectAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();

  const subjectid = String(body.subjectid || "").trim();

  if (!subjectid) {
    return json({ success: false, error: "Missing subjectid" }, 400);
  }

  const updateData = {
    subjectid
  };

  if (body.subjectName !== undefined) {
    const subjectName = String(body.subjectName || "").trim();

    if (!subjectName) {
      return json({ success: false, error: "Subject name cannot be empty" }, 400);
    }

    updateData.subjectName = subjectName;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return json({ success: false, error: "active must be true or false" }, 400);
    }

    updateData.active = body.active;
  }

  const result = await callAppsScript(env, {
    action: "updateSubject",
    data: updateData
  });

  return json(result);
}
export async function createSubjectResourceAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();

  const subjectid = String(body.subjectid || "").trim();
  const resourceName = String(body.resourceName || "").trim();
  const resourceType = String(body.resourceType || "").trim().toUpperCase();
  const resourceLink = String(body.resourceLink || "").trim();

  if (!subjectid) {
    return json({ success: false, error: "Missing subjectid" }, 400);
  }

  if (!resourceName) {
    return json({ success: false, error: "Missing resourceName" }, 400);
  }

  if (!resourceType) {
    return json({ success: false, error: "Missing resourceType" }, 400);
  }

  if (!resourceLink) {
    return json({ success: false, error: "Missing resourceLink" }, 400);
  }

  const allowedTypes = ["PDF", "AUDIO", "VIDEO", "IMAGE", "LINK", "TEXT", "OTHER"];

  if (!allowedTypes.includes(resourceType)) {
    return json({ success: false, error: "Invalid resourceType" }, 400);
  }

  const result = await callAppsScript(env, {
    action: "createSubjectResource",
    data: {
      subjectid,
      resourceName,
      resourceType,
      resourceLink
    }
  });

  return json(result);
}

export async function listSubjectResourcesAdmin(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();

  const subjectid = String(body.subjectid || "ALL").trim();

  const result = await callAppsScript(env, {
    action: "listSubjectResources",
    subjectid
  });

  return json(result);
}

export async function updateSubjectResourceAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();

  const resourceid = String(body.resourceid || "").trim();

  if (!resourceid) {
    return json({ success: false, error: "Missing resourceid" }, 400);
  }

  const updateData = {
    resourceid
  };

  if (body.subjectid !== undefined) {
    const subjectid = String(body.subjectid || "").trim();

    if (!subjectid) {
      return json({ success: false, error: "subjectid cannot be empty" }, 400);
    }

    updateData.subjectid = subjectid;
  }

  if (body.resourceName !== undefined) {
    const resourceName = String(body.resourceName || "").trim();

    if (!resourceName) {
      return json({ success: false, error: "resourceName cannot be empty" }, 400);
    }

    updateData.resourceName = resourceName;
  }

  if (body.resourceType !== undefined) {
    const resourceType = String(body.resourceType || "").trim().toUpperCase();
    const allowedTypes = ["PDF", "AUDIO", "VIDEO", "IMAGE", "LINK", "TEXT", "OTHER"];

    if (!allowedTypes.includes(resourceType)) {
      return json({ success: false, error: "Invalid resourceType" }, 400);
    }

    updateData.resourceType = resourceType;
  }

  if (body.resourceLink !== undefined) {
    const resourceLink = String(body.resourceLink || "").trim();

    if (!resourceLink) {
      return json({ success: false, error: "resourceLink cannot be empty" }, 400);
    }

    updateData.resourceLink = resourceLink;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return json({ success: false, error: "active must be true or false" }, 400);
    }

    updateData.active = body.active;
  }

  const result = await callAppsScript(env, {
    action: "updateSubjectResource",
    data: updateData
  });

  return json(result);
}
export async function createTaskAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();

  const subjectid = String(body.subjectid || "").trim();
  const taskName = String(body.taskName || "").trim();

  const audioLink = String(body.audioLink || "").trim();
  const visualLink = String(body.visualLink || "").trim();
  const videoLink = String(body.videoLink || "").trim();
  const pdfLink = String(body.pdfLink || "").trim();

  if (!subjectid) {
    return json({ success: false, error: "Missing subjectid" }, 400);
  }

  if (!taskName) {
    return json({ success: false, error: "Missing taskName" }, 400);
  }

  const result = await callAppsScript(env, {
    action: "createTask",
    data: {
      subjectid,
      taskName,
      audioLink,
      visualLink,
      videoLink,
      pdfLink
    }
  });

  return json(result);
}

export async function listTasksAdmin(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();

  const subjectid = String(body.subjectid || "ALL").trim();
  const activeOnly = body.activeOnly === true;

  const result = await callAppsScript(env, {
    action: "listTasks",
    data: {
      subjectid,
      activeOnly
    }
  });

  return json(result);
}

export async function updateTaskAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();

  const taskid = String(body.taskid || "").trim();

  if (!taskid) {
    return json({ success: false, error: "Missing taskid" }, 400);
  }

  const updateData = {
    taskid
  };

  if (body.subjectid !== undefined) {
    const subjectid = String(body.subjectid || "").trim();

    if (!subjectid) {
      return json({ success: false, error: "subjectid cannot be empty" }, 400);
    }

    updateData.subjectid = subjectid;
  }

  if (body.taskName !== undefined) {
    const taskName = String(body.taskName || "").trim();

    if (!taskName) {
      return json({ success: false, error: "taskName cannot be empty" }, 400);
    }

    updateData.taskName = taskName;
  }

  if (body.audioLink !== undefined) {
    updateData.audioLink = String(body.audioLink || "").trim();
  }

  if (body.visualLink !== undefined) {
    updateData.visualLink = String(body.visualLink || "").trim();
  }

  if (body.videoLink !== undefined) {
    updateData.videoLink = String(body.videoLink || "").trim();
  }

  if (body.pdfLink !== undefined) {
    updateData.pdfLink = String(body.pdfLink || "").trim();
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return json({ success: false, error: "active must be true or false" }, 400);
    }

    updateData.active = body.active;
  }

  const result = await callAppsScript(env, {
    action: "updateTask",
    data: updateData
  });

  return json(result);
}

export async function assignTasksAdmin(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const authUser = permission.user;
  const body = await request.json();

  const data = {
    assignedBy: authUser.adminid,
    taskids: Array.isArray(body.taskids) ? body.taskids : [],
    studentids: Array.isArray(body.studentids) ? body.studentids : [],
    classgroup: String(body.classgroup || "").trim(),
    assignAllStudents: body.assignAllStudents === true,
    assignAllTasksForSubject: body.assignAllTasksForSubject === true,
    subjectid: String(body.subjectid || "").trim()
  };

  const result = await callAppsScript(env, {
    action: "assignTasksToStudents",
    data
  });

  return json(result);
}
