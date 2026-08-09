/* M4L v92.1 Removed home page icon builder and other quarantiend comments

v98 - Timetable board + V84 Home vertical stack support
   Load after /app.js, /js/m4l-auth.js, and /js/m4l-shell.js.
   This is a classic script, not type=module, so existing global function calls remain safe
   while the app is split gradually.
   Class duas card helpers intentionally remain in app.js because the duas card is a home-page card,
   not timetable logic.
   V84: Home is a vertical stack; legacy Home page swipe and Home Zoom button remain quarantined.
   V97.1.5.5 HOTFIX: cached timetable reads (Home/Attendance/Timetable screens) now
   trigger a background revalidation against the Worker instead of trusting the local
   cache for up to 7 days untouched, so a saved Zoom-link change reaches other devices
   on their next load rather than only after the cache TTL lapses or a manual refresh.
*/

/* =========================
   TIMETABLE
========================= */

const TIMETABLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// V100.8 cache namespace: invalidates pre-Group-0 timetable responses.
const TIMETABLE_CACHE_PREFIX = "maktab_timetable_cache_v2";

let timetableCache = null;
let timetableCacheKey = "";
let timetableLoadPromise = null;
let timetableLoadPromiseKey = "";
// V97.1.5.5 HOTFIX: cache keys currently being revalidated in the background, so a
// stale-while-revalidate pass isn't started twice in parallel for the same timetable.
const timetableBackgroundRevalidationKeys = new Set();
let globalTimetableZoomLink = "";
let homeSectionStateGuardBound = false;

function isHomeScreenId(screenId) {
  return ["student-home", "admin-home"].includes(String(screenId || ""));
}

function setHomeSectionBodyState(screenIdOrActive) {
  if (typeof document === "undefined" || !document.body) {
    return false;
  }

  const isActive = typeof screenIdOrActive === "boolean"
    ? screenIdOrActive
    : isHomeScreenId(screenIdOrActive);

  document.body.classList.toggle("is-home-section", isActive);
  return isActive;
}

function bindHomeSectionStateGuard() {
  if (homeSectionStateGuardBound === true) return true;
  if (typeof window === "undefined" || typeof window.showScreen !== "function") return false;

  homeSectionStateGuardBound = true;

  if (window.showScreen.__m4lHomeSectionGuard === true) {
    return true;
  }

  const originalShowScreen = window.showScreen;

  const guardedShowScreen = function guardedHomeSectionShowScreen(screenId, ...args) {
    const result = originalShowScreen.call(this, screenId, ...args);

    if (result !== false) {
      setHomeSectionBodyState(screenId);

      if (isHomeScreenId(screenId)) {
        resetHomeTopStackScroll(screenId);
        // V82.4.2 QUARANTINED_HOME_ZOOM_BUTTON:
        // scheduleHomeTopStackMetricsUpdate(screenId);
      }
    }

    return result;
  };

  guardedShowScreen.__m4lHomeSectionGuard = true;
  window.showScreen = guardedShowScreen;
  return true;
}

function resetHomeTopStackScroll(screenOrId) {
  const screen = typeof screenOrId === "string"
    ? document.getElementById(screenOrId)
    : screenOrId;

  if (!screen) return false;

  const reset = () => {
    if (typeof window !== "undefined" && typeof window.scrollTo === "function" && (window.scrollY || window.scrollX)) {
      window.scrollTo(0, 0);
    }

    screen.querySelectorAll(".home-swipe-panel").forEach(panel => {
      if (panel && typeof panel.scrollTop === "number") {
        panel.scrollTop = 0;
      }
    });
  };

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(reset);
  } else if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
    window.setTimeout(reset, 0);
  } else {
    reset();
  }

  return true;
}


function scheduleStudentHomeTimetableLoad() {
  bindHomeSectionStateGuard();

  if (!state.token || getBottomNavRole() !== "student") {
    return;
  }

  if (!document.getElementById("student-home") || !document.getElementById("student-timetable-content")) {
    return;
  }

  setTimeout(() => {
    Promise.resolve(loadStudentHomeTimetable()).catch(error => {
      console.warn("Student home timetable load failed:", error);
    });
  }, 0);
}


function normalizeTimetableRows(result) {
  if (!result) return [];

  if (Array.isArray(result.sessions)) {
    return result.sessions;
  }

  if (Array.isArray(result.timetable)) {
    return result.timetable;
  }

  if (Array.isArray(result.rows)) {
    return result.rows;
  }

  return [];
}

function normalizeTimetableText(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function normalizeTimetableKey(value) {
  return normalizeTimetableText(value).toLowerCase().replace(/\s+/g, "");
}

function normalizeTimetableCachePart(value) {
  const resolved = value === null || value === undefined || value === ""
    ? "ALL"
    : value;
  return normalizeTimetableKey(resolved) || "all";
}

function getTimetableRequestOptions(options = {}) {
  const requestedGroup = options.groupNo === null || options.groupNo === undefined || options.groupNo === ""
    ? "ALL"
    : options.groupNo;
  const requestedTeacher = options.assignedTeacher === null || options.assignedTeacher === undefined || options.assignedTeacher === ""
    ? "ALL"
    : options.assignedTeacher;

  return {
    groupNo: normalizeTimetableText(requestedGroup) || "ALL",
    assignedTeacher: normalizeTimetableText(requestedTeacher) || "ALL"
  };
}

function getTimetableViewerCachePart() {
  const appState = typeof state === "object" && state ? state : {};
  const user = appState.user || {};
  const portal = normalizeTimetableCachePart(
    appState.userType || appState.portalType || "unknown"
  );
  const userId = normalizeTimetableCachePart(
    user.studentid || user.StudentID || user.adminid || user.AdminID || "unknown"
  );
  const accountGroup = normalizeTimetableCachePart(
    user.classgroup ??
    user.ClassGroup ??
    user.assignedgroup ??
    user.AssignedGroup ??
    "ALL"
  );

  return `${portal}_${userId}_${accountGroup}`;
}

function getTimetableCacheKey(options = {}) {
  const requestOptions = getTimetableRequestOptions(options);
  const viewerKey = getTimetableViewerCachePart();
  const groupKey = normalizeTimetableCachePart(requestOptions.groupNo);
  const teacherKey = normalizeTimetableCachePart(requestOptions.assignedTeacher);
  return `${TIMETABLE_CACHE_PREFIX}_${viewerKey}_${groupKey}_${teacherKey}`;
}

function readTimetableCache(cacheKey, options = {}) {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed.savedAt || 0);
    const data = parsed.data || null;

    if (!savedAt || !data) return null;

    const isExpired = Date.now() - savedAt > TIMETABLE_CACHE_TTL_MS;
    if (isExpired && options.allowExpired !== true) return null;

    return data;
  } catch (err) {
    return null;
  }
}

function writeTimetableCache(cacheKey, data) {
  try {
    if (!cacheKey || !data) return;

    localStorage.setItem(cacheKey, JSON.stringify({
      savedAt: Date.now(),
      data
    }));
  } catch (err) {
    // Local cache is an enhancement only. The app should continue if storage is full or unavailable.
  }
}

function setActiveTimetableCache(cacheKey, data) {
  timetableCacheKey = cacheKey || "";
  timetableCache = data || null;
  globalTimetableZoomLink = normalizeTimetableText(data?.zoomlink || data?.zoomLink || "");
}

function getTimetableSortMinutes(timeValue) {
  const text = normalizeTimetableText(timeValue);
  const match = text.match(/^(\d{1,2})(?::(\d{1,2}))?/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const hour = Number(match[1] || 0);
  const minute = Number(match[2] || 0);

  return hour * 60 + minute;
}

function compareTimetableTimes(a, b) {
  const minuteCompare = getTimetableSortMinutes(a) - getTimetableSortMinutes(b);

  if (minuteCompare !== 0) {
    return minuteCompare;
  }

  return normalizeTimetableText(a).localeCompare(normalizeTimetableText(b), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function getTimetableDayWeight(day) {
  const key = normalizeTimetableKey(day);
  const order = {
    mon: 1,
    monday: 1,
    tue: 2,
    tues: 2,
    tuesday: 2,
    wed: 3,
    weds: 3,
    wednesday: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
    sun: 7,
    sunday: 7
  };

  return order[key] || 99;
}

function compareTimetableDays(a, b) {
  const weightCompare = getTimetableDayWeight(a) - getTimetableDayWeight(b);

  if (weightCompare !== 0) {
    return weightCompare;
  }

  return normalizeTimetableText(a).localeCompare(normalizeTimetableText(b), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function addUniqueTimetableValue(list, seen, value) {
  const text = normalizeTimetableText(value);
  const key = normalizeTimetableKey(text);

  if (!text || seen.has(key)) {
    return;
  }

  seen.add(key);
  list.push(text);
}

function buildTimetableModel(rows) {
  const dayList = [];
  const timeList = [];
  const daySeen = new Set();
  const timeSeen = new Set();
  const cellMap = {};

  rows.forEach(row => {
    const day = normalizeTimetableText(row.dayofweek || row.dayOfWeek || row.day || "");
    const time = normalizeTimetableText(row.starttime || row.startTime || row.time || "");
    const subject = normalizeTimetableText(row.subjectname || row.subjectName || row.subject || "");

    if (!day || !time || !subject) {
      return;
    }

    addUniqueTimetableValue(dayList, daySeen, day);
    addUniqueTimetableValue(timeList, timeSeen, time);

    const cellKey = `${normalizeTimetableKey(time)}__${normalizeTimetableKey(day)}`;

    if (!cellMap[cellKey]) {
      cellMap[cellKey] = [];
    }

    const alreadyAdded = cellMap[cellKey].some(item => {
      return normalizeTimetableKey(item.subjectname) === normalizeTimetableKey(subject);
    });

    if (!alreadyAdded) {
      cellMap[cellKey].push({
        subjectname: subject,
        zoomlink: normalizeTimetableText(row.zoomlink || row.zoomLink || "")
      });
    }
  });

  dayList.sort(compareTimetableDays);
  timeList.sort(compareTimetableTimes);

  return {
    days: dayList,
    starttimes: timeList,
    cells: cellMap
  };
}

function getTimetableCellEntries(model, time, day) {
  const key = `${normalizeTimetableKey(time)}__${normalizeTimetableKey(day)}`;
  return model.cells[key] || [];
}

function getTimetableEntriesLabel(entries) {
  return (entries || [])
    .map(entry => normalizeTimetableText(entry && entry.subjectname))
    .filter(Boolean)
    .join(" / ");
}

function getTimetableEntriesKey(entries) {
  return normalizeTimetableKey(getTimetableEntriesLabel(entries));
}

function shouldMergeTimetableRow(model, time) {
  if (!model || !Array.isArray(model.days) || model.days.length <= 1) {
    return false;
  }

  let sharedKey = "";

  for (const day of model.days) {
    const entries = getTimetableCellEntries(model, time, day);
    const key = getTimetableEntriesKey(entries);

    if (!key) {
      return false;
    }

    if (!sharedKey) {
      sharedKey = key;
      continue;
    }

    if (key !== sharedKey) {
      return false;
    }
  }

  return true;
}

function renderTimetableSubjectEntries(entries, options = {}) {
  if (!Array.isArray(entries) || !entries.length) {
    return "";
  }

  return entries.map(entry => {
    const subjectName = normalizeTimetableText(entry && entry.subjectname);

    if (!subjectName) {
      return "";
    }

    const perSessionZoomLink = normalizeTimetableText(entry.zoomlink);
    const canOpenSessionZoom = options.usePerSessionZoom === true && perSessionZoomLink;
    const subjectClass = canOpenSessionZoom
      ? "m4l-timetable-subject timetable-subject timetable-subject-link"
      : "m4l-timetable-subject timetable-subject";

    if (canOpenSessionZoom) {
      return `
        <button
          type="button"
          class="${subjectClass}"
          data-timetable-action="open-zoom"
          data-zoom-link="${escapeForAttribute(perSessionZoomLink)}"
        >${escapeHtml(subjectName)}</button>
      `;
    }

    return `<span class="${subjectClass}">${escapeHtml(subjectName)}</span>`;
  }).join("");
}

function renderTimetable(containerOrId, timetableResult, options = {}) {
  const container = getDomElement(containerOrId);

  if (!container) {
    return false;
  }

  const rows = normalizeTimetableRows(timetableResult);

  if (!rows.length) {
    setDomHtml(container, `<p class="helper-text">No timetable sessions have been added yet.</p>`);
    return true;
  }

  const model = buildTimetableModel(rows);

  if (!model.days.length || !model.starttimes.length) {
    setDomHtml(container, `<p class="helper-text">No timetable sessions have been added yet.</p>`);
    return true;
  }

  const dayCount = Math.max(model.days.length, 1);

  const headerHtml = model.days
    .map(day => `
      <div class="m4l-timetable-heading-pill m4l-timetable-day-heading" role="columnheader">
        ${escapeHtml(day)}
      </div>
    `)
    .join("");

  const bodyHtml = model.starttimes.map((time, rowIndex) => {
    const shouldMergeRow = rowIndex === 0 && shouldMergeTimetableRow(model, time);

    const timeHtml = `
      <div class="m4l-timetable-time-label" role="rowheader">
        ${escapeHtml(time)}
      </div>
    `;

    if (shouldMergeRow) {
      const entries = getTimetableCellEntries(model, time, model.days[0]);
      return `
        <div class="m4l-timetable-row m4l-timetable-row--merged" role="row">
          ${timeHtml}
          <div
            class="m4l-timetable-subject-cell m4l-timetable-subject-cell--merged"
            role="cell"
            aria-label="${escapeForAttribute(time)} shared subject"
          >
            ${renderTimetableSubjectEntries(entries, options)}
          </div>
        </div>
      `;
    }

    const cellHtml = model.days.map(day => {
      const entries = getTimetableCellEntries(model, time, day);

      if (!entries.length) {
        return `
          <div
            class="m4l-timetable-subject-cell m4l-timetable-subject-cell--empty"
            role="cell"
            aria-label="${escapeForAttribute(day)} ${escapeForAttribute(time)}"
          ></div>
        `;
      }

      return `
        <div
          class="m4l-timetable-subject-cell"
          role="cell"
          aria-label="${escapeForAttribute(day)} ${escapeForAttribute(time)}"
        >
          ${renderTimetableSubjectEntries(entries, options)}
        </div>
      `;
    }).join("");

    return `
      <div class="m4l-timetable-row" role="row">
        ${timeHtml}
        ${cellHtml}
      </div>
    `;
  }).join("");

  const timetableHtml = `
    <div
      class="timetable-scroll m4l-timetable-scroll"
      role="region"
      aria-label="Timetable"
      tabindex="0"
    >
      <div
        class="m4l-timetable-board"
        role="table"
        aria-label="Timetable board"
        style="--timetable-day-count: ${dayCount};"
      >
        <div class="m4l-timetable-row m4l-timetable-row--head" role="row">
          <div class="m4l-timetable-heading-pill m4l-timetable-time-heading" role="columnheader">Time</div>
          ${headerHtml}
        </div>
        ${bodyHtml}
      </div>
    </div>
  `;

  setDomHtml(container, timetableHtml);
  bindTimetableUiHandlers();
  return true;
}

function requestTimetableFromWorker(requestOptions) {
  return apiPost("/api/timetable/get", requestOptions, state.token).then(result => {
    if (!result.success) {
      throw new Error(result.error || "Failed to load timetable");
    }

    return result;
  });
}

async function fetchTimetable(options = {}) {
  const requestOptions = getTimetableRequestOptions(options);
  const cacheKey = getTimetableCacheKey(requestOptions);
  const force = options.force === true;

  if (!force) {
    let cached = null;

    if (timetableCache && timetableCacheKey === cacheKey) {
      cached = timetableCache;
    } else {
      cached = readTimetableCache(cacheKey);
      if (cached) {
        setActiveTimetableCache(cacheKey, cached);
      }
    }

    if (cached) {
      // V97.1.5.5 HOTFIX: serving from local cache no longer means trusting it for up
      // to 7 days untouched. Revalidate against the Worker in the background so a
      // Zoom-link change (or any other timetable edit) reaches this device the next
      // time it opens the app, not only when the cache TTL lapses or someone finds
      // the manual refresh button.
      revalidateTimetableInBackground(cacheKey, requestOptions);
      return cached;
    }
  }

  if (timetableLoadPromise && !force && timetableLoadPromiseKey === cacheKey) {
    return timetableLoadPromise;
  }

  timetableLoadPromiseKey = cacheKey;
  timetableLoadPromise = requestTimetableFromWorker(requestOptions).then(result => {
    setActiveTimetableCache(cacheKey, result);
    writeTimetableCache(cacheKey, result);
    return result;
  }).catch(err => {
    if (!force) {
      const staleCache = readTimetableCache(cacheKey, { allowExpired: true });
      if (staleCache) {
        setActiveTimetableCache(cacheKey, staleCache);
        return staleCache;
      }
    }

    throw err;
  }).finally(() => {
    timetableLoadPromise = null;
    timetableLoadPromiseKey = "";
  });

  return timetableLoadPromise;
}

function revalidateTimetableInBackground(cacheKey, requestOptions) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return;
  }

  if (timetableBackgroundRevalidationKeys.has(cacheKey)) {
    return;
  }

  timetableBackgroundRevalidationKeys.add(cacheKey);

  requestTimetableFromWorker(requestOptions)
    .then(result => {
      const previous = timetableCacheKey === cacheKey ? timetableCache : null;
      const hasChanged = JSON.stringify(previous) !== JSON.stringify(result);

      writeTimetableCache(cacheKey, result);

      if (hasChanged) {
        setActiveTimetableCache(cacheKey, result);
        renderActiveTimetableView(result);
      }
    })
    .catch(() => {
      // Background revalidation is best-effort. The visible, already-cached
      // timetable is left in place rather than surfacing an error for a refresh
      // the user didn't ask for.
    })
    .finally(() => {
      timetableBackgroundRevalidationKeys.delete(cacheKey);
    });
}

function getActiveTimetableRenderTarget() {
  const activeScreenId = typeof getActiveScreenId === "function" ? getActiveScreenId() : "";

  if (activeScreenId === "student-home") {
    return document.getElementById("student-timetable-content");
  }

  if (activeScreenId === "admin-home") {
    return document.getElementById("admin-home-timetable-content");
  }

  if (activeScreenId === "admin-timetable-screen") {
    return document.getElementById("admin-timetable-content");
  }

  return null;
}

function renderActiveTimetableView(result) {
  const container = getActiveTimetableRenderTarget();

  if (!container) {
    return;
  }

  renderTimetable(container, result, { showContentPanel: true });
}

let timetableUiHandlersBound = false;

function bindTimetableUiHandlers() {
  if (timetableUiHandlersBound === true) return true;
  if (!document || typeof document.addEventListener !== "function") return false;

  timetableUiHandlersBound = true;
  document.addEventListener("click", handleTimetableUiClick);
  return true;
}

function handleTimetableUiClick(event) {
  const button = event.target && event.target.closest
    ? event.target.closest("[data-timetable-action]")
    : null;

  if (!button || button.disabled) return;

  const action = button.dataset.timetableAction || "";
  if (!action) return;

  event.preventDefault();

  if (action === "open-zoom") {
    openTimetableZoomLink(button.dataset.zoomLink || "");
  }
}

/* Class duas home-card helpers remain in app.js; timetable module only calls the duas placement helper after rendering. */

function scheduleAdminHomeTimetableLoad() {
  bindHomeSectionStateGuard();

  if (!state.token || getBottomNavRole() !== "admin") {
    return;
  }

  if (!document.getElementById("admin-home")) {
    return;
  }

  setTimeout(() => {
    Promise.resolve(loadAdminHomeTimetable()).catch(error => {
      console.warn("Admin home timetable load failed:", error);
    });
  }, 0);
}


function ensureAdminHomePanel() {
  const screen = document.getElementById("admin-home");

  if (!screen) {
    return null;
  }

  const header = screen.querySelector(".top-bar, .nav-header");
  if (header) {
    header.remove();
  }

  const adminWelcome = document.getElementById("admin-welcome");
  if (adminWelcome) {
    adminWelcome.remove();
  }


/*
new section added 
   */

   
screen
  .querySelectorAll(":scope > .staff-dashboard-grid, :scope > .card-grid, :scope > .list-stack"  )
 
   .forEach(section => {
    section.remove();
  });

const panel = document.getElementById("admin-home-panel");

if (!panel || !screen.contains(panel)) {
  console.warn(
    "Admin Home panel is missing from admin/index.html: #admin-home-panel"
  );
  return null;
}

const timetableContent = panel.querySelector(
  "#admin-home-timetable-content"
);

if (!timetableContent) {
  console.warn(
    "Admin Home timetable target is missing from admin/index.html: #admin-home-timetable-content"
  );
}

const duasPanel = panel.querySelector(
  "#admin-home-duas-panel"
);

if (!duasPanel) {
  console.warn(
    "Admin Home duas panel is missing from admin/index.html: #admin-home-duas-panel"
  );
}


   

     // V82.4.2 QUARANTINED_HOME_ZOOM_BUTTON: removeHomeStickyZoomAction("admin-home", "admin-home-zoom-link-btn");

  if (typeof hydrateCoverHomeNavigationButtons === "function") {
    hydrateCoverHomeNavigationButtons(panel);
  }

  removeLegacyScreenRefreshButtons();
  return panel;
}

async function loadAdminHomeTimetable(force = false) {
  setHomeSectionBodyState("admin-home");
  bindHomeSectionStateGuard();
  resetHomeTopStackScroll("admin-home");

  const panel = ensureAdminHomePanel();
  const container = document.getElementById("admin-home-timetable-content");

  if (!panel || !container || !state.token || getBottomNavRole() !== "admin") {
    return;
  }

  if (!timetableCache || force) {
    setDomHtml(container, `<p class="helper-text">Loading timetable...</p>`);
  }

  try {
    const result = await fetchTimetable({ force });
    renderTimetable(container, result, { showContentPanel: true });
    // V82.4.2 QUARANTINED_HOME_ZOOM_BUTTON: removeHomeStickyZoomAction("admin-home", "admin-home-zoom-link-btn");
    ensureClassDuasCardAfterTimetable("admin-home-timetable-content", "admin-home-class-duas-card", []);
    // V82.4.2 QUARANTINED_HOME_ZOOM_BUTTON: scheduleHomeTopStackMetricsUpdate("admin-home");
  } catch (err) {
    setDomHtml(container, `<p class="error-message">${escapeHtml(err.message || "Unable to load timetable.")}</p>`);
    // V82.4.2 QUARANTINED_HOME_ZOOM_BUTTON: removeHomeStickyZoomAction("admin-home", "admin-home-zoom-link-btn");
  }
}

async function refreshAdminHomeTimetable(button) {
  await runManualRefresh(button, async () => {
    await loadAdminHomeTimetable(true);
  });
}


async function loadStudentHomeTimetable(force = false) {
  setHomeSectionBodyState("student-home");
  bindHomeSectionStateGuard();
  resetHomeTopStackScroll("student-home");
  // V82.4.2 QUARANTINED_HOME_ZOOM_BUTTON: removeHomeStickyZoomAction("student-home", "student-zoom-link-btn");
  const container = document.getElementById("student-timetable-content");

  if (!container || !state.token || getBottomNavRole() !== "student") {
    return;
  }

  if (!timetableCache || force) {
    setDomHtml(container, `<p class="helper-text">Loading timetable...</p>`);
  }

  try {
    const result = await fetchTimetable({ force });
    renderTimetable(container, result, { showContentPanel: true });
    // V82.4.2 QUARANTINED_HOME_ZOOM_BUTTON: removeHomeStickyZoomAction("student-home", "student-zoom-link-btn");
    ensureClassDuasCardAfterTimetable("student-timetable-content", "student-home-class-duas-card", []);
    // V82.4.2 QUARANTINED_HOME_ZOOM_BUTTON: scheduleHomeTopStackMetricsUpdate("student-home");
  } catch (err) {
    setDomHtml(container, `<p class="error-message">${escapeHtml(err.message || "Unable to load timetable.")}</p>`);
    // V82.4.2 QUARANTINED_HOME_ZOOM_BUTTON: removeHomeStickyZoomAction("student-home", "student-zoom-link-btn");
  }
}

async function refreshStudentHomeTimetable(button) {
  await runManualRefresh(button, async () => {
    await loadStudentHomeTimetable(true);
  });
}

function openTimetableZoomLink(link, options = {}) {
  const rawLink = normalizeTimetableText(link || globalTimetableZoomLink);

  if (!rawLink) {
    alert("Zoom link has not been added yet.");
    return false;
  }

  const targetLink = /^https?:\/\//i.test(rawLink)
    ? rawLink
    : `https://${rawLink}`;

  if (options.sameTab === true) {
    window.location.assign(targetLink);
    return true;
  }

  window.open(targetLink, "_blank", "noopener,noreferrer");
  return true;
}

function openStudentTimetableZoom() {
  openTimetableZoomLink(globalTimetableZoomLink);
}

async function showAdminTimetable(force = false) {
  setTimetableScreenTheme("admin-timetable-screen", "admin");
  setManualRefreshButton("admin-timetable-screen", "refreshAdminTimetable(this)");
  showScreen("admin-timetable-screen");

  const container = document.getElementById("admin-timetable-content");

  if (container) {
    setDomHtml(container, `<p class="helper-text">Loading timetable...</p>`);
  }

  try {
    const result = await fetchTimetable({ force });
    renderTimetable(container, result, { showContentPanel: true });
    // V82.4.2 QUARANTINED_LEGACY_TIMETABLE_ZOOM_BUTTON: setTimetableZoomButtonState("admin-timetable-zoom-link-btn", globalTimetableZoomLink);
    ensureClassDuasCardAfterTimetable("admin-timetable-content", "admin-timetable-class-duas-card", []);
  } catch (err) {
    if (container) {
      setDomHtml(container, `<p class="error-message">${escapeHtml(err.message || "Unable to load timetable.")}</p>`);
    }
  }
}

async function refreshAdminTimetable(button) {
  await runManualRefresh(button, async () => {
    await showAdminTimetable(true);
  });
}

function setTimetableScreenTheme(screenId, theme) {
  const screen = document.getElementById(screenId);

  if (!screen) {
    return;
  }

  screen.classList.toggle("student-theme", theme === "student");
  screen.classList.toggle("admin-theme", theme !== "student");
}

async function showAdminTimetableAdmin(focusZoom = false) {
  setTimetableScreenTheme("admin-timetable-admin-screen", "admin");
  showScreen("admin-timetable-admin-screen");

  const previewContainer = document.getElementById("admin-timetable-admin-preview");
  const zoomInput = document.getElementById("admin-global-zoom-link");
  const message = document.getElementById("admin-timetable-message");

  if (previewContainer) {
    setDomHtml(previewContainer, `<p class="helper-text">Loading timetable...</p>`);
  }

  if (message) {
    message.textContent = "";
  }

  try {
    const result = await fetchTimetable({ force: true });
    renderTimetable(previewContainer, result);

    if (zoomInput) {
      zoomInput.value = normalizeTimetableText(result.zoomlink || "");
      if (focusZoom) {
        setTimeout(() => zoomInput.focus(), 80);
      }
    }
  } catch (err) {
    if (previewContainer) {
      setDomHtml(previewContainer, `<p class="error-message">${escapeHtml(err.message || "Unable to load timetable.")}</p>`);
    }
  }
}

function showAdminZoomLinkAdmin() {
  showAdminTimetableAdmin(true);
}

async function saveAdminTimetableZoomLink(button) {
  const zoomInput = document.getElementById("admin-global-zoom-link");
  const message = document.getElementById("admin-timetable-message");
  const zoomlink = zoomInput ? zoomInput.value.trim() : "";

  if (message) {
    message.textContent = "Saving...";
    message.classList.remove("error-message");
  }

  if (button) {
    button.disabled = true;
  }

  try {
    const result = await apiPost("/api/admin/timetable/update-zoom", {
      zoomlink
    }, state.token);

    if (!result.success) {
      throw new Error(result.error || "Could not save Zoom link.");
    }

    const cacheKey = getTimetableCacheKey({ groupNo: "ALL", assignedTeacher: "ALL" });
    setActiveTimetableCache(cacheKey, result);
    writeTimetableCache(cacheKey, result);

    if (message) {
      message.textContent = result.message || "Zoom link saved.";
    }

    renderTimetable("admin-timetable-admin-preview", result);
  } catch (err) {
    if (message) {
      message.textContent = err.message || "Could not save Zoom link.";
      message.classList.add("error-message");
    }
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

window.M4LTimetable = {
  scheduleStudentHomeTimetableLoad,
  normalizeTimetableRows,
  renderTimetable,
  fetchTimetable,
  bindTimetableUiHandlers,
  loadAdminHomeTimetable,
  refreshAdminHomeTimetable,
  loadStudentHomeTimetable,
  refreshStudentHomeTimetable,
  openTimetableZoomLink,
  openStudentTimetableZoom,
  showAdminTimetable,
  refreshAdminTimetable,
  showAdminTimetableAdmin,
  showAdminZoomLinkAdmin,
  saveAdminTimetableZoomLink
};
