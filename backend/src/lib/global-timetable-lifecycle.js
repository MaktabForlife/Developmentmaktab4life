/* M4L V102.11.1 - Global timetable session lifecycle helpers. */

import { normalizePlatformIdentifier } from "./platform-schema.js";

export const GLOBAL_SESSION_STATUS_SCHEDULED = "SCHEDULED";
export const GLOBAL_SESSION_STATUS_CANCELLED = "CANCELLED";
export const GLOBAL_SESSION_STATUS_RESCHEDULED = "RESCHEDULED";
export const GLOBAL_SESSION_STATUSES = Object.freeze([
  GLOBAL_SESSION_STATUS_SCHEDULED,
  GLOBAL_SESSION_STATUS_CANCELLED,
  GLOBAL_SESSION_STATUS_RESCHEDULED
]);

export function normalizeGlobalSessionStatus(value) {
  const status = normalizePlatformIdentifier(value);
  return GLOBAL_SESSION_STATUSES.includes(status) ? status : GLOBAL_SESSION_STATUS_SCHEDULED;
}

export function mapGlobalTimetableSessionLifecycle(record) {
  return Object.freeze({
    sessionlifecycleid: clean(record?.SessionLifecycleID),
    sessionid: clean(record?.SessionID),
    publicationid: clean(record?.PublicationID),
    status: normalizeGlobalSessionStatus(record?.Status),
    rescheduledfromsessionid: clean(record?.RescheduledFromSessionID),
    rescheduledtosessionid: clean(record?.RescheduledToSessionID),
    createddate: clean(record?.CreatedDate),
    modifieddate: clean(record?.ModifiedDate)
  });
}

export function currentLifecycleRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row => !clean(row?.PublicationID));
}

export function resolveCurrentSessionLifecycle(rows, sessionId) {
  const requested = normalizePlatformIdentifier(sessionId);
  if (!requested) return defaultLifecycle("");
  const matches = currentLifecycleRows(rows).filter(row => (
    normalizePlatformIdentifier(row?.SessionID) === requested
  ));
  if (matches.length > 1) {
    throw new Error("Global timetable session has duplicate current lifecycle rows");
  }
  if (matches.length === 0) return defaultLifecycle(clean(sessionId));
  return mapGlobalTimetableSessionLifecycle(matches[0]);
}

export function resolvePublishedSessionLifecycle(rows, publicationId, sessionId) {
  const publicationKey = normalizePlatformIdentifier(publicationId);
  const sessionKey = normalizePlatformIdentifier(sessionId);
  if (!publicationKey || !sessionKey) return defaultLifecycle(clean(sessionId), clean(publicationId));
  const matches = (Array.isArray(rows) ? rows : []).filter(row => (
    normalizePlatformIdentifier(row?.PublicationID) === publicationKey &&
    normalizePlatformIdentifier(row?.SessionID) === sessionKey
  ));
  if (matches.length > 1) {
    throw new Error("Published global timetable session has duplicate lifecycle rows");
  }
  if (matches.length === 0) return defaultLifecycle(clean(sessionId), clean(publicationId));
  return mapGlobalTimetableSessionLifecycle(matches[0]);
}

export function lifecycleNeedsTeacher(lifecycle) {
  return normalizeGlobalSessionStatus(lifecycle?.status) === GLOBAL_SESSION_STATUS_SCHEDULED;
}

export function defaultLifecycle(sessionId, publicationId = "") {
  return Object.freeze({
    sessionlifecycleid: "",
    sessionid: clean(sessionId),
    publicationid: clean(publicationId),
    status: GLOBAL_SESSION_STATUS_SCHEDULED,
    rescheduledfromsessionid: "",
    rescheduledtosessionid: "",
    createddate: "",
    modifieddate: ""
  });
}

function clean(value) {
  return String(value ?? "").trim();
}
