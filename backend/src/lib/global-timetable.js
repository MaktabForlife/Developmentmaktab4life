/* M4L V104.5.3 - Explicit and derived Global Course timetable/publication helpers. */

import {
  isActivePlatformValue,
  normalizePlatformIdentifier
} from "./platform-schema.js";
import { defaultLifecycle, resolvePublishedSessionLifecycle } from "./global-timetable-lifecycle.js";
import {
  COURSE_SCHEDULE_MODE_DERIVED,
  COURSE_SCHEDULE_MODE_EXPLICIT,
  deriveCourseScheduleOccurrences,
  derivedOccurrenceAnchor,
  GLOBAL_SESSION_KIND_EXCEPTION,
  GLOBAL_SESSION_KIND_EXPLICIT,
  normalizeCourseScheduleMode,
  normalizeGlobalSessionKind,
  parseCourseScheduleDefinition
} from "./global-course-scheduling.js";

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
    modifieddate: clean(record?.ModifiedDate),
    sessionkind: normalizeGlobalSessionKind(record?.SessionKind, GLOBAL_SESSION_KIND_EXPLICIT),
    schedulerulekey: clean(record?.ScheduleRuleKey),
    occurrencedate: clean(record?.OccurrenceDate),
    sessiondescription: clean(record?.SessionDescription)
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
    draftpublishstartdate: clean(record?.DraftPublishStartDate),
    draftpublishenddate: clean(record?.DraftPublishEndDate),
    createddate: clean(record?.CreatedDate),
    modifieddate: clean(record?.ModifiedDate)
  });
}

export function mapGlobalTimetablePublication(record) {
  const scheduleMode = normalizeCourseScheduleMode(record?.ScheduleMode, COURSE_SCHEDULE_MODE_EXPLICIT);
  return Object.freeze({
    publicationid: clean(record?.PublicationID),
    runid: clean(record?.RunID),
    subjectid: clean(record?.SubjectID),
    versionno: Number(record?.VersionNo) || 0,
    publisheddate: clean(record?.PublishedDate),
    publishedbyaccountid: clean(record?.PublishedByAccountID),
    publishedbyaccountname: clean(record?.PublishedByAccountName),
    sessioncount: Number(record?.SessionCount) || 0,
    schedulemode: scheduleMode,
    publishstartdate: clean(record?.PublishStartDate),
    publishenddate: clean(record?.PublishEndDate),
    scheduledefinition: clean(record?.ScheduleDefinition) || "[]",
    runname: clean(record?.RunName),
    subjectname: clean(record?.SubjectName),
    timezone: clean(record?.Timezone)
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
    timezone: clean(record?.Timezone),
    sessionkind: normalizeGlobalSessionKind(record?.SessionKind, GLOBAL_SESSION_KIND_EXPLICIT),
    schedulerulekey: clean(record?.ScheduleRuleKey),
    occurrencedate: clean(record?.OccurrenceDate),
    sessiondescription: clean(record?.SessionDescription)
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

export function resolveCurrentPublishedGlobalTimetable(tables, runId, options = {}) {
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

  if (publication.schedulemode === COURSE_SCHEDULE_MODE_DERIVED) {
    return resolveDerivedPublishedGlobalTimetable(tables, state, publication, options);
  }
  return resolveExplicitPublishedGlobalTimetable(tables, state, publication, options);
}

function resolveExplicitPublishedGlobalTimetable(tables, state, publication, options) {
  let sessions = (tables?.PublishedGlobalTimetableSessions || [])
    .filter(row => (
      normalizePlatformIdentifier(row.PublicationID) === normalizePlatformIdentifier(publication.publicationid) &&
      normalizePlatformIdentifier(row.RunID) === normalizePlatformIdentifier(publication.runid) &&
      normalizeGlobalSessionKind(row.SessionKind, GLOBAL_SESSION_KIND_EXPLICIT) === GLOBAL_SESSION_KIND_EXPLICIT
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

  const lifecycles = new Map(sessions.map(session => [
    normalizePlatformIdentifier(session.sourcesessionid),
    resolvePublishedSessionLifecycle(
      tables?.GlobalTimetableSessionLifecycle || [], publication.publicationid, session.sourcesessionid
    )
  ]));
  const incomplete = sessions.filter(session => (
      !session.publishedsessionid || !session.sourcesessionid || !session.runid || !session.subjectid ||
      normalizePlatformIdentifier(session.subjectid) !== normalizePlatformIdentifier(publication.subjectid) ||
      !session.sessiondate || !session.starttime || !session.endtime ||
      !session.teachername ||
      !session.runname || !session.subjectname || !session.timezone ||
      (session.moduleid && !session.modulename)
    ));
  if (incomplete.length) {
    return integrityFailure(
      "GLOBAL_TIMETABLE_DISPLAY_VALUES_MISSING",
      `${incomplete.length} published global timetable row${incomplete.length === 1 ? " is" : "s are"} incomplete`
    );
  }

  sessions = filterPublishedSessionsByWindow(sessions, options);
  return Object.freeze({ ok: true, state, publication, sessions: Object.freeze(sessions), lifecycles: Object.freeze([...lifecycles.values()]) });
}

function resolveDerivedPublishedGlobalTimetable(tables, state, publication, options) {
  if (!validateIsoDate(publication.publishstartdate) || !validateIsoDate(publication.publishenddate) || publication.publishenddate < publication.publishstartdate) {
    return integrityFailure("GLOBAL_TIMETABLE_DERIVED_WINDOW_INVALID", "Derived publication has an invalid publish window");
  }
  if (!publication.runname || !publication.subjectname || !publication.timezone) {
    return integrityFailure("GLOBAL_TIMETABLE_DISPLAY_VALUES_MISSING", "Derived publication is missing immutable Course display values");
  }

  let rules;
  try {
    rules = parseCourseScheduleDefinition(publication.scheduledefinition, { includeDisplayValues: true });
  } catch (error) {
    return integrityFailure("GLOBAL_TIMETABLE_SCHEDULE_DEFINITION_INVALID", error.message || "Derived publication schedule is invalid");
  }
  if (!rules.length) return integrityFailure("GLOBAL_TIMETABLE_EMPTY", "Derived publication contains no recurring rules");

  const requestedStart = validateIsoDate(options.startDate) ? String(options.startDate).trim() : publication.publishstartdate;
  const requestedEnd = validateIsoDate(options.endDate) ? String(options.endDate).trim() : publication.publishenddate;
  const startDate = requestedStart > publication.publishstartdate ? requestedStart : publication.publishstartdate;
  const endDate = requestedEnd < publication.publishenddate ? requestedEnd : publication.publishenddate;
  if (endDate < startDate) {
    return Object.freeze({ ok: true, state, publication, sessions: Object.freeze([]), lifecycles: Object.freeze([]) });
  }

  const baseSessions = deriveCourseScheduleOccurrences(rules, startDate, endDate, {
    runid: publication.runid,
    subjectid: publication.subjectid,
    runname: publication.runname,
    subjectname: publication.subjectname,
    timezone: publication.timezone,
    includeDisplayValues: true
  });

  const allExceptions = (tables?.PublishedGlobalTimetableSessions || [])
    .filter(row => (
      normalizePlatformIdentifier(row.PublicationID) === normalizePlatformIdentifier(publication.publicationid) &&
      normalizePlatformIdentifier(row.RunID) === normalizePlatformIdentifier(publication.runid) &&
      normalizeGlobalSessionKind(row.SessionKind, GLOBAL_SESSION_KIND_EXPLICIT) === GLOBAL_SESSION_KIND_EXCEPTION
    ))
    .map(mapPublishedGlobalTimetableSession);

  const anchors = new Map();
  const extraExceptions = [];
  const lifecycleMap = new Map();
  for (const exception of allExceptions) {
    if (!exception.publishedsessionid || !exception.sourcesessionid || !exception.sessiondate || !exception.starttime || !exception.endtime) {
      return integrityFailure("GLOBAL_TIMETABLE_DISPLAY_VALUES_MISSING", "Derived publication contains an incomplete exception snapshot");
    }
    const lifecycle = resolvePublishedSessionLifecycle(
      tables?.GlobalTimetableSessionLifecycle || [], publication.publicationid, exception.sourcesessionid
    );
    lifecycleMap.set(normalizePlatformIdentifier(exception.sourcesessionid), lifecycle);
    const anchor = derivedOccurrenceAnchor(exception.schedulerulekey, exception.occurrencedate);
    if (anchor) {
      if (anchors.has(anchor)) return integrityFailure("GLOBAL_TIMETABLE_DUPLICATE_EXCEPTION", "Derived publication has duplicate exceptions for one occurrence");
      anchors.set(anchor, exception);
    } else {
      extraExceptions.push(exception);
    }
  }

  const output = [];
  for (const base of baseSessions) {
    const anchor = derivedOccurrenceAnchor(base.schedulerulekey, base.occurrencedate);
    const exception = anchors.get(anchor);
    if (!exception) {
      output.push(base);
      lifecycleMap.set(normalizePlatformIdentifier(base.sourcesessionid), defaultLifecycle(base.sourcesessionid, publication.publicationid));
      continue;
    }
    // The anchored base occurrence is replaced by the materialised exception.
    // If it was moved outside this requested view, it is suppressed here and
    // will appear when the replacement date is inside a later requested view.
    if (sessionInsideWindow(exception, startDate, endDate)) output.push(exception);
  }
  for (const exception of extraExceptions) {
    if (sessionInsideWindow(exception, startDate, endDate)) output.push(exception);
  }
  // An anchored exception may move into this window from an occurrence outside
  // the window, so add it when its actual SessionDate is visible and it has not
  // already replaced a base occurrence above.
  const outputIds = new Set(output.map(item => normalizePlatformIdentifier(item.sourcesessionid)));
  for (const exception of anchors.values()) {
    const sourceKey = normalizePlatformIdentifier(exception.sourcesessionid);
    if (!outputIds.has(sourceKey) && sessionInsideWindow(exception, startDate, endDate)) {
      output.push(exception);
      outputIds.add(sourceKey);
    }
  }

  output.sort((a, b) => `${a.sessiondate} ${a.starttime} ${a.sourcesessionid}`.localeCompare(`${b.sessiondate} ${b.starttime} ${b.sourcesessionid}`));

  const fullWindowRequested = startDate === publication.publishstartdate && endDate === publication.publishenddate;
  if (fullWindowRequested && output.length !== publication.sessioncount) {
    return integrityFailure(
      "GLOBAL_TIMETABLE_SESSION_COUNT_MISMATCH",
      `Derived publication expects ${publication.sessioncount} sessions but ${output.length} occurrences were resolved`
    );
  }

  const lifecycles = output.map(session => (
    lifecycleMap.get(normalizePlatformIdentifier(session.sourcesessionid)) || defaultLifecycle(session.sourcesessionid, publication.publicationid)
  ));
  return Object.freeze({ ok: true, state, publication, sessions: Object.freeze(output), lifecycles: Object.freeze(lifecycles) });
}

function filterPublishedSessionsByWindow(sessions, options) {
  const startDate = validateIsoDate(options.startDate) ? String(options.startDate).trim() : "";
  const endDate = validateIsoDate(options.endDate) ? String(options.endDate).trim() : "";
  if (!startDate && !endDate) return sessions;
  return sessions.filter(session => (!startDate || session.sessiondate >= startDate) && (!endDate || session.sessiondate <= endDate));
}

function sessionInsideWindow(session, startDate, endDate) {
  return clean(session?.sessiondate) >= startDate && clean(session?.sessiondate) <= endDate;
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
  if (!validateIsoDate(date)) return false;
  const startDate = clean(run?.StartDate || run?.startdate);
  const endDate = clean(run?.EndDate || run?.enddate);
  if (!startDate && !endDate) return true;
  if (!validateIsoDate(startDate) || !validateIsoDate(endDate) || endDate < startDate) return false;
  return date >= startDate && date <= endDate;
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
