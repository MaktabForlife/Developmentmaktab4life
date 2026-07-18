import { callAppsScript } from "../lib/apps-script.js";
import { createSessionToken, getAuthUser, hashPin } from "../lib/auth.js";
import { json } from "../lib/http.js";

export async function checkAdmin(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  const result = await callAppsScript(env, {
    action: "getAdminByUniqueId",
    uniqueid
  });

  if (!result.admin) {
    return json({ success: false, error: "Invalid admin link" }, 404);
  }

  const admin = result.admin;

  if (admin.active !== true) {
    return json({ success: false, error: "Admin account disabled" }, 403);
  }

  return json({
    success: true,
    admin: {
      adminid: admin.adminid,
      username: admin.username,
      uniqueid: admin.uniqueid,
      role: admin.role,
      assignedgroup: admin.assignedgroup,
      pinsetup: admin.pinsetup
    }
  });
}

export async function setupAdminPin(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;
  const pin = body.pin;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (!/^\d{4}$/.test(pin)) {
    return json({ success: false, error: "PIN must be 4 digits" }, 400);
  }

  const pinhash = await hashPin(pin, env.PIN_SECRET);

  const result = await callAppsScript(env, {
    action: "setAdminPin",
    data: { uniqueid, pinhash }
  });

  return json(result);
}

export async function adminLogin(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;
  const pin = body.pin;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (!/^\d{4}$/.test(pin)) {
    return json({ success: false, error: "PIN must be 4 digits" }, 400);
  }

  const result = await callAppsScript(env, {
    action: "getAdminByUniqueId",
    uniqueid
  });

  if (!result.admin) {
    return json({ success: false, error: "Invalid admin link" }, 404);
  }

  const admin = result.admin;

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
    admin: {
      adminid: admin.adminid,
      username: admin.username,
      uniqueid: admin.uniqueid,
      role: admin.role,
      assignedgroup: admin.assignedgroup
    }
  });
}

export async function checkStudent(request, env) {
  const body = await request.json();

  const result = await callAppsScript(env, {
    action: "getStudentByUniqueId",
    uniqueid: body.uniqueid
  });

  if (!result.student) {
    return json({ success: false, error: "Invalid login link" }, 404);
  }

  if (result.student.active !== true) {
    return json({ success: false, error: "Account disabled" }, 403);
  }

  return json({
    success: true,
    student: {
      studentid: result.student.studentid,
      username: result.student.username,
      classgroup: result.student.classgroup,
      pinsetup: result.student.pinsetup
    }
  });
}

export async function setupPin(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;
  const pin = body.pin;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (!/^\d{4}$/.test(pin)) {
    return json({ success: false, error: "PIN must be 4 digits" }, 400);
  }

  const pinhash = await hashPin(pin, env.PIN_SECRET);

  const result = await callAppsScript(env, {
    action: "setStudentPin",
    data: { uniqueid, pinhash }
  });

  return json(result);
}

export async function login(request, env) {
  const body = await request.json();
  const uniqueid = body.uniqueid;
  const pin = body.pin;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (!/^\d{4}$/.test(pin)) {
    return json({ success: false, error: "PIN must be 4 digits" }, 400);
  }

  const result = await callAppsScript(env, {
    action: "getStudentForLogin",
    uniqueid
  });

  if (!result.student) {
    return json({ success: false, error: "Invalid login link" }, 404);
  }

  const student = result.student;

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
    student: {
      studentid: student.studentid,
      username: student.username,
      classgroup: student.classgroup
    }
  });
}


  

export async function resetPin(request, env) {
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

  const result = await callAppsScript(env, {
    action: "resetStudentPin",
    uniqueid
  });

  return json(result);
}

