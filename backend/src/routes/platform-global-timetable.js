/* M4L V102.12.8 - Global Course ongoing scheduling, batch session editing, publishable TBA and Calendar conflict warnings. */

import { getAuthUser } from "../lib/auth.js";
import { noTeachingEventsOnDates } from "../lib/academy-calendar.js";
import {
  activeGlobalTimetableSessionsForRun,
  generateSessionDates,
  GLOBAL_TIMETABLE_DEVELOPMENT_STAGE,
  GLOBAL_TIMETABLE_PUBLISHED_STAGE,
  mapGlobalTimetablePublication,
  mapGlobalTimetableRunState,
  mapGlobalTimetableSession,
  mapPublishedGlobalTimetableSession,
  sessionWithinRun,
  validateIsoDate,
  validateTimeRange
} from "../lib/global-timetable.js";
import { mapGlobalSubjectRun } from "../lib/global-subject-delivery.js";
import {
  GLOBAL_SESSION_STATUS_CANCELLED,
  GLOBAL_SESSION_STATUS_RESCHEDULED,
  GLOBAL_SESSION_STATUS_SCHEDULED,
  GLOBAL_SESSION_STATUSES,
  lifecycleNeedsTeacher,
  mapGlobalTimetableSessionLifecycle,
  normalizeGlobalSessionStatus,
  resolveCurrentSessionLifecycle
} from "../lib/global-timetable-lifecycle.js";
import { batchUpdateGoogleSheetValues } from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { getPlatformSpreadsheetId, readPlatformSheet } from "../lib/platform-sheet.js";
import {
  isActivePlatformValue,
  normalizePlatformIdentifier,
  PLATFORM_SHEET_HEADERS
} from "../lib/platform-schema.js";

const MAX_ZOOM_LINK_LENGTH = 1000;
const HTTPS_URL_PATTERN = /^https:\/\//i;
const TIMETABLE_SCHEMA_VERSIONS = new Set(["102.0.7", "102.0.8"]);

export async function getPlatformGlobalTimetableEndpoint(request, env) {
  const permission = await requireGlobalTimetableAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const tables = await readGlobalTimetableTables(env);
    const publishedSourceIds = publishedSourceIdSet(tables.PublishedGlobalTimetableSessions);
    return json({
      success: true,
      service: "platform-global-timetable",
      version: "102.12.8",
      globalTimetableVersion: readGlobalTimetableVersion(tables.PlatformConfig).value,
      subjects: tables.GlobalSubjectList.map(mapSubject),
      modules: tables.GlobalModuleList.map(mapModule),
      runs: tables.GlobalSubjectRuns.map(run => mapGlobalSubjectRun(run)),
      teachers: tables.UserAccounts.filter(row => isActivePlatformValue(row.Active)).map(mapTeacherAccount),
      sessions: tables.GlobalTimetableSessions.map(row => enrichSession(
        mapGlobalTimetableSession(row, publishedSourceIds), tables
      )),
      states: tables.GlobalTimetableRunState.map(mapGlobalTimetableRunState),
      publications: tables.GlobalTimetablePublications.map(mapGlobalTimetablePublication),
      lifecycles: tables.GlobalTimetableSessionLifecycle
        .filter(row => !clean(row.PublicationID))
        .map(mapGlobalTimetableSessionLifecycle),
      publishedLifecycles: tables.GlobalTimetableSessionLifecycle
        .filter(row => clean(row.PublicationID))
        .map(mapGlobalTimetableSessionLifecycle),
      publishedSessions: tables.PublishedGlobalTimetableSessions.map(mapPublishedGlobalTimetableSession)
    });
  } catch (error) {
    return globalTimetableError(error, env);
  }
}

export async function generatePlatformGlobalTimetableSessionsEndpoint(request, env) {
  const permission = await requireGlobalTimetableAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const runId = clean(body.runId || body.runid);
    const moduleId = clean(body.moduleId || body.moduleid);
    const teacherAccountId = clean(body.teacherAccountId || body.teacheraccountid);
    const startTime = normalizeSubmittedTime(body.startTime || body.starttime);
    const endTime = normalizeSubmittedTime(body.endTime || body.endtime);
    const zoomLink = clean(body.zoomLink || body.zoomlink);
    const weekdays = Array.isArray(body.weekdays) ? body.weekdays : [];
    const requestedGenerationStart = clean(body.generationStartDate || body.generationstartdate || body.scheduleStartDate || body.schedulestartdate);
    const requestedGenerationEnd = clean(body.generationEndDate || body.generationenddate || body.scheduleEndDate || body.scheduleenddate);

    if (!runId) throw clientError("RunID is required", 400);
    if (!validateTimeRange(startTime, endTime)) throw clientError("StartTime and EndTime require a valid increasing HH:MM range", 400);
    validateZoomLink(zoomLink);

    const tables = await readGlobalTimetableTables(env);
    const run = activeRun(tables, runId);
    requireEditableGlobalTimetable(tables, run.RunID);
    const subject = activeSubject(tables, run.SubjectID);
    const module = resolveModule(tables, moduleId, subject.SubjectID, { requireActive: true });
    const teacher = optionalActiveTeacher(tables, teacherAccountId);
    const runStartDate = clean(run.StartDate);
    const runEndDate = clean(run.EndDate);
    const ongoing = !runStartDate && !runEndDate;
    let generationStartDate = runStartDate;
    let generationEndDate = runEndDate;
    if (ongoing) {
      generationStartDate = requestedGenerationStart;
      generationEndDate = requestedGenerationEnd;
      if (!validateIsoDate(generationStartDate) || !validateIsoDate(generationEndDate) || generationEndDate < generationStartDate) {
        throw clientError("Ongoing courses require valid Generate from and Generate through dates for schedule generation", 400);
      }
    }
    const dates = generateSessionDates(generationStartDate, generationEndDate, weekdays);
    if (!dates.length) throw clientError("The selected weekdays do not occur inside this schedule window", 400);

    for (const sessionDate of dates) {
      if (hasActiveSlotConflict(tables.GlobalTimetableSessions, {
        runId: run.RunID,
        sessionDate,
        startTime,
        endTime
      }, tables.GlobalTimetableSessionLifecycle)) {
        throw clientError(`An active session already overlaps ${sessionDate} ${startTime}-${endTime}`, 409);
      }
    }

    const timestamp = new Date().toISOString();
    const records = dates.map(sessionDate => ({
      SessionID: createPlatformId("GTS"),
      RunID: clean(run.RunID),
      SubjectID: clean(subject.SubjectID),
      ModuleID: module ? clean(module.ModuleID) : "",
      SessionDate: sessionDate,
      StartTime: startTime,
      EndTime: endTime,
      TeacherAccountID: clean(teacher?.AccountID),
      ZoomLink: zoomLink,
      Active: true,
      CreatedDate: timestamp,
      CreatedByAccountID: permission.user.accountid,
      CreatedByAccountName: permission.user.username,
      ModifiedByAccountID: "",
      ModifiedByAccountName: "",
      ModifiedDate: ""
    }));

    const calendarWarnings = noTeachingEventsOnDates(tables.AcademyCalendar, dates);
    await writeGeneratedSessions(env, permission.user, tables, run, records, timestamp);
    const publishedSourceIds = publishedSourceIdSet(tables.PublishedGlobalTimetableSessions);
    return json({
      success: true,
      message: `${records.length} exact-dated global timetable session${records.length === 1 ? "" : "s"} generated`,
      sessions: records.map(row => enrichSession(mapGlobalTimetableSession(row, publishedSourceIds), tables)),
      calendarWarnings,
      state: developmentStateForResponse(tables, run.RunID)
    });
  } catch (error) {
    return globalTimetableMutationError(error, env);
  }
}

export async function savePlatformGlobalTimetableSessionEndpoint(request, env) {
  const permission = await requireGlobalTimetableAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const sessionId = clean(body.sessionId || body.sessionid);
    if (!sessionId) throw clientError("SessionID is required", 400);

    const tables = await readGlobalTimetableTables(env);
    const existing = uniqueRecord(tables.GlobalTimetableSessions, "SessionID", sessionId, "Global timetable session");
    const run = activeRun(tables, existing.RunID);
    requireEditableGlobalTimetable(tables, run.RunID);
    const subject = activeSubject(tables, run.SubjectID);
    const moduleId = clean(body.moduleId ?? body.moduleid ?? existing.ModuleID);
    const sessionDate = clean(body.sessionDate || body.sessiondate || existing.SessionDate);
    const startTime = normalizeSubmittedTime(body.startTime || body.starttime || existing.StartTime);
    const endTime = normalizeSubmittedTime(body.endTime || body.endtime || existing.EndTime);
    const teacherAccountId = clean(body.teacherAccountId ?? body.teacheraccountid ?? existing.TeacherAccountID);
    const zoomLink = clean(body.zoomLink ?? body.zoomlink ?? existing.ZoomLink);
    const active = readBoolean(body.active, isActivePlatformValue(existing.Active));
    const existingLifecycle = resolveCurrentSessionLifecycle(tables.GlobalTimetableSessionLifecycle, existing.SessionID);
    const requestedStatus = normalizeGlobalSessionStatus(body.status || existingLifecycle.status);
    if (!GLOBAL_SESSION_STATUSES.includes(requestedStatus)) throw clientError("Session status is invalid", 400);
    if (existingLifecycle.status === GLOBAL_SESSION_STATUS_RESCHEDULED && requestedStatus !== GLOBAL_SESSION_STATUS_RESCHEDULED) {
      throw clientError("A rescheduled source session keeps its RESCHEDULED status; edit the linked replacement instead", 409);
    }

    if (!validateIsoDate(sessionDate) || !sessionWithinRun({ SessionDate: sessionDate }, run)) {
      throw clientError("SessionDate must be a valid date within the selected run", 400);
    }
    if (!validateTimeRange(startTime, endTime)) throw clientError("StartTime and EndTime require a valid increasing HH:MM range", 400);
    validateZoomLink(zoomLink);
    const module = resolveModule(tables, moduleId, subject.SubjectID, { requireActive: false });
    const teacher = optionalActiveTeacher(tables, teacherAccountId);

    if (active && requestedStatus === GLOBAL_SESSION_STATUS_SCHEDULED && hasActiveSlotConflict(tables.GlobalTimetableSessions, {
      runId: run.RunID,
      sessionDate,
      startTime,
      endTime,
      excludeSessionId: existing.SessionID
    }, tables.GlobalTimetableSessionLifecycle)) {
      throw clientError("This edit overlaps another scheduled session in the same course", 409);
    }

    const timestamp = new Date().toISOString();
    const record = {
      ...existing,
      ModuleID: module ? clean(module.ModuleID) : "",
      SessionDate: sessionDate,
      StartTime: startTime,
      EndTime: endTime,
      TeacherAccountID: clean(teacher?.AccountID),
      ZoomLink: zoomLink,
      Active: active,
      ModifiedByAccountID: permission.user.accountid,
      ModifiedByAccountName: permission.user.username,
      ModifiedDate: timestamp
    };
    const changedFields = changedRecordFields(existing, record, [
      "ModuleID", "SessionDate", "StartTime", "EndTime", "TeacherAccountID", "ZoomLink", "Active"
    ]);
    const lifecycleMutation = buildCurrentLifecycleMutation(tables, existing.SessionID, {
      status: requestedStatus,
      rescheduledFromSessionId: existingLifecycle.rescheduledfromsessionid,
      rescheduledToSessionId: existingLifecycle.rescheduledtosessionid
    }, permission.user, timestamp);

    if (!changedFields.length && !lifecycleMutation) {
      return json({
        success: true,
        message: "No global timetable session changes requested",
        session: enrichSession(mapGlobalTimetableSession(existing, publishedSourceIdSet(tables.PublishedGlobalTimetableSessions)), tables),
        lifecycle: existingLifecycle
      });
    }

    await writeSessionUpdate(env, permission.user, tables, run, existing, record, changedFields, lifecycleMutation, timestamp);
    return json({
      success: true,
      message: requestedStatus === GLOBAL_SESSION_STATUS_CANCELLED ? "Session marked CANCELLED" : "Global timetable session updated",
      session: enrichSession(mapGlobalTimetableSession(record, publishedSourceIdSet(tables.PublishedGlobalTimetableSessions)), tables),
      lifecycle: lifecycleMutation ? mapGlobalTimetableSessionLifecycle(lifecycleMutation.record) : existingLifecycle
    });
  } catch (error) {
    return globalTimetableMutationError(error, env);
  }
}

export async function savePlatformGlobalTimetableSessionBatchEndpoint(request, env) {
  const permission = await requireGlobalTimetableAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const runId = clean(body.runId || body.runid);
    const changes = Array.isArray(body.changes) ? body.changes : [];
    if (!runId) throw clientError("RunID is required", 400);
    if (changes.length > 100) throw clientError("Save no more than 100 session changes at once", 400);
    if (!changes.length) return json({ success: true, message: "No session changes requested", changed: 0, sessions: [], lifecycles: [], calendarWarnings: [] });

    const tables = await readGlobalTimetableTables(env);
    const run = activeRun(tables, runId);
    requireEditableGlobalTimetable(tables, run.RunID);
    const subject = activeSubject(tables, run.SubjectID);
    const timestamp = new Date().toISOString();
    const stagedSessions = tables.GlobalTimetableSessions.map(row => ({ ...row }));
    const stagedLifecycles = tables.GlobalTimetableSessionLifecycle.map(row => ({ ...row }));
    const seen = new Set();
    const mutations = [];
    let nextLifecycleRow = nextRowNumber(stagedLifecycles);

    for (const rawChange of changes) {
      const change = rawChange && typeof rawChange === "object" ? rawChange : {};
      const sessionId = clean(change.sessionId || change.sessionid);
      if (!sessionId) throw clientError("Every session change requires SessionID", 400);
      const sessionKey = normalizePlatformIdentifier(sessionId);
      if (seen.has(sessionKey)) throw clientError("The same session cannot be changed twice in one save", 400);
      seen.add(sessionKey);

      const existingIndex = stagedSessions.findIndex(row => normalizePlatformIdentifier(row.SessionID) === sessionKey);
      if (existingIndex < 0) throw clientError(`Session ${sessionId} was not found`, 404);
      const existing = stagedSessions[existingIndex];
      if (normalizePlatformIdentifier(existing.RunID) !== normalizePlatformIdentifier(run.RunID)) {
        throw clientError("Every session change must belong to the selected course", 409);
      }

      const existingLifecycle = resolveCurrentSessionLifecycle(stagedLifecycles, existing.SessionID);
      if (existingLifecycle.status === GLOBAL_SESSION_STATUS_RESCHEDULED) {
        throw clientError("A historical RESCHEDULED source session cannot be edited; edit its replacement session instead", 409);
      }
      const requestedStatus = normalizeGlobalSessionStatus(change.status || existingLifecycle.status);
      if (![GLOBAL_SESSION_STATUS_SCHEDULED, GLOBAL_SESSION_STATUS_CANCELLED].includes(requestedStatus)) {
        throw clientError("Session status must be SCHEDULED or CANCELLED", 400);
      }

      const moduleId = clean(change.moduleId ?? change.moduleid ?? existing.ModuleID);
      const sessionDate = clean(change.sessionDate ?? change.sessiondate ?? existing.SessionDate);
      const startTime = normalizeSubmittedTime(change.startTime ?? change.starttime ?? existing.StartTime);
      const endTime = normalizeSubmittedTime(change.endTime ?? change.endtime ?? existing.EndTime);
      const teacherAccountId = clean(change.teacherAccountId ?? change.teacheraccountid ?? existing.TeacherAccountID);
      const zoomLink = clean(change.zoomLink ?? change.zoomlink ?? existing.ZoomLink);
      const active = readBoolean(change.active, isActivePlatformValue(existing.Active));

      if (!validateIsoDate(sessionDate) || !sessionWithinRun({ SessionDate: sessionDate }, run)) {
        throw clientError(`Session ${sessionId} date must be within the selected course`, 400);
      }
      if (!validateTimeRange(startTime, endTime)) throw clientError(`Session ${sessionId} requires a valid increasing HH:MM time range`, 400);
      validateZoomLink(zoomLink);
      const module = resolveModule(tables, moduleId, subject.SubjectID, { requireActive: false });
      const teacher = optionalActiveTeacher(tables, teacherAccountId);

      const record = {
        ...existing,
        ModuleID: module ? clean(module.ModuleID) : "",
        SessionDate: sessionDate,
        StartTime: startTime,
        EndTime: endTime,
        TeacherAccountID: clean(teacher?.AccountID),
        ZoomLink: zoomLink,
        Active: active,
        ModifiedByAccountID: permission.user.accountid,
        ModifiedByAccountName: permission.user.username,
        ModifiedDate: timestamp
      };
      const changedFields = changedRecordFields(existing, record, [
        "ModuleID", "SessionDate", "StartTime", "EndTime", "TeacherAccountID", "ZoomLink", "Active"
      ]);
      const stagedTables = { ...tables, GlobalTimetableSessionLifecycle: stagedLifecycles };
      const lifecycleMutation = buildCurrentLifecycleMutation(stagedTables, existing.SessionID, {
        status: requestedStatus,
        rescheduledFromSessionId: existingLifecycle.rescheduledfromsessionid,
        rescheduledToSessionId: existingLifecycle.rescheduledtosessionid
      }, permission.user, timestamp);

      if (!changedFields.length && !lifecycleMutation) continue;
      stagedSessions[existingIndex] = record;

      let lifecycleRowNumber = 0;
      if (lifecycleMutation) {
        lifecycleRowNumber = lifecycleMutation.existingRowNumber || nextLifecycleRow++;
        const stagedLifecycleRecord = { ...lifecycleMutation.record, _rowNumber: lifecycleRowNumber };
        const lifecycleIndex = stagedLifecycles.findIndex(row => Number(row._rowNumber) === Number(lifecycleRowNumber));
        if (lifecycleIndex >= 0) stagedLifecycles[lifecycleIndex] = stagedLifecycleRecord;
        else stagedLifecycles.push(stagedLifecycleRecord);
      }
      mutations.push({ existing, record, changedFields, lifecycleMutation, lifecycleRowNumber });
    }

    if (!mutations.length) {
      return json({ success: true, message: "No session changes requested", changed: 0, sessions: [], lifecycles: [], calendarWarnings: [] });
    }

    // Validate conflicts against the complete proposed timetable, not change-by-change.
    // This allows safe swaps/moves that would fail if each row were written separately.
    for (const mutation of mutations) {
      const lifecycle = resolveCurrentSessionLifecycle(stagedLifecycles, mutation.record.SessionID);
      if (!isActivePlatformValue(mutation.record.Active) || lifecycle.status !== GLOBAL_SESSION_STATUS_SCHEDULED) continue;
      if (hasActiveSlotConflict(stagedSessions, {
        runId: run.RunID,
        sessionDate: clean(mutation.record.SessionDate),
        startTime: normalizeSubmittedTime(mutation.record.StartTime),
        endTime: normalizeSubmittedTime(mutation.record.EndTime),
        excludeSessionId: mutation.record.SessionID
      }, stagedLifecycles)) {
        throw clientError(`Session ${mutation.record.SessionID} overlaps another scheduled session in this course`, 409);
      }
    }

    const writes = [];
    const audits = [];
    for (const mutation of mutations) {
      if (mutation.changedFields.length) {
        writes.push(valueWrite("GlobalTimetableSessions", mutation.existing._rowNumber, recordToRow(mutation.record, PLATFORM_SHEET_HEADERS.GlobalTimetableSessions)));
        audits.push(auditRow(permission.user, timestamp, "UPDATE_GLOBAL_TIMETABLE_SESSION", "GLOBAL_TIMETABLE_SESSION", mutation.record.SessionID, mutation.changedFields));
      }
      if (mutation.lifecycleMutation) {
        writes.push(valueWrite(
          "GlobalTimetableSessionLifecycle",
          mutation.lifecycleRowNumber,
          recordToRow(mutation.lifecycleMutation.record, PLATFORM_SHEET_HEADERS.GlobalTimetableSessionLifecycle)
        ));
        audits.push(mutation.lifecycleMutation.audit);
      }
    }
    const stateMutation = buildDevelopmentStateMutation(tables, run.RunID, permission.user, timestamp);
    if (stateMutation) {
      writes.push(stateMutation.write);
      audits.push(stateMutation.audit);
    }
    if (audits.length) writes.push(rangeWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), audits));

    // All validation above completes before this single Google Sheets batch write.
    await batchUpdateGoogleSheetValues(env, writes, { spreadsheetId: getPlatformSpreadsheetId(env) });
    const publishedSourceIds = publishedSourceIdSet(tables.PublishedGlobalTimetableSessions);
    const savedSessions = mutations.map(mutation => enrichSession(mapGlobalTimetableSession(mutation.record, publishedSourceIds), tables));
    const savedLifecycles = mutations.map(mutation => resolveCurrentSessionLifecycle(stagedLifecycles, mutation.record.SessionID));
    const warningDates = mutations
      .filter(mutation => resolveCurrentSessionLifecycle(stagedLifecycles, mutation.record.SessionID).status === GLOBAL_SESSION_STATUS_SCHEDULED)
      .map(mutation => clean(mutation.record.SessionDate));
    const calendarWarnings = noTeachingEventsOnDates(tables.AcademyCalendar, warningDates);

    return json({
      success: true,
      message: `${mutations.length} session change${mutations.length === 1 ? "" : "s"} saved`,
      changed: mutations.length,
      sessions: savedSessions,
      lifecycles: savedLifecycles,
      calendarWarnings
    });
  } catch (error) {
    return globalTimetableMutationError(error, env);
  }
}

export async function revisePlatformGlobalTimetableEndpoint(request, env) {
  const permission = await requireGlobalTimetableAdmin(request, env);
  if (!permission.ok) return permission.response;
  try {
    const body = await request.json();
    const runId = clean(body.runId || body.runid);
    if (!runId) throw clientError("RunID is required", 400);
    const tables = await readGlobalTimetableTables(env);
    const run = activeRun(tables, runId);
    const matches = tables.GlobalTimetableRunState.filter(row => normalizePlatformIdentifier(row.RunID) === normalizePlatformIdentifier(run.RunID));
    if (matches.length !== 1) throw clientError("Published course requires exactly one timetable state row", 409);
    const state = mapGlobalTimetableRunState(matches[0]);
    if (state.stage !== GLOBAL_TIMETABLE_PUBLISHED_STAGE || !state.currentpublicationid) {
      return json({ success: true, message: "Course timetable is already in DEVELOPMENT", state });
    }
    const timestamp = new Date().toISOString();
    const mutation = buildDevelopmentStateMutation(tables, run.RunID, permission.user, timestamp);
    if (!mutation) return json({ success: true, message: "Course timetable is already in DEVELOPMENT", state });
    await batchUpdateGoogleSheetValues(env, [
      mutation.write,
      valueWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), mutation.audit)
    ], { spreadsheetId: getPlatformSpreadsheetId(env) });
    return json({
      success: true,
      message: "Revision opened. Published timetable remains unchanged until you publish the revision.",
      state: { runid: clean(run.RunID), stage: GLOBAL_TIMETABLE_DEVELOPMENT_STAGE, currentpublicationid: state.currentpublicationid }
    });
  } catch (error) {
    return globalTimetableMutationError(error, env);
  }
}

export async function reschedulePlatformGlobalTimetableSessionEndpoint(request, env) {
  const permission = await requireGlobalTimetableAdmin(request, env);
  if (!permission.ok) return permission.response;
  try {
    const body = await request.json();
    const sourceSessionId = clean(body.sessionId || body.sessionid || body.sourceSessionId);
    if (!sourceSessionId) throw clientError("SessionID is required", 400);
    const tables = await readGlobalTimetableTables(env);
    const source = uniqueRecord(tables.GlobalTimetableSessions, "SessionID", sourceSessionId, "Global timetable session");
    const sourceLifecycle = resolveCurrentSessionLifecycle(tables.GlobalTimetableSessionLifecycle, source.SessionID);
    if (sourceLifecycle.status === GLOBAL_SESSION_STATUS_RESCHEDULED || sourceLifecycle.rescheduledtosessionid) {
      throw clientError("This session is already rescheduled", 409);
    }
    const run = activeRun(tables, source.RunID);
    requireEditableGlobalTimetable(tables, run.RunID);
    const subject = activeSubject(tables, run.SubjectID);
    const sessionDate = clean(body.sessionDate || body.sessiondate);
    const startTime = normalizeSubmittedTime(body.startTime || body.starttime);
    const endTime = normalizeSubmittedTime(body.endTime || body.endtime);
    const moduleId = clean(body.moduleId ?? body.moduleid ?? source.ModuleID);
    const teacherAccountId = clean(body.teacherAccountId ?? body.teacheraccountid ?? source.TeacherAccountID);
    const zoomLink = clean(body.zoomLink ?? body.zoomlink ?? source.ZoomLink);
    if (!validateIsoDate(sessionDate) || !sessionWithinRun({ SessionDate: sessionDate }, run)) {
      throw clientError("Replacement date must be within the course dates", 400);
    }
    if (!validateTimeRange(startTime, endTime)) throw clientError("Replacement time requires a valid increasing HH:MM range", 400);
    validateZoomLink(zoomLink);
    const module = resolveModule(tables, moduleId, subject.SubjectID, { requireActive: false });
    const teacher = optionalActiveTeacher(tables, teacherAccountId);
    if (hasActiveSlotConflict(tables.GlobalTimetableSessions, {
      runId: run.RunID, sessionDate, startTime, endTime, excludeSessionId: source.SessionID
    }, tables.GlobalTimetableSessionLifecycle)) {
      throw clientError("Replacement overlaps another scheduled session in the same course", 409);
    }
    const timestamp = new Date().toISOString();
    const replacement = {
      SessionID: createPlatformId("GTS"), RunID: clean(run.RunID), SubjectID: clean(subject.SubjectID),
      ModuleID: module ? clean(module.ModuleID) : "", SessionDate: sessionDate, StartTime: startTime, EndTime: endTime,
      TeacherAccountID: clean(teacher?.AccountID), ZoomLink: zoomLink, Active: true,
      CreatedDate: timestamp, CreatedByAccountID: permission.user.accountid, CreatedByAccountName: permission.user.username,
      ModifiedByAccountID: "", ModifiedByAccountName: "", ModifiedDate: ""
    };
    const sourceLifecycleMutation = buildCurrentLifecycleMutation(tables, source.SessionID, {
      status: GLOBAL_SESSION_STATUS_RESCHEDULED,
      rescheduledFromSessionId: sourceLifecycle.rescheduledfromsessionid,
      rescheduledToSessionId: replacement.SessionID
    }, permission.user, timestamp, { force: true });
    const replacementLifecycleMutation = buildCurrentLifecycleMutation(tables, replacement.SessionID, {
      status: GLOBAL_SESSION_STATUS_SCHEDULED,
      rescheduledFromSessionId: source.SessionID,
      rescheduledToSessionId: ""
    }, permission.user, timestamp, { force: true });
    await writeRescheduledSession(env, permission.user, tables, run, source, replacement, sourceLifecycleMutation, replacementLifecycleMutation, timestamp);
    return json({
      success: true,
      message: "Session rescheduled. Publish the revision to make the change current for students.",
      sourceLifecycle: mapGlobalTimetableSessionLifecycle(sourceLifecycleMutation.record),
      replacement: enrichSession(mapGlobalTimetableSession(replacement, publishedSourceIdSet(tables.PublishedGlobalTimetableSessions)), tables),
      replacementLifecycle: mapGlobalTimetableSessionLifecycle(replacementLifecycleMutation.record)
    });
  } catch (error) {
    return globalTimetableMutationError(error, env);
  }
}

export async function publishPlatformGlobalTimetableEndpoint(request, env) {
  const permission = await requireGlobalTimetableAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const runId = clean(body.runId || body.runid);
    if (!runId) throw clientError("RunID is required", 400);

    const tables = await readGlobalTimetableTables(env);
    const run = activeRun(tables, runId);
    const subject = activeSubject(tables, run.SubjectID);
    const sessions = activeGlobalTimetableSessionsForRun(tables.GlobalTimetableSessions, run.RunID);
    if (!sessions.length) throw clientError("Publish requires at least one active global timetable session", 409);
    const sessionLifecycles = validateSessionsForPublication(tables, run, subject, sessions);

    const timestamp = new Date().toISOString();
    const versionNo = Math.max(0, ...tables.GlobalTimetablePublications
      .filter(row => normalizePlatformIdentifier(row.RunID) === normalizePlatformIdentifier(run.RunID))
      .map(row => Number(row.VersionNo) || 0)) + 1;
    const publicationId = createPlatformId("GTPUB");
    const publication = {
      PublicationID: publicationId,
      RunID: clean(run.RunID),
      SubjectID: clean(subject.SubjectID),
      VersionNo: versionNo,
      PublishedDate: timestamp,
      PublishedByAccountID: permission.user.accountid,
      PublishedByAccountName: permission.user.username,
      SessionCount: sessions.length
    };
    const { snapshots, lifecycleSnapshots } = buildSnapshotRows(
      tables, publication, run, subject, sessions, sessionLifecycles, permission.user, timestamp
    );

    await writePublication(env, permission.user, tables, run, publication, snapshots, lifecycleSnapshots, timestamp);
    return json({
      success: true,
      message: `Global timetable publication ${versionNo} created`,
      publication: mapGlobalTimetablePublication(publication),
      sessions: snapshots.map(mapPublishedGlobalTimetableSession),
      globalTimetableVersion: readGlobalTimetableVersion(tables.PlatformConfig).value + 1
    });
  } catch (error) {
    return globalTimetableMutationError(error, env);
  }
}

async function requireGlobalTimetableAdmin(request, env) {
  if (request.method !== "POST") {
    return { ok: false, response: json({ success: false, error: "Method not allowed" }, 405) };
  }
  const user = await getAuthUser(request, env);
  if (!user) return { ok: false, response: json({ success: false, error: "Unauthorized" }, 401) };
  const authority = normalizePlatformIdentifier(user.role);
  if (user.type !== "account" || !["ADMIN", "GLOBAL_ADMIN"].includes(authority)) {
    return { ok: false, response: json({ success: false, error: "ADMIN or GLOBAL_ADMIN authority is required" }, 403) };
  }
  return {
    ok: true,
    user: {
      accountid: clean(user.accountid),
      username: clean(user.username || "Global Admin"),
      role: authority,
      courseid: clean(user.courseid)
    }
  };
}

async function readGlobalTimetableTables(env) {
  const names = [
    "GlobalSubjectList",
    "GlobalModuleList",
    "GlobalSubjectRuns",
    "UserAccounts",
    "GlobalTimetableSessions",
    "GlobalTimetableRunState",
    "GlobalTimetablePublications",
    "PublishedGlobalTimetableSessions",
    "GlobalTimetableSessionLifecycle",
    "AcademyCalendar",
    "PlatformConfig",
    "PlatformAuditLog"
  ];
  const entries = await Promise.all(names.map(async name => [name, await readPlatformSheet(env, name)]));
  const tables = Object.fromEntries(entries);
  requireGlobalTimetableSchema(tables.PlatformConfig);
  return tables;
}

function requireGlobalTimetableSchema(configRows) {
  const matches = (configRows || []).filter(row => (
    normalizePlatformIdentifier(row.ConfigKey) === "PLATFORMSCHEMAVERSION"
  ));
  const version = clean(matches[0]?.ConfigValue);
  if (matches.length !== 1 || !TIMETABLE_SCHEMA_VERSIONS.has(version)) {
    throw new Error("Global timetable requires PlatformSchemaVersion 102.0.7 or 102.0.8");
  }
}

async function writeGeneratedSessions(env, user, tables, run, records, timestamp) {
  const writes = [];
  const firstRow = nextRowNumber(tables.GlobalTimetableSessions);
  if (records.length) {
    writes.push(rangeWrite("GlobalTimetableSessions", firstRow, records.map(record => recordToRow(record, PLATFORM_SHEET_HEADERS.GlobalTimetableSessions))));
  }
  const stateMutation = buildDevelopmentStateMutation(tables, run.RunID, user, timestamp);
  if (stateMutation) writes.push(stateMutation.write);

  const auditRows = records.map(record => auditRow(user, timestamp, "GENERATE_GLOBAL_TIMETABLE_SESSION", "GLOBAL_TIMETABLE_SESSION", record.SessionID,
    ["RunID", "SubjectID", "ModuleID", "SessionDate", "StartTime", "EndTime", "TeacherAccountID", "ZoomLink", "Active"]));
  if (stateMutation) auditRows.push(stateMutation.audit);
  if (auditRows.length) writes.push(rangeWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), auditRows));
  await batchUpdateGoogleSheetValues(env, writes, { spreadsheetId: getPlatformSpreadsheetId(env) });
}

async function writeSessionUpdate(env, user, tables, run, existing, record, changedFields, lifecycleMutation, timestamp) {
  const writes = [
    valueWrite("GlobalTimetableSessions", existing._rowNumber, recordToRow(record, PLATFORM_SHEET_HEADERS.GlobalTimetableSessions))
  ];
  if (lifecycleMutation) writes.push(lifecycleMutation.write);
  const stateMutation = buildDevelopmentStateMutation(tables, run.RunID, user, timestamp);
  if (stateMutation) writes.push(stateMutation.write);
  const audits = [];
  if (changedFields.length) {
    audits.push(auditRow(user, timestamp, "UPDATE_GLOBAL_TIMETABLE_SESSION", "GLOBAL_TIMETABLE_SESSION", record.SessionID, changedFields));
  }
  if (lifecycleMutation) audits.push(lifecycleMutation.audit);
  if (stateMutation) audits.push(stateMutation.audit);
  if (audits.length) writes.push(rangeWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), audits));
  await batchUpdateGoogleSheetValues(env, writes, { spreadsheetId: getPlatformSpreadsheetId(env) });
}

async function writeRescheduledSession(env, user, tables, run, source, replacement, sourceLifecycleMutation, replacementLifecycleMutation, timestamp) {
  const stateMutation = buildDevelopmentStateMutation(tables, run.RunID, user, timestamp);
  let nextLifecycleRow = nextRowNumber(tables.GlobalTimetableSessionLifecycle);
  const lifecycleWrite = mutation => {
    const rowNumber = mutation.existingRowNumber || nextLifecycleRow++;
    return valueWrite("GlobalTimetableSessionLifecycle", rowNumber,
      recordToRow(mutation.record, PLATFORM_SHEET_HEADERS.GlobalTimetableSessionLifecycle));
  };
  const writes = [
    valueWrite("GlobalTimetableSessions", nextRowNumber(tables.GlobalTimetableSessions), recordToRow(replacement, PLATFORM_SHEET_HEADERS.GlobalTimetableSessions)),
    lifecycleWrite(sourceLifecycleMutation),
    lifecycleWrite(replacementLifecycleMutation)
  ];
  if (stateMutation) writes.push(stateMutation.write);
  const audits = [
    auditRow(user, timestamp, "RESCHEDULE_GLOBAL_TIMETABLE_SESSION", "GLOBAL_TIMETABLE_SESSION", source.SessionID,
      ["Status", "RescheduledToSessionID"]),
    auditRow(user, timestamp, "CREATE_RESCHEDULED_GLOBAL_TIMETABLE_SESSION", "GLOBAL_TIMETABLE_SESSION", replacement.SessionID,
      ["RunID", "SubjectID", "ModuleID", "SessionDate", "StartTime", "EndTime", "TeacherAccountID", "ZoomLink", "Active", "RescheduledFromSessionID"])
  ];
  if (stateMutation) audits.push(stateMutation.audit);
  writes.push(rangeWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), audits));
  await batchUpdateGoogleSheetValues(env, writes, { spreadsheetId: getPlatformSpreadsheetId(env) });
}

async function writePublication(env, user, tables, run, publication, snapshots, lifecycleSnapshots, timestamp) {
  const version = readGlobalTimetableVersion(tables.PlatformConfig);
  const nextVersion = version.value + 1;
  const stateWrite = buildPublishedStateWrite(tables, run.RunID, publication.PublicationID, user, timestamp);
  const writes = [
    valueWrite("GlobalTimetablePublications", nextRowNumber(tables.GlobalTimetablePublications), recordToRow(publication, PLATFORM_SHEET_HEADERS.GlobalTimetablePublications)),
    rangeWrite("PublishedGlobalTimetableSessions", nextRowNumber(tables.PublishedGlobalTimetableSessions), snapshots.map(record => recordToRow(record, PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions))),
    rangeWrite("GlobalTimetableSessionLifecycle", nextRowNumber(tables.GlobalTimetableSessionLifecycle), lifecycleSnapshots.map(record => recordToRow(record, PLATFORM_SHEET_HEADERS.GlobalTimetableSessionLifecycle))),
    stateWrite.write,
    {
      range: `'PlatformConfig'!B${version.rowNumber}:E${version.rowNumber}`,
      majorDimension: "ROWS",
      values: [[nextVersion, timestamp, user.accountid, user.username]]
    },
    valueWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), auditRow(
      user, timestamp, "PUBLISH_GLOBAL_TIMETABLE", "GLOBAL_TIMETABLE_PUBLICATION", publication.PublicationID,
      ["RunID", "SubjectID", "VersionNo", "PublishedDate", "SessionCount"]
    ))
  ];
  await batchUpdateGoogleSheetValues(env, writes, { spreadsheetId: getPlatformSpreadsheetId(env) });
}

function buildSnapshotRows(tables, publication, run, subject, sessions, sessionLifecycles, user, timestamp) {
  const snapshots = [];
  const lifecycleSnapshots = [];
  for (const session of [...sessions].sort((a, b) => `${clean(a.SessionDate)} ${clean(a.StartTime)}`.localeCompare(`${clean(b.SessionDate)} ${clean(b.StartTime)}`))) {
    const module = resolveModule(tables, session.ModuleID, subject.SubjectID, { requireActive: false });
    const lifecycle = sessionLifecycles.get(normalizePlatformIdentifier(session.SessionID)) || resolveCurrentSessionLifecycle(tables.GlobalTimetableSessionLifecycle, session.SessionID);
    const teacher = optionalActiveTeacher(tables, session.TeacherAccountID);
    snapshots.push({
      PublishedSessionID: createPlatformId("GTPSESSION"),
      PublicationID: publication.PublicationID,
      SourceSessionID: clean(session.SessionID),
      RunID: clean(run.RunID),
      SubjectID: clean(subject.SubjectID),
      ModuleID: module ? clean(module.ModuleID) : "",
      SessionDate: clean(session.SessionDate),
      StartTime: normalizeSubmittedTime(session.StartTime),
      EndTime: normalizeSubmittedTime(session.EndTime),
      TeacherAccountID: clean(teacher?.AccountID),
      ZoomLink: clean(session.ZoomLink),
      PublishedDate: timestamp,
      PublishedByAccountID: user.accountid,
      PublishedByAccountName: user.username,
      RunName: clean(run.RunName),
      SubjectName: clean(subject.SubjectName),
      ModuleName: module ? clean(module.ModuleName) : "",
      TeacherName: clean(teacher?.DisplayName) || "TBA",
      Timezone: clean(run.Timezone)
    });
    lifecycleSnapshots.push({
      SessionLifecycleID: createPlatformId("GTLIFE"),
      SessionID: clean(session.SessionID),
      PublicationID: publication.PublicationID,
      Status: normalizeGlobalSessionStatus(lifecycle.status),
      RescheduledFromSessionID: clean(lifecycle.rescheduledfromsessionid),
      RescheduledToSessionID: clean(lifecycle.rescheduledtosessionid),
      CreatedDate: timestamp,
      CreatedByAccountID: user.accountid,
      CreatedByAccountName: user.username,
      ModifiedByAccountID: "",
      ModifiedByAccountName: "",
      ModifiedDate: ""
    });
  }
  return { snapshots, lifecycleSnapshots };
}

function requireEditableGlobalTimetable(tables, runId) {
  const matches = tables.GlobalTimetableRunState.filter(row => (
    normalizePlatformIdentifier(row.RunID) === normalizePlatformIdentifier(runId)
  ));
  if (matches.length > 1) throw clientError("Global timetable run has duplicate state rows", 409);
  if (!matches.length) return;
  const stage = normalizePlatformIdentifier(matches[0].Stage);
  if (stage === GLOBAL_TIMETABLE_PUBLISHED_STAGE) {
    throw clientError("Revise timetable before modifying a published course", 409);
  }
  if (stage && stage !== GLOBAL_TIMETABLE_DEVELOPMENT_STAGE) {
    throw clientError("Global timetable run has an invalid stage", 409);
  }
}

function buildDevelopmentStateMutation(tables, runId, user, timestamp) {
  const matches = tables.GlobalTimetableRunState.filter(row => (
    normalizePlatformIdentifier(row.RunID) === normalizePlatformIdentifier(runId)
  ));
  if (matches.length > 1) throw clientError("Global timetable run has duplicate state rows", 409);
  const existing = matches[0] || null;
  if (existing && normalizePlatformIdentifier(existing.Stage) === GLOBAL_TIMETABLE_DEVELOPMENT_STAGE) return null;
  const record = existing ? {
    ...existing,
    Stage: GLOBAL_TIMETABLE_DEVELOPMENT_STAGE,
    CurrentPublicationID: clean(existing.CurrentPublicationID),
    ModifiedByAccountID: user.accountid,
    ModifiedByAccountName: user.username,
    ModifiedDate: timestamp
  } : {
    RunID: clean(runId),
    Stage: GLOBAL_TIMETABLE_DEVELOPMENT_STAGE,
    CurrentPublicationID: "",
    CreatedDate: timestamp,
    CreatedByAccountID: user.accountid,
    CreatedByAccountName: user.username,
    ModifiedByAccountID: "",
    ModifiedByAccountName: "",
    ModifiedDate: ""
  };
  const action = existing ? "UPDATE_GLOBAL_TIMETABLE_STATE" : "CREATE_GLOBAL_TIMETABLE_STATE";
  return {
    write: valueWrite("GlobalTimetableRunState", existing?._rowNumber || nextRowNumber(tables.GlobalTimetableRunState), recordToRow(record, PLATFORM_SHEET_HEADERS.GlobalTimetableRunState)),
    audit: auditRow(user, timestamp, action, "GLOBAL_TIMETABLE_RUN_STATE", clean(runId), ["Stage", "CurrentPublicationID"])
  };
}

function buildPublishedStateWrite(tables, runId, publicationId, user, timestamp) {
  const matches = tables.GlobalTimetableRunState.filter(row => (
    normalizePlatformIdentifier(row.RunID) === normalizePlatformIdentifier(runId)
  ));
  if (matches.length > 1) throw clientError("Global timetable run has duplicate state rows", 409);
  const existing = matches[0] || null;
  const record = existing ? {
    ...existing,
    Stage: GLOBAL_TIMETABLE_PUBLISHED_STAGE,
    CurrentPublicationID: publicationId,
    ModifiedByAccountID: user.accountid,
    ModifiedByAccountName: user.username,
    ModifiedDate: timestamp
  } : {
    RunID: clean(runId),
    Stage: GLOBAL_TIMETABLE_PUBLISHED_STAGE,
    CurrentPublicationID: publicationId,
    CreatedDate: timestamp,
    CreatedByAccountID: user.accountid,
    CreatedByAccountName: user.username,
    ModifiedByAccountID: "",
    ModifiedByAccountName: "",
    ModifiedDate: ""
  };
  return {
    write: valueWrite("GlobalTimetableRunState", existing?._rowNumber || nextRowNumber(tables.GlobalTimetableRunState), recordToRow(record, PLATFORM_SHEET_HEADERS.GlobalTimetableRunState)),
    record
  };
}

function validateSessionsForPublication(tables, run, subject, sessions) {
  const sourceIds = new Set();
  const slots = new Set();
  const lifecycles = new Map();
  for (const session of sessions) {
    const sourceId = normalizePlatformIdentifier(session.SessionID);
    if (!sourceId || sourceIds.has(sourceId)) throw clientError("Global timetable contains duplicate source SessionID values", 409);
    sourceIds.add(sourceId);
    if (normalizePlatformIdentifier(session.RunID) !== normalizePlatformIdentifier(run.RunID) ||
        normalizePlatformIdentifier(session.SubjectID) !== normalizePlatformIdentifier(subject.SubjectID)) {
      throw clientError("Global timetable session has an invalid run/subject relationship", 409);
    }
    if (!sessionWithinRun(session, run)) throw clientError("Global timetable session falls outside its course dates", 409);
    if (!validateTimeRange(session.StartTime, session.EndTime)) throw clientError("Global timetable session has an invalid time range", 409);
    resolveModule(tables, session.ModuleID, subject.SubjectID, { requireActive: false });
    const lifecycle = resolveCurrentSessionLifecycle(tables.GlobalTimetableSessionLifecycle, session.SessionID);
    lifecycles.set(sourceId, lifecycle);
    optionalActiveTeacher(tables, session.TeacherAccountID);
    validateZoomLink(session.ZoomLink);
    if (lifecycle.status === GLOBAL_SESSION_STATUS_SCHEDULED) {
      const slot = `${clean(session.SessionDate)}|${normalizeSubmittedTime(session.StartTime)}|${normalizeSubmittedTime(session.EndTime)}`;
      if (slots.has(slot)) throw clientError("Global timetable contains duplicate scheduled date/time slots", 409);
      slots.add(slot);
    }
    if (lifecycle.status === GLOBAL_SESSION_STATUS_RESCHEDULED && !normalizePlatformIdentifier(lifecycle.rescheduledtosessionid)) {
      throw clientError("A RESCHEDULED session must link to its replacement session", 409);
    }
  }
  for (const [sessionId, lifecycle] of lifecycles) {
    if (lifecycle.status !== GLOBAL_SESSION_STATUS_RESCHEDULED) continue;
    const replacementId = normalizePlatformIdentifier(lifecycle.rescheduledtosessionid);
    if (!sourceIds.has(replacementId)) {
      throw clientError(`Rescheduled session ${sessionId} points to a replacement that is not active in this course`, 409);
    }
    const replacementLifecycle = lifecycles.get(replacementId);
    if (normalizePlatformIdentifier(replacementLifecycle?.rescheduledfromsessionid) !== sessionId) {
      throw clientError("Rescheduled session linkage is inconsistent", 409);
    }
  }
  return lifecycles;
}

function activeRun(tables, runId) {
  const run = uniqueRecord(tables.GlobalSubjectRuns, "RunID", runId, "Global subject run");
  if (!isActivePlatformValue(run.Active)) throw clientError("Global timetable requires an active global-subject run", 409);
  return run;
}

function activeSubject(tables, subjectId) {
  const subject = uniqueRecord(tables.GlobalSubjectList, "SubjectID", subjectId, "Global subject");
  if (!isActivePlatformValue(subject.Active)) throw clientError("Global timetable requires an active global subject", 409);
  return subject;
}

function resolveModule(tables, moduleId, subjectId, { requireActive = false } = {}) {
  if (!clean(moduleId)) return null;
  const module = uniqueRecord(tables.GlobalModuleList, "ModuleID", moduleId, "Global module");
  if (normalizePlatformIdentifier(module.SubjectID) !== normalizePlatformIdentifier(subjectId)) {
    throw clientError("Module does not belong to this global subject", 409);
  }
  if (requireActive && !isActivePlatformValue(module.Active)) throw clientError("Global timetable requires an active module", 409);
  return module;
}

function activeTeacher(tables, accountId) {
  const teacher = uniqueRecord(tables.UserAccounts, "AccountID", accountId, "Teacher account");
  if (!isActivePlatformValue(teacher.Active)) throw clientError("Teacher account must be active", 409);
  return teacher;
}

function optionalActiveTeacher(tables, accountId) {
  if (!clean(accountId)) return null;
  return activeTeacher(tables, accountId);
}

function hasActiveSlotConflict(rows, { runId, sessionDate, startTime, endTime, excludeSessionId = "" }, lifecycleRows = []) {
  const runKey = normalizePlatformIdentifier(runId);
  const exclude = normalizePlatformIdentifier(excludeSessionId);
  return (rows || []).some(row => {
    if (!isActivePlatformValue(row.Active)) return false;
    if (normalizePlatformIdentifier(row.RunID) !== runKey) return false;
    if (exclude && normalizePlatformIdentifier(row.SessionID) === exclude) return false;
    const lifecycle = resolveCurrentSessionLifecycle(lifecycleRows, row.SessionID);
    if (lifecycle.status !== GLOBAL_SESSION_STATUS_SCHEDULED) return false;
    if (clean(row.SessionDate) !== clean(sessionDate)) return false;
    const rowStart = normalizeSubmittedTime(row.StartTime);
    const rowEnd = normalizeSubmittedTime(row.EndTime);
    return rowStart < endTime && startTime < rowEnd;
  });
}

function buildCurrentLifecycleMutation(tables, sessionId, requested, user, timestamp, options = {}) {
  const sessionKey = normalizePlatformIdentifier(sessionId);
  const matches = tables.GlobalTimetableSessionLifecycle.filter(row => (
    !clean(row.PublicationID) && normalizePlatformIdentifier(row.SessionID) === sessionKey
  ));
  if (matches.length > 1) throw clientError("Global timetable session has duplicate current lifecycle rows", 409);
  const existing = matches[0] || null;
  const status = normalizeGlobalSessionStatus(requested?.status);
  const fromId = clean(requested?.rescheduledFromSessionId);
  const toId = clean(requested?.rescheduledToSessionId);
  const current = existing ? mapGlobalTimetableSessionLifecycle(existing) : resolveCurrentSessionLifecycle([], sessionId);
  const changed = options.force === true || current.status !== status ||
    clean(current.rescheduledfromsessionid) !== fromId || clean(current.rescheduledtosessionid) !== toId;
  if (!changed) return null;
  const record = existing ? {
    ...existing,
    Status: status,
    RescheduledFromSessionID: fromId,
    RescheduledToSessionID: toId,
    ModifiedByAccountID: user.accountid,
    ModifiedByAccountName: user.username,
    ModifiedDate: timestamp
  } : {
    SessionLifecycleID: createPlatformId("GTLIFE"),
    SessionID: clean(sessionId),
    PublicationID: "",
    Status: status,
    RescheduledFromSessionID: fromId,
    RescheduledToSessionID: toId,
    CreatedDate: timestamp,
    CreatedByAccountID: user.accountid,
    CreatedByAccountName: user.username,
    ModifiedByAccountID: "",
    ModifiedByAccountName: "",
    ModifiedDate: ""
  };
  const changedFields = ["Status"];
  if (fromId || clean(existing?.RescheduledFromSessionID)) changedFields.push("RescheduledFromSessionID");
  if (toId || clean(existing?.RescheduledToSessionID)) changedFields.push("RescheduledToSessionID");
  return {
    record,
    existingRowNumber: existing?._rowNumber || 0,
    write: valueWrite("GlobalTimetableSessionLifecycle", existing?._rowNumber || nextRowNumber(tables.GlobalTimetableSessionLifecycle), recordToRow(record, PLATFORM_SHEET_HEADERS.GlobalTimetableSessionLifecycle)),
    audit: auditRow(user, timestamp, existing ? "UPDATE_GLOBAL_TIMETABLE_SESSION_LIFECYCLE" : "CREATE_GLOBAL_TIMETABLE_SESSION_LIFECYCLE", "GLOBAL_TIMETABLE_SESSION_LIFECYCLE", record.SessionLifecycleID, changedFields)
  };
}

function publishedSourceIdSet(rows) {
  return new Set((rows || []).map(row => normalizePlatformIdentifier(row.SourceSessionID)).filter(Boolean));
}

function readGlobalTimetableVersion(configRows) {
  const matches = (configRows || []).filter(row => (
    normalizePlatformIdentifier(row.ConfigKey) === "GLOBALTIMETABLEVERSION"
  ));
  const value = Number(matches[0]?.ConfigValue);
  if (matches.length !== 1 || !Number.isInteger(value) || value < 1) {
    throw new Error("PlatformConfig GlobalTimetableVersion must resolve exactly once as a positive integer");
  }
  return { value, rowNumber: matches[0]._rowNumber };
}

function mapSubject(record) {
  return { subjectid: clean(record.SubjectID), subjectname: clean(record.SubjectName), active: isActivePlatformValue(record.Active) };
}
function mapModule(record) {
  return { moduleid: clean(record.ModuleID), subjectid: clean(record.SubjectID), modulename: clean(record.ModuleName), active: isActivePlatformValue(record.Active) };
}
function mapTeacherAccount(record) {
  return { accountid: clean(record.AccountID), displayname: clean(record.DisplayName), active: isActivePlatformValue(record.Active) };
}
function enrichSession(session, tables) {
  const run = findById(tables.GlobalSubjectRuns, "RunID", session.runid);
  const subject = findById(tables.GlobalSubjectList, "SubjectID", session.subjectid);
  const module = session.moduleid ? findById(tables.GlobalModuleList, "ModuleID", session.moduleid) : null;
  const teacher = findById(tables.UserAccounts, "AccountID", session.teacheraccountid);
  return Object.freeze({
    ...session,
    runname: clean(run?.RunName),
    subjectname: clean(subject?.SubjectName),
    modulename: clean(module?.ModuleName),
    teachername: clean(teacher?.DisplayName),
    timezone: clean(run?.Timezone)
  });
}

function developmentStateForResponse(tables, runId) {
  const existing = tables.GlobalTimetableRunState.find(row => normalizePlatformIdentifier(row.RunID) === normalizePlatformIdentifier(runId));
  return {
    runid: clean(runId),
    stage: GLOBAL_TIMETABLE_DEVELOPMENT_STAGE,
    currentpublicationid: clean(existing?.CurrentPublicationID)
  };
}

function uniqueRecord(records, key, value, label) {
  const normalized = normalizePlatformIdentifier(value);
  if (!normalized) throw clientError(`${label} ID is required`, 400);
  const matches = (records || []).filter(record => normalizePlatformIdentifier(record[key]) === normalized);
  if (matches.length === 0) throw clientError(`${label} was not found`, 404);
  if (matches.length > 1) throw clientError(`${label} is duplicated`, 409);
  return matches[0];
}
function findById(records, key, value) {
  const normalized = normalizePlatformIdentifier(value);
  return (records || []).find(record => normalizePlatformIdentifier(record[key]) === normalized) || null;
}
function changedRecordFields(existing, next, keys) {
  return keys.filter(key => String(existing?.[key] ?? "") !== String(next?.[key] ?? ""));
}
function recordToRow(record, headers) {
  return headers.map(header => record?.[header] ?? "");
}
function auditRow(user, timestamp, action, recordType, recordId, changedFields) {
  return [
    createPlatformId("AUDIT"), timestamp, user.accountid, user.username, user.role,
    user.role === "GLOBAL_ADMIN" ? "" : user.courseid,
    action, recordType, recordId, JSON.stringify(changedFields)
  ];
}
function valueWrite(sheetName, rowNumber, row) {
  return {
    range: `'${sheetName}'!A${rowNumber}:${columnName(row.length)}${rowNumber}`,
    majorDimension: "ROWS",
    values: [row]
  };
}
function rangeWrite(sheetName, startRow, rows) {
  const width = rows[0]?.length || PLATFORM_SHEET_HEADERS[sheetName]?.length || 1;
  const endRow = startRow + rows.length - 1;
  return {
    range: `'${sheetName}'!A${startRow}:${columnName(width)}${endRow}`,
    majorDimension: "ROWS",
    values: rows
  };
}
function nextRowNumber(records) {
  return Math.max(1, ...(records || []).map(record => Number(record._rowNumber) || 1)) + 1;
}
function validateZoomLink(value) {
  const link = clean(value);
  if (!link) return;
  if (link.length > MAX_ZOOM_LINK_LENGTH || !HTTPS_URL_PATTERN.test(link)) {
    throw clientError("ZoomLink must be blank or a valid HTTPS URL", 400);
  }
}
function normalizeSubmittedTime(value) {
  const text = clean(value);
  const match = /^(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return text;
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}
function readBoolean(value, fallback) {
  if (value === true || value === false) return value;
  const normalized = normalizePlatformIdentifier(value);
  if (["TRUE", "YES", "ACTIVE", "1"].includes(normalized)) return true;
  if (["FALSE", "NO", "INACTIVE", "0"].includes(normalized)) return false;
  if (fallback !== null && fallback !== undefined) return fallback;
  throw clientError("Active must be true or false", 400);
}
function createPlatformId(prefix) {
  const uuid = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid}`;
}
function columnName(columnNumber) {
  let value = columnNumber;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}
function clientError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}
function globalTimetableMutationError(error, env) {
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
    return json({ success: false, error: clean(error.message) }, error.status);
  }
  return globalTimetableError(error, env);
}
function globalTimetableError(error, env) {
  const response = { success: false, error: "Global timetable service is not ready" };
  if (String(env.M4L_ACCOUNT_AUTH_DIAGNOSTICS || "").trim().toLowerCase() === "true") {
    response.detail = clean(error?.message || "Global timetable service error").replace(/[\r\n\t]+/g, " ").slice(0, 220);
  }
  return json(response, 503);
}
function clean(value) {
  return String(value ?? "").trim();
}
