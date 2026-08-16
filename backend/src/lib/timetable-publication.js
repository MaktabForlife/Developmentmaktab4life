/* M4L V102.9 - Published timetable snapshot schema and integrity helpers. */

export const TIMETABLE_STATE_SHEET = "TimetableCourseState";
export const TIMETABLE_PUBLICATION_SHEET = "TimetablePublications";
export const PUBLISHED_TIMETABLE_SESSION_SHEET = "PublishedTimetableSessions";

export const TIMETABLE_STATE_HEADERS = Object.freeze([
  "CourseID",
  "Stage",
  "CurrentPublicationID",
  "CreatedDate",
  "CreatedByAdminID",
  "CreatedByAdminName",
  "ModifiedByAdminID",
  "ModifiedByAdminName",
  "ModifiedDate"
]);

export const TIMETABLE_PUBLICATION_HEADERS = Object.freeze([
  "PublicationID",
  "CourseID",
  "VersionNo",
  "PublishedDate",
  "PublishedByAdminID",
  "PublishedByAdminName",
  "SessionCount"
]);

export const LEGACY_PUBLISHED_TIMETABLE_SESSION_HEADERS = Object.freeze([
  "PublishedSessionID",
  "PublicationID",
  "SourceSessionID",
  "CourseID",
  "TimeSlotID",
  "DayOfWeek",
  "SubjectID",
  "ModuleID",
  "GroupNo",
  "TeacherID",
  "ZoomLink",
  "PublishedDate",
  "PublishedByAdminID",
  "PublishedByAdminName"
]);

export const PUBLISHED_TIMETABLE_SESSION_HEADERS = Object.freeze([
  ...LEGACY_PUBLISHED_TIMETABLE_SESSION_HEADERS,
  "CourseName",
  "StartTime",
  "EndTime",
  "SubjectName",
  "ModuleName",
  "TeacherName"
]);

export function validatePublishedTimetableHeaders(rows, options = {}) {
  const actual = Array.isArray(rows?.[0]) ? rows[0].map(clean) : [];
  const current = headersEqual(actual, PUBLISHED_TIMETABLE_SESSION_HEADERS);
  const legacy = headersEqual(actual, LEGACY_PUBLISHED_TIMETABLE_SESSION_HEADERS);

  if (current) {
    return { ok: true, current: true, legacy: false, columnCount: actual.length };
  }

  if (legacy && options.allowLegacy !== false) {
    return { ok: true, current: false, legacy: true, columnCount: actual.length };
  }

  const expected = options.requireCurrent === true
    ? PUBLISHED_TIMETABLE_SESSION_HEADERS
    : `${LEGACY_PUBLISHED_TIMETABLE_SESSION_HEADERS.length} legacy or ${PUBLISHED_TIMETABLE_SESSION_HEADERS.length} current columns`;
  return {
    ok: false,
    current: false,
    legacy: false,
    columnCount: actual.length,
    error: options.requireCurrent === true
      ? `${PUBLISHED_TIMETABLE_SESSION_SHEET} must use the documented ${expected.join(", ")} headers`
      : `${PUBLISHED_TIMETABLE_SESSION_SHEET} must use the documented ${expected}`
  };
}

export function parseTimetableStates(rows = []) {
  return rows.slice(1).map((row, index) => ({
    rowindex: index + 1,
    courseid: clean(row[0]),
    stage: clean(row[1]).toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DEVELOPMENT",
    currentpublicationid: clean(row[2]),
    createddate: clean(row[3]),
    modifieddate: clean(row[8])
  })).filter(state => state.courseid);
}

export function parseTimetablePublications(rows = []) {
  return rows.slice(1).map(row => ({
    publicationid: clean(row[0]),
    courseid: clean(row[1]),
    versionno: Number(row[2]) || 0,
    publisheddate: clean(row[3]),
    publishedbyadminid: clean(row[4]),
    publishedbyadminname: clean(row[5]),
    sessioncount: Number(row[6]) || 0
  })).filter(publication => publication.publicationid && publication.courseid);
}

export function parsePublishedTimetableSessions(rows = []) {
  return rows.slice(1).map((row, index) => ({
    rowindex: index + 1,
    publishedsessionid: clean(row[0]),
    publicationid: clean(row[1]),
    sourcesessionid: clean(row[2]),
    courseid: clean(row[3]),
    timeslotid: clean(row[4]),
    dayofweek: clean(row[5]),
    subjectid: clean(row[6]),
    moduleid: clean(row[7]),
    groupno: clean(row[8]),
    teacherid: clean(row[9]),
    zoomlink: clean(row[10]),
    publisheddate: clean(row[11]),
    publishedbyadminid: clean(row[12]),
    publishedbyadminname: clean(row[13]),
    coursename: clean(row[14]),
    starttime: normalizeTime(row[15]),
    endtime: normalizeTime(row[16]),
    subjectname: clean(row[17]),
    modulename: clean(row[18]),
    teachername: clean(row[19])
  })).filter(session => (
    session.publishedsessionid && session.publicationid && session.sourcesessionid
  ));
}

export function resolveCurrentPublishedTimetable(data = {}, courseId, options = {}) {
  const resolvedCourseId = clean(courseId);
  const header = validatePublishedTimetableHeaders(data.publishedSessionRows, {
    allowLegacy: options.requireCurrentHeaders !== true,
    requireCurrent: options.requireCurrentHeaders === true
  });
  if (!header.ok) return integrityFailure("PUBLISHED_TIMETABLE_SCHEMA_NOT_READY", header.error, { header });
  if (options.requireCurrentHeaders === true && !header.current) {
    return integrityFailure(
      "PUBLISHED_TIMETABLE_SCHEMA_NOT_READY",
      "Published timetable display columns O:T have not been added yet",
      { header }
    );
  }

  const states = parseTimetableStates(data.stateRows || []);
  const stateMatches = states.filter(state => state.courseid === resolvedCourseId);
  if (stateMatches.length !== 1) {
    return integrityFailure(
      "PUBLISHED_TIMETABLE_STATE_INVALID",
      stateMatches.length ? "Course has duplicate timetable-state rows" : "Course has no timetable-state row",
      { header }
    );
  }

  const state = stateMatches[0];
  if (!state.currentpublicationid) {
    return integrityFailure(
      "PUBLISHED_TIMETABLE_NOT_PUBLISHED",
      "Publish this course timetable before activating it as the live source",
      { header, state }
    );
  }

  const publications = parseTimetablePublications(data.publicationRows || []);
  const publicationMatches = publications.filter(publication => (
    publication.publicationid === state.currentpublicationid && publication.courseid === resolvedCourseId
  ));
  if (publicationMatches.length !== 1) {
    return integrityFailure(
      "PUBLISHED_TIMETABLE_PUBLICATION_INVALID",
      "CurrentPublicationID does not resolve to exactly one publication for this course",
      { header, state }
    );
  }

  const publication = publicationMatches[0];
  const sessions = parsePublishedTimetableSessions(data.publishedSessionRows || []).filter(session => (
    session.publicationid === publication.publicationid && session.courseid === resolvedCourseId
  ));
  if (sessions.length !== publication.sessioncount) {
    return integrityFailure(
      "PUBLISHED_TIMETABLE_SESSION_COUNT_MISMATCH",
      `Publication expects ${publication.sessioncount} sessions but ${sessions.length} snapshot rows were found`,
      { header, state, publication, sessions }
    );
  }
  if (!sessions.length) {
    return integrityFailure(
      "PUBLISHED_TIMETABLE_EMPTY",
      "The current publication contains no timetable sessions",
      { header, state, publication, sessions }
    );
  }

  const duplicateIds = repeatedValues(sessions.map(session => session.publishedsessionid));
  const duplicateSources = repeatedValues(sessions.map(session => session.sourcesessionid));
  if (duplicateIds.length || duplicateSources.length) {
    return integrityFailure(
      "PUBLISHED_TIMETABLE_DUPLICATE_SESSION",
      "The current publication contains duplicate published or source session IDs",
      { header, state, publication, sessions, duplicateIds, duplicateSources }
    );
  }

  if (options.requireDisplayValues !== false) {
    const incomplete = sessions.filter(session => (
      !session.coursename ||
      !session.starttime ||
      !session.endtime ||
      !session.subjectname ||
      !session.teachername ||
      (session.moduleid && !session.modulename)
    ));
    if (incomplete.length) {
      return integrityFailure(
        "PUBLISHED_TIMETABLE_DISPLAY_VALUES_MISSING",
        `${incomplete.length} current snapshot row${incomplete.length === 1 ? " is" : "s are"} missing immutable display values`,
        { header, state, publication, sessions, incomplete }
      );
    }
  }

  return { ok: true, header, state, publication, sessions };
}

function integrityFailure(code, error, details = {}) {
  return { ok: false, code, error, ...details };
}

function repeatedValues(values) {
  const seen = new Set();
  const repeated = new Set();
  values.forEach(value => {
    const key = clean(value);
    if (!key) return;
    if (seen.has(key)) repeated.add(key);
    else seen.add(key);
  });
  return Array.from(repeated);
}

function headersEqual(actual, expected) {
  return actual.length === expected.length && expected.every((header, index) => actual[index] === header);
}

function normalizeTime(value) {
  const text = clean(value);
  const match = /^(\d{1,2}):(\d{2})/.exec(text);
  return match ? `${String(Number(match[1])).padStart(2, "0")}:${match[2]}` : text;
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
