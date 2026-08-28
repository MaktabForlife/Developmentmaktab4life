/* M4L V102.11 - Exact-dated global timetable development and publication helpers. */

import {
  isActivePlatformValue,
  normalizePlatformIdentifier
} from "./platform-schema.js";

export const GLOBAL_TIMETABLE_DEVELOPMENT_STAGE = "DEVELOPMENT";
export const GLOBAL_TIMETABLE_PUBLISHED_STAGE = "PUBLISHED";
export const GLOBAL_TIMETABLE_STAGES = Object.freeze([
  GLOBAL_TIMETABLE_DEVELOPMENT_STAGE,
  GLOBAL_TIMETABLE_PUBLISHED_STAGE
]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DAY_INDEX = Object.freeze({ SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 });

export function mapGlobalTimetableSession(record, publishedSourceIds = new Set()) {
  const sessionId = clean(record?.SessionID);
  return Object.freeze({
    sessionid: sessionId,
    runid: clean(record?.RunID),
    subjectid: clean(record?.SubjectID),
    moduleid: clean(record?.ModuleID),
    sessiondate: clean(record?.SessionDate),
    starttime: normalizeTime(record?.StartTime),
    endtime: normalizeTime(record?.EndTime),
    teacheraccountid: clean(record?.TeacherAccountID),
    zoomlink: clean(record?.ZoomLink),
    active: isActivePlatformValue(record?.Active),
    everpublished: publishedSourceIds.has(normalizePlatformIdentifier(sessionId)),
    createddate: clean(record?.CreatedDate),
    modifieddate: clean(record?.ModifiedDate)
  });
}

export function mapGlobalTimetableRunState(record) {
  const stage = normalizePlatformIdentifier(record?.Stage);
  return Object.freeze({
    runid: clean(record?.RunID),
    stage: stage === GLOBAL_TIMETABLE_PUBLISHED_STAGE
      ? GLOBAL_TIMETABLE_PUBLISHED_STAGE
      : GLOBAL_TIMETABLE_DEVELOPMENT_STAGE,
    currentpublicationid: clean(record?.CurrentPublicationID),
    createddate: clean(record?.CreatedDate),
    modifieddate: clean(record?.ModifiedDate)
  });
}

export function mapGlobalTimetablePublication(record) {
  return Object.freeze({
    publicationid: clean(record?.PublicationID),
    runid: clean(record?.RunID),
    subjectid: clean(record?.SubjectID),
    versionno: Number(record?.VersionNo) || 0,
    publisheddate: clean(record?.PublishedDate),
    publishedbyaccountid: clean(record?.PublishedByAccountID),
    publishedbyaccountname: clean(record?.PublishedByAccountName),
    sessioncount: Number(record?.SessionCount) || 0
  });
}

export function mapPublishedGlobalTimetableSession(record) {
  return Object.freeze({
    publishedsessionid: clean(record?.PublishedSessionID),
    publicationid: clean(record?.PublicationID),
    sourcesessionid: clean(record?.SourceSessionID),
    runid: clean(record?.RunID),
    subjectid: clean(record?.SubjectID),
    moduleid: clean(record?.ModuleID),
    sessiondate: clean(record?.SessionDate),
    starttime: normalizeTime(record?.StartTime),
    endtime: normalizeTime(record?.EndTime),
    teacheraccountid: clean(record?.TeacherAccountID),
    zoomlink: clean(record?.ZoomLink),
    publisheddate: clean(record?.PublishedDate),
    publishedbyaccountid: clean(record?.PublishedByAccountID),
    publishedbyaccountname: clean(record?.PublishedByAccountName),
    runname: clean(record?.RunName),
    subjectname: clean(record?.SubjectName),
    modulename: clean(record?.ModuleName),
    teachername: clean(record?.TeacherName),
    timezone: clean(record?.Timezone)
  });
}

export function resolveGlobalTimetableRunState(stateRows, runId) {
  const requested = normalizePlatformIdentifier(runId);
  if (!requested) return null;
  const matches = (Array.isArray(stateRows) ? stateRows : []).filter(row => (
    normalizePlatformIdentifier(row.RunID) === requested
  ));
  if (matches.length > 1) throw new Error("Global timetable run has duplicate state rows");
  return matches.length === 1 ? mapGlobalTimetableRunState(matches[0]) : null;
}

export function resolveCurrentPublishedGlobalTimetable(tables, runId) {
  const requested = normalizePlatformIdentifier(runId);
  if (!requested) return integrityFailure("GLOBAL_TIMETABLE_RUN_REQUIRED", "RunID is required");

  const stateMatches = (tables?.GlobalTimetableRunState || []).filter(row => (
    normalizePlatformIdentifier(row.RunID) === requested
  ));
  if (stateMatches.length !== 1) {
    return integrityFailure(
      "GLOBAL_TIMETABLE_STATE_INVALID",
      stateMatches.length ? "Run has duplicate global timetable-state rows" : "Run has no global timetable-state row"
    );
  }
  const state = mapGlobalTimetableRunState(stateMatches[0]);
  if (!state.currentpublicationid) {
    return integrityFailure("GLOBAL_TIMETABLE_NOT_PUBLISHED", "This run has no published global timetable");
  }

  const publicationMatches = (tables?.GlobalTimetablePublications || []).filter(row => (
    normalizePlatformIdentifier(row.PublicationID) === normalizePlatformIdentifier(state.currentpublicationid) &&
    normalizePlatformIdentifier(row.RunID) === requested
  ));
  if (publicationMatches.length !== 1) {
    return integrityFailure(
      "GLOBAL_TIMETABLE_PUBLICATION_INVALID",
      "CurrentPublicationID does not resolve to exactly one global timetable publication"
    );
  }
  const publication = mapGlobalTimetablePublication(publicationMatches[0]);
  if (!publication.subjectid) {
    return integrityFailure("GLOBAL_TIMETABLE_PUBLICATION_SUBJECT_MISSING", "Current publication has no SubjectID");
  }
  const sessions = (tables?.PublishedGlobalTimetableSessions || [])
    .filter(row => (
      normalizePlatformIdentifier(row.PublicationID) === normalizePlatformIdentifier(publication.publicationid) &&
      normalizePlatformIdentifier(row.RunID) === requested
    ))
    .map(mapPublishedGlobalTimetableSession);

  if (sessions.length !== publication.sessioncount) {
    return integrityFailure(
      "GLOBAL_TIMETABLE_SESSION_COUNT_MISMATCH",
      `Publication expects ${publication.sessioncount} sessions but ${sessions.length} snapshot rows were found`
    );
  }
  if (!sessions.length) {
    return integrityFailure("GLOBAL_TIMETABLE_EMPTY", "The current global timetable publication contains no sessions");
  }

  const duplicatePublishedIds = repeatedValues(sessions.map(item => item.publishedsessionid));
  const duplicateSourceIds = repeatedValues(sessions.map(item => item.sourcesessionid));
  if (duplicatePublishedIds.length || duplicateSourceIds.length) {
    return integrityFailure("GLOBAL_TIMETABLE_DUPLICATE_SESSION", "Published global timetable contains duplicate session IDs");
  }

  const incomplete = sessions.filter(session => (
    !session.publishedsessionid || !session.sourcesessionid || !session.runid || !session.subjectid ||
    normalizePlatformIdentifier(session.subjectid) !== normalizePlatformIdentifier(publication.subjectid) ||
    !session.sessiondate || !session.starttime || !session.endtime || !session.teacheraccountid ||
    !session.runname || !session.subjectname || !session.teachername || !session.timezone ||
    (session.moduleid && !session.modulename)
  ));
  if (incomplete.length) {
    return integrityFailure(
      "GLOBAL_TIMETABLE_DISPLAY_VALUES_MISSING",
      `${incomplete.length} published global timetable row${incomplete.length === 1 ? " is" : "s are"} incomplete`
    );
  }

  return Object.freeze({ ok: true, state, publication, sessions: Object.freeze(sessions) });
}

export function generateSessionDates(startDate, endDate, weekdays) {
  if (!validateIsoDate(startDate) || !validateIsoDate(endDate) || endDate < startDate) {
    throw new Error("A valid run StartDate and EndDate are required");
  }
  const indexes = new Set((Array.isArray(weekdays) ? weekdays : [])
    .map(value => DAY_INDEX[normalizePlatformIdentifier(value)])
    .filter(value => Number.isInteger(value)));
  if (!indexes.size) throw new Error("Select at least one weekday");

  const dates = [];
  const cursor = parseIsoDateUtc(startDate);
  const last = parseIsoDateUtc(endDate);
  while (cursor <= last) {
    if (indexes.has(cursor.getUTCDay())) dates.push(formatIsoDateUtc(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function validateIsoDate(value) {
  const text = clean(value);
  if (!DATE_PATTERN.test(text)) return false;
  const parsed = parseIsoDateUtc(text);
  return Boolean(parsed && formatIsoDateUtc(parsed) === text);
}

export function validateTime(value) {
  return TIME_PATTERN.test(clean(value));
}

export function normalizeTime(value) {
  const text = clean(value);
  const match = /^(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return text;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return text;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function validateTimeRange(startTime, endTime) {
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);
  return validateTime(start) && validateTime(end) && end > start;
}

export function sessionWithinRun(session, run) {
  const date = clean(session?.SessionDate || session?.sessiondate);
  return Boolean(
    validateIsoDate(date) &&
    date >= clean(run?.StartDate || run?.startdate) &&
    date <= clean(run?.EndDate || run?.enddate)
  );
}

export function activeGlobalTimetableSessionsForRun(sessionRows, runId) {
  const requested = normalizePlatformIdentifier(runId);
  return (Array.isArray(sessionRows) ? sessionRows : []).filter(row => (
    normalizePlatformIdentifier(row.RunID) === requested && isActivePlatformValue(row.Active)
  ));
}

function integrityFailure(code, error) {
  return Object.freeze({ ok: false, code, error });
}

function repeatedValues(values) {
  const seen = new Set();
  const repeated = new Set();
  values.forEach(value => {
    const key = normalizePlatformIdentifier(value);
    if (!key) return;
    if (seen.has(key)) repeated.add(key);
    else seen.add(key);
  });
  return [...repeated];
}

function parseIsoDateUtc(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(value));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatIsoDateUtc(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function clean(value) {
  return String(value ?? "").trim();
}
