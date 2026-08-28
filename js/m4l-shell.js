/* M4L V102.8 - Direct Profile course/role switching and global-only menu filtering.
   M4L v93.0 - Shell / Navigation / User Band module.
   Owns app browser-back history, cover-home navigation, banner Zoom,
   slide-down menu grid, and shared refresh feedback.
   V92.3 keeps the Recorder Pages → Record → Preview history stack, contains
   bottom-nav swipe gestures inside the scrollable nav, highlights the active
   slide-down menu item, and cache-busts the shared Record navigation icon.
   /js/m4l-swipe.js is no longer required.
   V97.1.5.5 HOTFIX: restores runManualRefresh (aliased to runUserBandRefresh),
   which Attendance, Timetable, and this file's own resource-view refresh call
   but which was left undefined after an earlier rename during cleanup. */

/* =========================
   BOTTOM NAV GESTURE BOUNDARY - V87.1.1
   A swipe that starts inside the fixed bottom nav belongs to the nav only.
   This prevents document/screen-level swipe handlers from moving the
   underlying Attendance, Progress, Home, or carousel panels at the same time.
========================= */
let bottomNavigationGestureActive = false;
let bottomNavigationGestureResetTimer = 0;
let bottomNavigationGestureBoundaryInstalled = false;
let bottomNavigationGestureNav = null;
let bottomNavigationGestureStartX = 0;
let bottomNavigationGestureStartY = 0;
let bottomNavigationGestureStartScrollLeft = 0;

function getBottomNavNode(node) {
  if (!node) return null;

  if (node.nodeType !== 1) {
    node = node.parentElement;
  }

  return node && typeof node.closest === "function"
    ? node.closest("#bottom-nav, .bottom-nav")
    : null;
}

function isBottomNavNode(node) {
  return !!getBottomNavNode(node);
}

function getBottomNavGestureElement(event) {
  if (!event) return null;

  if (typeof event.composedPath === "function") {
    const path = event.composedPath();

    if (Array.isArray(path)) {
      for (const node of path) {
        const nav = getBottomNavNode(node);
        if (nav) return nav;
      }
    }
  }

  return getBottomNavNode(event.target);
}

function isBottomNavGestureTarget(event) {
  return !!getBottomNavGestureElement(event);
}

function setBottomNavGestureActive(isActive) {
  bottomNavigationGestureActive = isActive === true;

  if (typeof window !== "undefined" && bottomNavigationGestureResetTimer) {
    window.clearTimeout(bottomNavigationGestureResetTimer);
    bottomNavigationGestureResetTimer = 0;
  }

  if (!bottomNavigationGestureActive) {
    bottomNavigationGestureNav = null;
    bottomNavigationGestureStartX = 0;
    bottomNavigationGestureStartY = 0;
    bottomNavigationGestureStartScrollLeft = 0;
  }

  if (document && document.body) {
    document.body.classList.toggle("is-bottom-nav-gesture", bottomNavigationGestureActive);
  }

  return bottomNavigationGestureActive;
}

function clearBottomNavGestureActiveSoon() {
  if (typeof window === "undefined" || typeof window.setTimeout !== "function") {
    return setBottomNavGestureActive(false);
  }

  if (bottomNavigationGestureResetTimer) {
    window.clearTimeout(bottomNavigationGestureResetTimer);
  }

  bottomNavigationGestureResetTimer = window.setTimeout(() => {
    setBottomNavGestureActive(false);
  }, 80);

  return true;
}

function isBottomNavGestureActive() {
  return bottomNavigationGestureActive === true;
}

function containBottomNavGestureEvent(event) {
  if (!event) return false;

  if (event.cancelable && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  } else if (typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }

  return true;
}

function clampBottomNavScrollLeft(nav, scrollLeft) {
  if (!nav) return 0;

  const maxScrollLeft = Math.max(0, (nav.scrollWidth || 0) - (nav.clientWidth || 0));
  return Math.max(0, Math.min(maxScrollLeft, Number(scrollLeft || 0)));
}

function handleGlobalBottomNavGestureStart(event) {
  const nav = getBottomNavGestureElement(event);
  if (!nav) return;

  const touch = event.touches && event.touches[0];

  bottomNavigationGestureNav = nav;
  bottomNavigationGestureStartX = touch ? Number(touch.clientX || 0) : Number(event.clientX || 0);
  bottomNavigationGestureStartY = touch ? Number(touch.clientY || 0) : Number(event.clientY || 0);
  bottomNavigationGestureStartScrollLeft = Number(nav.scrollLeft || 0);
  setBottomNavGestureActive(true);
}

function handleGlobalBottomNavGestureMove(event) {
  const nav = bottomNavigationGestureNav || getBottomNavGestureElement(event);
  if (!nav || (!isBottomNavGestureActive() && !isBottomNavGestureTarget(event))) return;

  setBottomNavGestureActive(true);
  bottomNavigationGestureNav = nav;

  if (event.type === "wheel") {
    const deltaX = Number(event.deltaX || 0);
    const deltaY = Number(event.deltaY || 0);
    const scrollDelta = Math.abs(deltaX) >= Math.abs(deltaY)
      ? deltaX
      : (event.shiftKey ? deltaY : 0);

    if (scrollDelta) {
      nav.scrollLeft = clampBottomNavScrollLeft(nav, (nav.scrollLeft || 0) + scrollDelta);
      containBottomNavGestureEvent(event);
    }
    return;
  }

  const touch = event.touches && event.touches[0];
  if (!touch) return;

  const deltaX = Number(touch.clientX || 0) - bottomNavigationGestureStartX;
  const deltaY = Number(touch.clientY || 0) - bottomNavigationGestureStartY;
  const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

  // V92.3: the shell owns the complete touch gesture while it is inside the
  // extended bottom nav. Horizontal movement scrolls only the nav; vertical
  // movement is absorbed so the page and browser history cannot move instead.
  if (isHorizontalSwipe) {
    nav.scrollLeft = clampBottomNavScrollLeft(
      nav,
      bottomNavigationGestureStartScrollLeft - deltaX
    );
  }

  containBottomNavGestureEvent(event);
}

function handleGlobalBottomNavGestureEnd(event) {
  if (!isBottomNavGestureActive() && !isBottomNavGestureTarget(event)) return;
  clearBottomNavGestureActiveSoon();
}

function installGlobalBottomNavigationGestureBoundary() {
  if (bottomNavigationGestureBoundaryInstalled === true) return true;
  if (typeof document === "undefined" || typeof document.addEventListener !== "function") return false;

  bottomNavigationGestureBoundaryInstalled = true;

  ["touchstart", "pointerdown"].forEach(eventName => {
    document.addEventListener(eventName, handleGlobalBottomNavGestureStart, {
      capture: true,
      passive: true
    });
  });

  document.addEventListener("touchmove", handleGlobalBottomNavGestureMove, {
    capture: true,
    passive: false
  });

  document.addEventListener("wheel", handleGlobalBottomNavGestureMove, {
    capture: true,
    passive: false
  });

  ["touchend", "touchcancel", "pointerup", "pointercancel"].forEach(eventName => {
    document.addEventListener(eventName, handleGlobalBottomNavGestureEnd, {
      capture: true,
      passive: true
    });
  });

  return true;
}

installGlobalBottomNavigationGestureBoundary();

function showScreen(screenId) {
  const previousScreenId = typeof getActiveScreenId === "function" ? getActiveScreenId() : "";
  let didShow = false;

  if (window.M4LDom && typeof window.M4LDom.safeShowScreen === "function") {
    didShow = window.M4LDom.safeShowScreen(screenId);
  } else {
    const target = document.getElementById(screenId);
    if (!target) {
      console.warn("Missing screen:", screenId);
      return false;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    target.classList.add("active");
    didShow = true;
  }

  if (!didShow) {
    return false;
  }

  // V96.5: shared in-screen x-close controls use the same role-aware Home
  // action as the app shell, including controls rendered directly in HTML.
  if (typeof bindHeaderIconActionHandlers === "function") {
    bindHeaderIconActionHandlers();
  }

  if (typeof updateUserBand === "function") {
    updateUserBand(screenId);
  }

  if (typeof updateActiveSectionBodyClasses === "function") {
    updateActiveSectionBodyClasses(screenId);
  }

  if (typeof updateBottomNavigation === "function") {
    updateBottomNavigation(screenId);
  }


  if (previousScreenId === "record-lesson-screen" && screenId !== "record-lesson-screen" && window.M4LRecorder && typeof window.M4LRecorder.cleanup === "function") {
    window.M4LRecorder.cleanup({ keepPages: true });
  }

  if (screenId === "record-lesson-screen" && window.M4LRecorder && typeof window.M4LRecorder.open === "function") {
    window.M4LRecorder.open();
  }

  if (typeof bindCoverHomeNavigation === "function") {
    bindCoverHomeNavigation();
  }

  if (typeof hydrateCoverHomeNavigationButtons === "function") {
    hydrateCoverHomeNavigationButtons(document.getElementById(screenId) || document);
  }

  if (typeof bindHomeNativeScrollControls === "function" && document.getElementById(screenId)?.querySelector("[data-home-swipe-track]")) {
    bindHomeNativeScrollControls(screenId);
  }

  if (screenId === "student-home" && typeof scheduleStudentHomeTimetableLoad === "function") {
    scheduleStudentHomeTimetableLoad();
  }

  if (screenId === "admin-home" && typeof scheduleAdminHomeTimetableLoad === "function") {
    scheduleAdminHomeTimetableLoad();
  }

  if (typeof recordM4LAppHistoryScreen === "function") {
    recordM4LAppHistoryScreen(screenId, { from: previousScreenId });
  }

  return true;
}



/* =========================
   APP BROWSER BACK HISTORY - V91.8
   Section-aware history for Library, Progress, Recorder, and Attendance.
   Browser Back closes the current child/detail view and restores that
   section's home view before any cross-section navigation is considered.
========================= */

const M4L_APP_HISTORY_FLAG = "maktab4life";
const M4L_APP_HISTORY_VERSION = 923;
const M4L_APP_HISTORY_EXIT_WINDOW_MS = 1800;
const M4L_APP_HISTORY_DESKTOP_GUARD_QUERY = "(min-width: 768px)";

const M4L_APP_HISTORY_SECTION_ROOTS = Object.freeze({
  library: {
    default: "student-resources-subjects"
  },
  progress: {
    student: "progress-subjects-screen",
    admin: "progress-report",
    default: "progress-subjects-screen"
  },
  recorder: {
    default: "record-lesson-screen"
  },
  attendance: {
    default: "attendance-screen"
  }
});

const m4lAppHistorySectionHandlers = Object.create(null);

let m4lAppHistoryBound = false;
let m4lAppHistoryHandlingPopState = false;
let m4lAppHistoryExitArmed = false;
let m4lAppHistoryLastExitPromptAt = 0;
let m4lAppHistoryLastKnownState = null;
let m4lAppHistoryModuleAdaptersBound = false;
let m4lAppHistoryModuleAdapterRetryTimer = 0;
let m4lAppHistoryModuleAdapterRetryCount = 0;

function isM4LAppHistorySupported() {
  return typeof window !== "undefined" &&
    window.history &&
    typeof window.history.pushState === "function" &&
    typeof window.history.replaceState === "function";
}

function getM4LAppHistoryCurrentState() {
  return isM4LAppHistorySupported() ? (window.history.state || null) : null;
}

function isM4LAppHistoryState(candidate) {
  return !!candidate && candidate.app === M4L_APP_HISTORY_FLAG;
}

function getM4LAppHomeScreenId(roleValue) {
  const role = String(roleValue || (typeof getBottomNavRole === "function" ? getBottomNavRole() : "") || "").toLowerCase();
  return role === "admin" ? "admin-home" : "student-home";
}

function isM4LAppHomeScreen(screenId) {
  const id = String(screenId || "");
  return id === "student-home" || id === "admin-home";
}

function isM4LAppAuthScreen(screenId) {
  return String(screenId || "") === "auth-screen";
}

function isM4LAppLayerScreen(screenId) {
  return [
    "pdf-viewer-screen",
    "resource-viewer-screen",
    "audio-player-screen",
    "video-player-screen"
  ].includes(String(screenId || ""));
}

function normalizeM4LAppHistorySection(sectionValue) {
  const value = String(sectionValue || "").trim().toLowerCase();

  if (["library", "resources", "resource"].includes(value)) return "library";
  if (["progress"].includes(value)) return "progress";
  if (["record", "recorder", "lesson-recorder"].includes(value)) return "recorder";
  if (["attendance", "register"].includes(value)) return "attendance";

  return "";
}

function getM4LAppHistoryRole() {
  return typeof getBottomNavRole === "function" ? String(getBottomNavRole() || "") : "";
}

function getM4LAppSectionForScreen(screenId, roleValue) {
  const id = String(screenId || "");
  const role = String(roleValue || getM4LAppHistoryRole() || "").toLowerCase();

  if (!id) return "";

  if (
    id === "pdf-viewer-screen" ||
    id === "resource-viewer-screen" ||
    id === "audio-player-screen" ||
    id === "video-player-screen" ||
    id.startsWith("student-resource") ||
    id.startsWith("student-resources") ||
    id.startsWith("library-")
  ) {
    return "library";
  }

  if (
    id === "attendance-screen" ||
    id.startsWith("attendance-")
  ) {
    return "attendance";
  }

  if (
    id === "record-lesson-screen" ||
    id.startsWith("record-") ||
    id.startsWith("recorder-")
  ) {
    return "recorder";
  }

  if (
    id === "progress-report" ||
    id === "progress-subjects-screen" ||
    id === "progress-tasks-screen" ||
    id === "progress-task-students-screen" ||
    id === "teacher-student-tasks" ||
    id.startsWith("progress-") ||
    id.startsWith("admin-progress")
  ) {
    return "progress";
  }

  // Role is accepted so future role-specific section names can be resolved
  // without changing callers.
  void role;
  return "";
}

function getM4LAppSectionHomeScreenId(sectionValue, roleValue) {
  const section = normalizeM4LAppHistorySection(sectionValue);
  const role = String(roleValue || getM4LAppHistoryRole() || "").toLowerCase();
  const config = M4L_APP_HISTORY_SECTION_ROOTS[section];

  if (!config) return "";

  return String(config[role] || config.default || "");
}

function isM4LAppSectionHomeScreen(screenId, sectionValue, roleValue) {
  const section = normalizeM4LAppHistorySection(
    sectionValue || getM4LAppSectionForScreen(screenId, roleValue)
  );
  const homeScreenId = getM4LAppSectionHomeScreenId(section, roleValue);

  return !!homeScreenId && String(screenId || "") === homeScreenId;
}

function getM4LAppHistoryToken() {
  if (typeof state !== "undefined" && state && state.token) {
    return String(state.token || "");
  }

  try {
    return String(localStorage.getItem("maktab_token") || "");
  } catch (error) {
    return "";
  }
}

function getM4LAppHistorySafeContext(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn("App history context was not serializable and was omitted.", error);
    return null;
  }
}

function getM4LAppHistoryContextKey(context) {
  if (context === undefined || context === null) return "";

  try {
    return JSON.stringify(context);
  } catch (error) {
    return "";
  }
}

function getM4LAppHistoryStateForScreen(screenId, options = {}) {
  const id = String(screenId || "");
  const role = String(options.role || getM4LAppHistoryRole() || "");
  const section = normalizeM4LAppHistorySection(
    options.section || getM4LAppSectionForScreen(id, role)
  );
  const sectionHome = String(
    options.sectionHome ||
    getM4LAppSectionHomeScreenId(section, role) ||
    ""
  );
  const viewId = String(options.viewId || "").trim();

  let kind = String(options.kind || "").trim();

  if (!kind) {
    if (isM4LAppLayerScreen(id)) {
      kind = "layer";
    } else if (isM4LAppHomeScreen(id)) {
      kind = "home";
    } else if (isM4LAppAuthScreen(id)) {
      kind = "auth";
    } else if (section && viewId && viewId !== "home") {
      kind = "section-view";
    } else if (section && id === sectionHome) {
      kind = "section-home";
    } else if (section) {
      kind = "section-screen";
    } else {
      kind = "screen";
    }
  }

  const stateData = {
    app: M4L_APP_HISTORY_FLAG,
    version: M4L_APP_HISTORY_VERSION,
    screenId: id,
    role,
    kind
  };

  if (section) {
    stateData.section = section;
    stateData.sectionHome = sectionHome;
  }

  if (viewId) {
    stateData.viewId = viewId;
  }

  if (options.context !== undefined) {
    stateData.context = getM4LAppHistorySafeContext(options.context);
    stateData.contextKey = getM4LAppHistoryContextKey(stateData.context);
  }

  if (kind === "layer" || kind === "section-view" || kind === "section-screen") {
    const from = String(options.returnTo || options.from || "");
    stateData.returnTo = from && from !== id
      ? from
      : (sectionHome || getM4LAppHomeScreenId(role));
  }

  if (options.guard === true) {
    stateData.guard = true;
  }

  return stateData;
}

function bindM4LAppHistoryBackHandler() {
  if (m4lAppHistoryBound === true) return true;
  if (!isM4LAppHistorySupported() || typeof window.addEventListener !== "function") return false;

  m4lAppHistoryBound = true;
  window.addEventListener("popstate", handleM4LAppHistoryPopState);
  return true;
}

function replaceM4LAppHistoryState(screenId, options = {}) {
  if (!isM4LAppHistorySupported()) return false;

  const nextState = getM4LAppHistoryStateForScreen(screenId, options);

  try {
    window.history.replaceState(nextState, "", window.location.href);
    m4lAppHistoryLastKnownState = nextState;
    return true;
  } catch (error) {
    console.error("Could not replace app history state.", error);
    return false;
  }
}

function pushM4LAppHistoryState(screenId, options = {}) {
  if (!isM4LAppHistorySupported()) return false;

  const nextState = getM4LAppHistoryStateForScreen(screenId, options);

  try {
    window.history.pushState(nextState, "", window.location.href);
    m4lAppHistoryLastKnownState = nextState;
    return true;
  } catch (error) {
    console.error("Could not push app history state.", error);
    return false;
  }
}

function ensureM4LAppHomeHistory(screenId) {
  const id = String(screenId || getM4LAppHomeScreenId());
  const currentState = getM4LAppHistoryCurrentState();

  if (isM4LAppHistoryState(currentState) &&
      currentState.screenId === id &&
      currentState.kind === "home" &&
      currentState.guard === true) {
    m4lAppHistoryLastKnownState = currentState;
    return true;
  }

  replaceM4LAppHistoryState(id);
  pushM4LAppHistoryState(id, { guard: true });
  return true;
}

function shouldSkipM4LAppHistoryDuplicate(screenId, options = {}) {
  const currentState = getM4LAppHistoryCurrentState();
  if (!isM4LAppHistoryState(currentState)) return false;

  const targetId = String(screenId || "");
  const targetSection = normalizeM4LAppHistorySection(
    options.section || getM4LAppSectionForScreen(targetId)
  );
  const hasExplicitViewId = Object.prototype.hasOwnProperty.call(options, "viewId");
  const targetViewId = String(options.viewId || "");

  if (
    currentState.screenId !== targetId ||
    String(currentState.section || "") !== targetSection ||
    currentState.kind === "layer" ||
    currentState.guard === true
  ) {
    return false;
  }

  // showScreen() may be called again while a module changes an internal view
  // inside the same screen (Attendance panels and Admin Individual Progress).
  // That internal view is recorded separately by recordM4LAppSectionView(), so
  // do not create an extra generic same-screen entry first.
  if (!hasExplicitViewId) {
    return true;
  }

  return String(currentState.viewId || "") === targetViewId;
}

function isSameM4LAppSectionHistoryView(currentState, sectionValue, viewId, screenId, context) {
  if (!isM4LAppHistoryState(currentState)) return false;

  const section = normalizeM4LAppHistorySection(sectionValue);
  const targetScreenId = String(screenId || "");
  const targetViewId = String(viewId || "");
  const targetContextKey = getM4LAppHistoryContextKey(getM4LAppHistorySafeContext(context));

  return String(currentState.section || "") === section &&
    String(currentState.screenId || "") === targetScreenId &&
    String(currentState.viewId || "") === targetViewId &&
    String(currentState.contextKey || "") === targetContextKey &&
    currentState.guard !== true;
}

function recordM4LAppSectionHome(sectionValue, options = {}) {
  const section = normalizeM4LAppHistorySection(sectionValue);
  if (!section || !isM4LAppHistorySupported()) return false;
  if (m4lAppHistoryHandlingPopState === true) return false;

  const role = String(options.role || getM4LAppHistoryRole() || "");
  const screenId = String(
    options.screenId ||
    getM4LAppSectionHomeScreenId(section, role) ||
    getActiveScreenId() ||
    ""
  );

  if (!screenId) return false;

  const currentState = getM4LAppHistoryCurrentState();

  if (
    isM4LAppHistoryState(currentState) &&
    String(currentState.section || "") === section &&
    String(currentState.screenId || "") === screenId
  ) {
    return replaceM4LAppHistoryState(screenId, {
      section,
      sectionHome: screenId,
      viewId: "home",
      kind: "section-home",
      context: options.context
    });
  }

  if (options.replace === true) {
    return replaceM4LAppHistoryState(screenId, {
      section,
      sectionHome: screenId,
      viewId: "home",
      kind: "section-home",
      context: options.context
    });
  }

  return pushM4LAppHistoryState(screenId, {
    section,
    sectionHome: screenId,
    viewId: "home",
    kind: "section-home",
    context: options.context
  });
}

function recordM4LAppSectionView(sectionValue, viewIdValue, options = {}) {
  const section = normalizeM4LAppHistorySection(sectionValue);
  const viewId = String(viewIdValue || "").trim();

  if (!section || !viewId || !isM4LAppHistorySupported()) return false;
  if (m4lAppHistoryHandlingPopState === true) return false;

  const role = String(options.role || getM4LAppHistoryRole() || "");
  const sectionHome = String(
    options.sectionHome ||
    getM4LAppSectionHomeScreenId(section, role) ||
    ""
  );
  const screenId = String(
    options.screenId ||
    getActiveScreenId() ||
    sectionHome
  );

  if (!screenId) return false;

  const currentState = getM4LAppHistoryCurrentState();

  if (isSameM4LAppSectionHistoryView(currentState, section, viewId, screenId, options.context)) {
    return false;
  }

  const historyOptions = {
    section,
    sectionHome,
    viewId,
    kind: viewId === "home" ? "section-home" : "section-view",
    context: options.context,
    returnTo: options.returnTo || sectionHome
  };

  const shouldReplaceSiblingView =
    options.nested !== true &&
    isM4LAppHistoryState(currentState) &&
    String(currentState.section || "") === section &&
    String(currentState.kind || "") === "section-view";

  if (options.replace === true || viewId === "home" || shouldReplaceSiblingView) {
    return replaceM4LAppHistoryState(screenId, historyOptions);
  }

  return pushM4LAppHistoryState(screenId, historyOptions);
}

function registerM4LAppHistorySection(sectionValue, handlers = {}) {
  const section = normalizeM4LAppHistorySection(sectionValue);
  if (!section || !handlers || typeof handlers !== "object") return false;

  m4lAppHistorySectionHandlers[section] = {
    ...m4lAppHistorySectionHandlers[section],
    ...handlers
  };

  return true;
}

function getM4LAppHistorySectionHandler(sectionValue) {
  const section = normalizeM4LAppHistorySection(sectionValue);
  return section ? (m4lAppHistorySectionHandlers[section] || null) : null;
}

function recordM4LAppHistoryScreen(screenId, options = {}) {
  const id = String(screenId || "");

  if (!id || !isM4LAppHistorySupported()) return false;
  bindM4LAppHistoryBackHandler();

  if (m4lAppHistoryHandlingPopState === true) {
    return false;
  }

  if (isM4LAppAuthScreen(id)) {
    replaceM4LAppHistoryState(id);
    return true;
  }

  if (!getM4LAppHistoryToken()) {
    return false;
  }

  const role = getM4LAppHistoryRole();
  const originScreenId = String(options.from || "");
  const detectedSection = getM4LAppSectionForScreen(id, role);
  const originSection = getM4LAppSectionForScreen(originScreenId, role);
  const section = isM4LAppLayerScreen(id)
    ? (originSection || detectedSection)
    : detectedSection;
  const sectionHome = getM4LAppSectionHomeScreenId(section, role);
  const currentState = getM4LAppHistoryCurrentState();

  // If an in-app close button closes a temporary layer, replace the layer entry
  // instead of pushing a new duplicate return screen. This prevents Back from
  // reopening the resource that was just closed.
  if (isM4LAppHistoryState(currentState) &&
      currentState.kind === "layer" &&
      String(currentState.returnTo || "") === id) {
    replaceM4LAppHistoryState(id, {
      section,
      sectionHome,
      viewId: section && id === sectionHome ? "home" : ""
    });
    return true;
  }

  // Same-screen child views such as Admin Individual Progress and Attendance
  // panels use section-view states. If their own close action restores the
  // section root, replace that child entry rather than leaving stale Back state.
  if (
    isM4LAppHistoryState(currentState) &&
    currentState.kind === "section-view" &&
    section &&
    String(currentState.section || "") === section &&
    id === sectionHome
  ) {
    replaceM4LAppHistoryState(id, {
      section,
      sectionHome,
      viewId: "home",
      kind: "section-home"
    });
    return true;
  }

  if (isM4LAppHomeScreen(id)) {
    ensureM4LAppHomeHistory(id);
    return true;
  }

  if (shouldSkipM4LAppHistoryDuplicate(id, { section })) {
    return false;
  }

  // A temporary media/viewer layer is a direct child of the section home.
  // If another same-section child is currently open, collapse that child first
  // so one browser Back returns to Library/Progress/Recorder/Attendance home.
  if (
    isM4LAppLayerScreen(id) &&
    section &&
    sectionHome &&
    isM4LAppHistoryState(currentState) &&
    String(currentState.section || "") === section &&
    String(currentState.kind || "") === "section-view"
  ) {
    replaceM4LAppHistoryState(sectionHome, {
      section,
      sectionHome,
      viewId: "home",
      kind: "section-home"
    });
  }

  pushM4LAppHistoryState(id, {
    from: options.from,
    returnTo: sectionHome || options.from,
    section,
    sectionHome,
    viewId: section && id === sectionHome ? "home" : ""
  });
  return true;
}

function showM4LAppBackExitHint() {
  if (!document || !document.body) return false;

  let hint = document.getElementById("m4l-back-exit-hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.id = "m4l-back-exit-hint";
    hint.setAttribute("role", "status");
    hint.setAttribute("aria-live", "polite");
    hint.style.position = "fixed";
    hint.style.left = "50%";
    hint.style.bottom = "calc(var(--bottom-nav-height, 76px) + var(--bottom-nav-safe-area, 0px) + 14px)";
    hint.style.transform = "translateX(-50%)";
    hint.style.zIndex = "9999";
    hint.style.maxWidth = "min(92vw, 360px)";
    hint.style.padding = "10px 14px";
    hint.style.borderRadius = "999px";
    hint.style.background = "rgba(34, 43, 23, 0.92)";
    hint.style.color = "#fff";
    hint.style.font = "600 0.9rem system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    hint.style.textAlign = "center";
    hint.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.20)";
    hint.style.pointerEvents = "none";
    hint.style.opacity = "0";
    hint.style.transition = "opacity 160ms ease";
    document.body.appendChild(hint);
  }

  hint.textContent = "Press Back again to exit";
  hint.style.opacity = "1";

  window.clearTimeout(showM4LAppBackExitHint.hideTimer || 0);
  showM4LAppBackExitHint.hideTimer = window.setTimeout(() => {
    const activeHint = document.getElementById("m4l-back-exit-hint");
    if (activeHint) activeHint.style.opacity = "0";
  }, 1500);

  return true;
}

function handleM4LAppHomeBackAttempt(targetScreenId) {
  const now = Date.now();

  if (now - m4lAppHistoryLastExitPromptAt <= M4L_APP_HISTORY_EXIT_WINDOW_MS) {
    m4lAppHistoryExitArmed = true;
    window.history.back();
    return true;
  }

  m4lAppHistoryLastExitPromptAt = now;
  showM4LAppBackExitHint();
  pushM4LAppHistoryState(targetScreenId || getM4LAppHomeScreenId(), { guard: true });
  return true;
}

function isM4LAppHistoryDesktopGuardViewport() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(M4L_APP_HISTORY_DESKTOP_GUARD_QUERY).matches;
}

function shouldGuardM4LAppHistoryPopState(targetState, activeScreenId) {
  const activeId = String(activeScreenId || "");
  const targetId = String(targetState && targetState.screenId ? targetState.screenId : "");

  if (!activeId || !isM4LAppHistoryState(targetState)) return false;
  if (!isM4LAppHistoryDesktopGuardViewport()) return false;
  if (!getM4LAppHistoryToken()) return false;

  const activeSection = getM4LAppSectionForScreen(activeId);
  const targetSection = normalizeM4LAppHistorySection(
    targetState.section || getM4LAppSectionForScreen(targetId, targetState.role)
  );

  // Back inside Library, Progress, Attendance, or Recorder is always allowed.
  // The desktop guard only prevents an edge swipe from escaping the section.
  if (activeSection && targetSection && activeSection === targetSection) {
    return false;
  }

  // V91.3 behaviour remains for ordinary cross-section page movement:
  // medium/large layouts should not let browser Back/edge-swipe move an app
  // section directly to Home. Home/menu/nav buttons remain the explicit exit.
  if (isM4LAppAuthScreen(activeId) || isM4LAppHomeScreen(activeId) || isM4LAppLayerScreen(activeId)) {
    return false;
  }

  if (targetState.kind === "layer") {
    return false;
  }

  if (targetId && targetId === activeId) {
    return false;
  }

  return Boolean(typeof document !== "undefined" && document.getElementById(activeId));
}

function rearmM4LAppHistoryCurrentScreen(activeScreenId) {
  const id = String(activeScreenId || "");
  if (!id || !isM4LAppHistorySupported()) return false;

  const current = m4lAppHistoryLastKnownState;
  const section = getM4LAppSectionForScreen(id);

  pushM4LAppHistoryState(id, {
    guard: true,
    section,
    sectionHome: getM4LAppSectionHomeScreenId(section),
    viewId: current && current.screenId === id ? current.viewId : "",
    context: current && current.screenId === id ? current.context : null
  });
  return true;
}

function cleanupM4LAppHistoryLayerBeforeRestore(activeScreenId, targetScreenId) {
  const activeId = String(activeScreenId || "");
  const targetId = String(targetScreenId || "");

  if (activeId === "pdf-viewer-screen" && targetId !== "pdf-viewer-screen") {
    ["pdf-viewer-frame", "pdf-viewer-frame-secondary"].forEach(frameId => {
      const viewerFrame = document.getElementById(frameId);
      if (viewerFrame) {
        viewerFrame.src = "";
        viewerFrame.removeAttribute("src");
      }
    });
    window.M4LPdfSplitView?.reset?.({ clearSecondary: true });

    if (document.body) {
      document.body.classList.remove("pdf-viewer-open");
    }
  }

  return true;
}

function callM4LAppHistoryOptionalFunction(functionName, args = []) {
  const fn = typeof window !== "undefined" ? window[String(functionName || "")] : null;

  if (typeof fn !== "function") {
    return false;
  }

  return fn(...(Array.isArray(args) ? args : []));
}

function restoreM4LAppLibraryHistoryState(targetState) {
  const viewId = String(targetState.viewId || "home");
  const context = targetState.context || {};
  const rootScreenId = String(targetState.sectionHome || "student-resources-subjects");

  if (typeof showScreen === "function" && document.getElementById(rootScreenId)) {
    showScreen(rootScreenId);
  }

  if (viewId === "inline-media" && context.resourceId) {
    if (
      window.M4LResources &&
      typeof window.M4LResources.openLibraryResourceById === "function"
    ) {
      return window.M4LResources.openLibraryResourceById(context.resourceId);
    }

    return callM4LAppHistoryOptionalFunction("openLibraryResourceById", [context.resourceId]);
  }

  if (
    window.M4LResources &&
    typeof window.M4LResources.clearInlineResourcePreviews === "function"
  ) {
    window.M4LResources.clearInlineResourcePreviews();
  } else {
    callM4LAppHistoryOptionalFunction("clearInlineResourcePreviews");
  }

  return true;
}

function restoreM4LAppAttendanceHistoryState(targetState) {
  const viewId = String(targetState.viewId || "home");

  if (viewId === "records" && typeof window.openViewAttendance === "function") {
    return window.openViewAttendance();
  }

  if (viewId === "stats" && typeof window.openAttendanceStats === "function") {
    return window.openAttendanceStats();
  }

  if (typeof window.openMarkRegister === "function") {
    return window.openMarkRegister();
  }

  const rootScreenId = String(targetState.sectionHome || "attendance-screen");
  return typeof showScreen === "function" ? showScreen(rootScreenId) : false;
}

function restoreM4LAppProgressHistoryState(targetState) {
  const viewId = String(targetState.viewId || "home");
  const context = targetState.context || {};
  const role = String(targetState.role || getM4LAppHistoryRole() || "").toLowerCase();

  if (
    viewId === "individual" &&
    context.studentid &&
    typeof window.openAdminIndividualStudentCard === "function"
  ) {
    return window.openAdminIndividualStudentCard(
      context.studentid,
      context.username || context.studentName || "Student"
    );
  }

  if (
    viewId === "student-module" &&
    context.moduleKey &&
    typeof window.openStudentSubjectTasks === "function"
  ) {
    return window.openStudentSubjectTasks(context.moduleKey);
  }

  if (role === "admin" && typeof window.requestCloseAdminIndividualStudentView === "function") {
    return window.requestCloseAdminIndividualStudentView({ fromBrowserHistory: true });
  }

  if (role === "admin" && typeof window.showProgressReport === "function") {
    return window.showProgressReport();
  }

  if (role !== "admin" && typeof window.showStudentTasks === "function") {
    return window.showStudentTasks();
  }

  const rootScreenId = String(
    targetState.sectionHome ||
    getM4LAppSectionHomeScreenId("progress", role)
  );

  return typeof showScreen === "function" ? showScreen(rootScreenId) : false;
}

function restoreM4LAppRecorderHistoryState(targetState) {
  const rootScreenId = String(targetState.sectionHome || "record-lesson-screen");
  const requestedViewId = String(targetState.viewId || "pages");
  const viewId = ["home", "pages", "record", "preview"].includes(requestedViewId)
    ? requestedViewId
    : "pages";

  if (typeof showScreen === "function" && document.getElementById(rootScreenId)) {
    showScreen(rootScreenId);
  }

  const recorder = window.M4LRecorder;

  if (recorder && typeof recorder.restoreHistoryState === "function") {
    return recorder.restoreHistoryState({
      viewId,
      context: targetState.context || null,
      historyState: targetState
    });
  }

  if (recorder && typeof recorder.open === "function") {
    return recorder.open();
  }

  return true;
}

function restoreM4LAppSectionHistoryState(targetState) {
  const section = normalizeM4LAppHistorySection(targetState && targetState.section);
  const handler = getM4LAppHistorySectionHandler(section);

  if (handler && typeof handler.restore === "function") {
    return handler.restore(targetState);
  }

  if (section === "library") {
    return restoreM4LAppLibraryHistoryState(targetState);
  }

  if (section === "attendance") {
    return restoreM4LAppAttendanceHistoryState(targetState);
  }

  if (section === "progress") {
    return restoreM4LAppProgressHistoryState(targetState);
  }

  if (section === "recorder") {
    return restoreM4LAppRecorderHistoryState(targetState);
  }

  const targetScreenId = String(targetState.screenId || "");
  return targetScreenId && typeof showScreen === "function"
    ? showScreen(targetScreenId)
    : false;
}

function restoreM4LAppHistoryState(targetState, activeScreenId) {
  const targetScreenId = String(
    targetState.screenId ||
    getM4LAppHomeScreenId(targetState.role)
  );

  cleanupM4LAppHistoryLayerBeforeRestore(activeScreenId, targetScreenId);

  if (targetState.kind === "layer") {
    return document.getElementById(targetScreenId) && typeof showScreen === "function"
      ? showScreen(targetScreenId)
      : false;
  }

  if (targetState.section) {
    return restoreM4LAppSectionHistoryState(targetState);
  }

  if (!document.getElementById(targetScreenId)) {
    return false;
  }

  return typeof showScreen === "function" ? showScreen(targetScreenId) : false;
}

function restoreM4LAppSectionHomeFallback(activeScreenId) {
  const section = getM4LAppSectionForScreen(activeScreenId);
  const sectionHome = getM4LAppSectionHomeScreenId(section);

  if (!section || !sectionHome) {
    return false;
  }

  const fallbackState = getM4LAppHistoryStateForScreen(sectionHome, {
    section,
    sectionHome,
    viewId: "home",
    kind: "section-home"
  });

  m4lAppHistoryHandlingPopState = true;

  let result;
  try {
    result = restoreM4LAppSectionHistoryState(fallbackState);
  } catch (error) {
    m4lAppHistoryHandlingPopState = false;
    throw error;
  }

  const finish = () => {
    m4lAppHistoryHandlingPopState = false;
    pushM4LAppHistoryState(sectionHome, {
      section,
      sectionHome,
      viewId: "home",
      kind: "section-home"
    });
  };

  if (result && typeof result.then === "function") {
    result.finally(finish);
  } else {
    finish();
  }

  return true;
}

function handleM4LAppHistoryPopState(event) {
  if (m4lAppHistoryExitArmed === true) {
    m4lAppHistoryExitArmed = false;
    return;
  }

  const targetState = event ? event.state : null;
  const activeScreenId = typeof getActiveScreenId === "function" ? getActiveScreenId() : "";

  if (!isM4LAppHistoryState(targetState)) {
    const lastState = m4lAppHistoryLastKnownState;

    // A child/detail view should never fall out of the app because an older or
    // external history entry sits underneath it. Restore the section home.
    if (
      isM4LAppHistoryState(lastState) &&
      ["layer", "section-view", "section-screen"].includes(String(lastState.kind || "")) &&
      restoreM4LAppSectionHomeFallback(activeScreenId)
    ) {
      return;
    }

    return;
  }

  const targetScreenId = String(
    targetState.screenId ||
    getM4LAppHomeScreenId(targetState.role)
  );

  if (shouldGuardM4LAppHistoryPopState(targetState, activeScreenId)) {
    rearmM4LAppHistoryCurrentScreen(activeScreenId);
    return;
  }

  if (targetState.kind === "home" && isM4LAppHomeScreen(activeScreenId)) {
    handleM4LAppHomeBackAttempt(targetScreenId);
    return;
  }

  const previousState = m4lAppHistoryLastKnownState;

  m4lAppHistoryHandlingPopState = true;
  m4lAppHistoryLastKnownState = targetState;

  let result;

  try {
    result = restoreM4LAppHistoryState(targetState, activeScreenId);
  } catch (error) {
    m4lAppHistoryHandlingPopState = false;
    m4lAppHistoryLastKnownState = previousState;
    console.error("Could not restore app history state.", error);
    return;
  }

  const finish = restored => {
    m4lAppHistoryHandlingPopState = false;

    // A module may reject Back because the user cancelled an unsaved-change
    // confirmation. Restore the history entry that still matches the visible
    // child view instead of leaving browser history and UI out of sync.
    if (restored === false && isM4LAppHistoryState(previousState)) {
      try {
        window.history.pushState(previousState, "", window.location.href);
        m4lAppHistoryLastKnownState = previousState;
      } catch (error) {
        console.error("Could not restore the cancelled app history entry.", error);
      }
      return;
    }

    m4lAppHistoryLastKnownState = targetState;
  };

  if (result && typeof result.then === "function") {
    result.then(finish, error => {
      finish(false);
      console.error("Could not restore app history state.", error);
    });
  } else {
    finish(result);
  }
}

function getM4LAppHistoryPublicState() {
  return getM4LAppHistoryCurrentState();
}

function closeM4LAppHistoryLayer(returnToScreenId) {
  const currentState = getM4LAppHistoryCurrentState();
  const target = String(
    returnToScreenId ||
    (isM4LAppHistoryState(currentState) ? currentState.returnTo : "") ||
    getM4LAppHomeScreenId()
  );

  if (
    isM4LAppHistoryState(currentState) &&
    ["layer", "section-view", "section-screen"].includes(String(currentState.kind || ""))
  ) {
    window.history.back();
    return true;
  }

  if (target && typeof showScreen === "function") {
    showScreen(target);
    return true;
  }

  return false;
}

function closeM4LAppSectionView(sectionValue) {
  const section = normalizeM4LAppHistorySection(sectionValue);
  const currentState = getM4LAppHistoryCurrentState();

  if (
    section &&
    isM4LAppHistoryState(currentState) &&
    String(currentState.section || "") === section &&
    String(currentState.kind || "") === "section-view"
  ) {
    window.history.back();
    return true;
  }

  const sectionHome = getM4LAppSectionHomeScreenId(section);
  if (!sectionHome) return false;

  const fallbackState = getM4LAppHistoryStateForScreen(sectionHome, {
    section,
    sectionHome,
    viewId: "home",
    kind: "section-home"
  });

  return restoreM4LAppSectionHistoryState(fallbackState);
}

function scheduleM4LAppHistoryCommit(callback) {
  if (typeof callback !== "function") return false;

  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return true;
  }

  if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
    window.setTimeout(callback, 0);
    return true;
  }

  callback();
  return true;
}

function wrapM4LAppHistoryGlobalFunction(functionName, afterCall) {
  if (typeof window === "undefined") return false;

  const original = window[String(functionName || "")];

  if (typeof original !== "function") return false;
  if (original.__m4lAppHistoryWrapped === true) return true;

  const wrapped = function wrappedM4LAppHistoryFunction(...args) {
    const result = original.apply(this, args);

    const commit = resolvedValue => {
      if (m4lAppHistoryHandlingPopState === true) return;
      if (typeof afterCall === "function") {
        afterCall(args, resolvedValue);
      }
    };

    if (result && typeof result.then === "function") {
      result.then(
        value => commit(value),
        () => {}
      );
    } else {
      scheduleM4LAppHistoryCommit(() => commit(result));
    }

    return result;
  };

  try {
    Object.defineProperty(wrapped, "name", {
      value: original.name || functionName,
      configurable: true
    });
  } catch (error) {
    // Function names are cosmetic; wrapping remains valid without this.
  }

  wrapped.__m4lAppHistoryWrapped = true;
  wrapped.__m4lAppHistoryOriginal = original;
  window[functionName] = wrapped;
  return true;
}

function syncM4LAppHistoryLibraryInlinePreview(resourceId) {
  const id = String(resourceId || "");
  const visiblePreview = Array.from(
    document.querySelectorAll(".library-inline-preview")
  ).find(preview => {
    return preview &&
      preview.classList &&
      !preview.classList.contains("hidden") &&
      String(preview.dataset.currentResourceId || "") === id;
  });

  if (visiblePreview && id) {
    recordM4LAppSectionView("library", "inline-media", {
      screenId: "student-resources-subjects",
      context: {
        resourceId: id
      }
    });
    return true;
  }

  recordM4LAppSectionHome("library", {
    screenId: "student-resources-subjects",
    replace: true
  });
  return false;
}

function installM4LAppHistoryGlobalFunctionAdapters() {
  let installedCount = 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("showStudentResources", () => {
    recordM4LAppSectionHome("library", {
      screenId: "student-resources-subjects",
      replace: true
    });
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("showAdminResources", () => {
    recordM4LAppSectionHome("library", {
      screenId: "student-resources-subjects",
      replace: true
    });
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("openInlineResourcePreview", args => {
    syncM4LAppHistoryLibraryInlinePreview(args[1]);
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("openMarkRegister", () => {
    recordM4LAppSectionHome("attendance", {
      screenId: "attendance-screen",
      replace: true,
      context: {
        panel: "register"
      }
    });
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("openViewAttendance", () => {
    recordM4LAppSectionView("attendance", "records", {
      screenId: "attendance-screen",
      context: {
        panel: "records"
      }
    });
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("openAttendanceStats", () => {
    recordM4LAppSectionView("attendance", "stats", {
      screenId: "attendance-screen",
      context: {
        panel: "stats"
      }
    });
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("showProgressReport", () => {
    recordM4LAppSectionHome("progress", {
      screenId: "progress-report",
      replace: true,
      context: {
        view: "class"
      }
    });
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("showStudentTasks", () => {
    recordM4LAppSectionHome("progress", {
      screenId: "progress-subjects-screen",
      replace: true,
      context: {
        view: "modules"
      }
    });
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("openAdminIndividualStudentCard", args => {
    recordM4LAppSectionView("progress", "individual", {
      screenId: "progress-report",
      context: {
        studentid: String(args[0] || ""),
        username: String(args[1] || "Student")
      }
    });
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("requestCloseAdminIndividualStudentView", () => {
    recordM4LAppSectionHome("progress", {
      screenId: "progress-report",
      replace: true,
      context: {
        view: "class"
      }
    });
  }) ? 1 : 0;

  installedCount += wrapM4LAppHistoryGlobalFunction("openStudentSubjectTasks", args => {
    recordM4LAppSectionView("progress", "student-module", {
      screenId: "progress-subjects-screen",
      context: {
        moduleKey: String(args[0] || "")
      }
    });
  }) ? 1 : 0;

  return installedCount;
}

function handleM4LAppHistoryModuleClick(event) {
  const target = event && event.target;
  if (!target || typeof target.closest !== "function") return;

  const resourceCard = target.closest(".library-resource-card");

  if (resourceCard) {
    const resourceId = String(resourceCard.dataset.resourceId || "");

    window.setTimeout(() => {
      if (getActiveScreenId() === "pdf-viewer-screen") {
        return;
      }

      syncM4LAppHistoryLibraryInlinePreview(resourceId);
    }, 0);

    return;
  }

  const attendanceAction = target.closest("[data-attendance-action]");

  if (attendanceAction) {
    const action = String(attendanceAction.dataset.attendanceAction || "");

    window.setTimeout(() => {
      if (action === "open-register-panel") {
        recordM4LAppSectionHome("attendance", {
          screenId: "attendance-screen",
          replace: true,
          context: { panel: "register" }
        });
      } else if (action === "open-records-panel") {
        recordM4LAppSectionView("attendance", "records", {
          screenId: "attendance-screen",
          context: { panel: "records" }
        });
      } else if (action === "open-stats-panel") {
        recordM4LAppSectionView("attendance", "stats", {
          screenId: "attendance-screen",
          context: { panel: "stats" }
        });
      }
    }, 0);

    return;
  }

  const progressAction = target.closest("[data-progress-action]");

  if (!progressAction) return;

  const action = String(progressAction.dataset.progressAction || "");

  window.setTimeout(() => {
    if (action === "open-admin-individual-student-card") {
      recordM4LAppSectionView("progress", "individual", {
        screenId: "progress-report",
        context: {
          studentid: String(progressAction.dataset.studentid || ""),
          username: String(progressAction.dataset.username || "Student")
        }
      });
    } else if (action === "close-admin-individual-student-view") {
      recordM4LAppSectionHome("progress", {
        screenId: "progress-report",
        replace: true,
        context: { view: "class" }
      });
    } else if (action === "open-student-subject-tasks") {
      recordM4LAppSectionView("progress", "student-module", {
        screenId: "progress-subjects-screen",
        context: {
          moduleKey: String(progressAction.dataset.subjectKey || "")
        }
      });
    }
  }, 0);
}

function installM4LAppHistoryModuleAdapters() {
  installM4LAppHistoryGlobalFunctionAdapters();

  if (
    m4lAppHistoryModuleAdaptersBound !== true &&
    typeof document !== "undefined" &&
    typeof document.addEventListener === "function"
  ) {
    m4lAppHistoryModuleAdaptersBound = true;
    document.addEventListener("click", handleM4LAppHistoryModuleClick, {
      capture: true,
      passive: true
    });
  }

  if (
    typeof window !== "undefined" &&
    m4lAppHistoryModuleAdapterRetryCount < 20
  ) {
    window.clearTimeout(m4lAppHistoryModuleAdapterRetryTimer || 0);
    m4lAppHistoryModuleAdapterRetryTimer = window.setTimeout(() => {
      m4lAppHistoryModuleAdapterRetryCount += 1;
      installM4LAppHistoryModuleAdapters();
    }, 500);
  }

  return true;
}

function initM4LAppHistory() {
  bindM4LAppHistoryBackHandler();
  installM4LAppHistoryModuleAdapters();

  const currentState = getM4LAppHistoryCurrentState();
  if (isM4LAppHistoryState(currentState)) {
    m4lAppHistoryLastKnownState = currentState;
  }

  const activeScreenId = typeof getActiveScreenId === "function" ? getActiveScreenId() : "";
  if (activeScreenId) {
    recordM4LAppHistoryScreen(activeScreenId);
  }

  return true;
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initM4LAppHistory, { once: true });
  } else {
    initM4LAppHistory();
  }
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("load", installM4LAppHistoryModuleAdapters, { once: true });
}


let homeNativeScrollResizeHandlerBound = false;

function isHomeNativeScrollScreen(screenId) {
  const { track, dots } = getHomeNativeScrollElements(screenId);
  return Boolean(track && dots.length);
}

function getHomeNativeScrollElements(screenId) {
  const screen = document.getElementById(screenId);

  if (!screen) {
    return { screen: null, track: null, dots: [] };
  }

  const track = screen.querySelector("[data-home-swipe-track]");
  const dots = Array.from(screen.querySelectorAll("[data-home-swipe-dots] [data-home-panel-index]"));

  return { screen, track, dots };
}

function getHomeNativeScrollPanels(track) {
  if (!track || !track.children) {
    return [];
  }

  const children = Array.from(track.children);
  const panels = children.filter(child => {
    return child &&
      child.matches &&
      child.matches("[data-home-swipe-panel], .home-swipe-panel");
  });

  return panels.length ? panels : children;
}

function getHomeNativeScrollPanelStep(track) {
  const panels = getHomeNativeScrollPanels(track);

  if (!track || panels.length <= 1) {
    return 1;
  }

  const firstPanel = panels[0];
  const secondPanel = panels[1];

  if (firstPanel && secondPanel) {
    const firstRect = firstPanel.getBoundingClientRect();
    const secondRect = secondPanel.getBoundingClientRect();
    const measuredStep = Math.abs(secondRect.left - firstRect.left);

    if (measuredStep > 1) {
      return measuredStep;
    }
  }

  return track.clientWidth || 1;
}

function getHomeNativeScrollActiveIndex(track) {
  if (!track) return 0;

  const panels = getHomeNativeScrollPanels(track);
  const panelCount = panels.length;

  if (panelCount <= 1) return 0;

  /*
    On large desktop the Home panels become a grid and the dots are hidden.
    In that mode there should be no meaningful horizontal scroll; returning
    zero keeps the state stable while CSS owns the layout.
  */
  if ((track.scrollWidth || 0) <= (track.clientWidth || 0) + 2) {
    return 0;
  }

  const step = getHomeNativeScrollPanelStep(track);
  const index = Math.round((track.scrollLeft || 0) / step);

  return Math.max(0, Math.min(panelCount - 1, index));
}

function updateHomeNativeScrollDots(screenId) {
  const { track, dots } = getHomeNativeScrollElements(screenId);

  if (!track || !dots.length) {
    return false;
  }

  const activeIndex = getHomeNativeScrollActiveIndex(track);

  dots.forEach((dot, fallbackIndex) => {
    const dotIndex = Number(dot.dataset.homePanelIndex || fallbackIndex || 0);
    const isActive = dotIndex === activeIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-current", isActive ? "true" : "false");
  });

  return true;
}

function scrollHomeNativeScrollToPanel(screenId, panelIndex) {
  const { track } = getHomeNativeScrollElements(screenId);
  const panels = getHomeNativeScrollPanels(track);
  const index = Number(panelIndex || 0);

  if (!track || !panels[index]) {
    return false;
  }

  panels[index].scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "start"
  });

  updateHomeNativeScrollDots(screenId);

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => updateHomeNativeScrollDots(screenId));
  } else {
    window.setTimeout(() => updateHomeNativeScrollDots(screenId), 0);
  }

  return true;
}

function bindHomeNativeScrollResizeHandler() {
  if (homeNativeScrollResizeHandlerBound === true) return true;
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return false;

  homeNativeScrollResizeHandlerBound = true;

  window.addEventListener("resize", () => {
    bindHomeNativeScrollPanels();
    document.querySelectorAll(".screen").forEach(screen => {
      if (screen && screen.id && screen.querySelector("[data-home-swipe-track]")) {
        updateHomeNativeScrollDots(screen.id);
      }
    });
  }, { passive: true });

  return true;
}

function bindHomeNativeScrollControls(screenId) {
  const { track, dots } = getHomeNativeScrollElements(screenId);

  if (!track || !dots.length) {
    return false;
  }

  bindHomeNativeScrollResizeHandler();

  if (track.dataset.homeNativeScrollBound !== "true") {
    track.dataset.homeNativeScrollBound = "true";

    let pendingFrame = 0;

    track.addEventListener("scroll", () => {
      if (pendingFrame) return;

      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = 0;
        updateHomeNativeScrollDots(screenId);
      });
    }, { passive: true });
  }

  dots.forEach(dot => {
    if (dot.dataset.homeNativeDotBound === "true") return;

    dot.dataset.homeNativeDotBound = "true";
    dot.addEventListener("click", event => {
      event.preventDefault();
      const index = Number(dot.dataset.homePanelIndex || 0);
      scrollHomeNativeScrollToPanel(screenId, index);
    });
  });

  window.setTimeout(() => updateHomeNativeScrollDots(screenId), 0);
  return true;
}

function bindHomeNativeScrollPanels() {
  let didBind = false;

  document.querySelectorAll("[data-home-swipe]").forEach(shell => {
    const screen = shell.closest ? shell.closest(".screen") : null;
    const screenId = screen && screen.id ? screen.id : (shell.dataset.homeSwipe || "");

    if (screenId) {
      didBind = bindHomeNativeScrollControls(screenId) || didBind;
    }
  });

  return didBind;
}

/* Compatibility names kept for existing classic-script calls. */
function shouldUseSharedHomeSwipeModule(screenId) {
  return isHomeNativeScrollScreen(screenId);
}

function getSectionSwipeElements(screenId) {
  return getHomeNativeScrollElements(screenId);
}

function getSectionSwipeActiveIndex(track) {
  return getHomeNativeScrollActiveIndex(track);
}

function updateSectionSwipeDots(screenId) {
  return updateHomeNativeScrollDots(screenId);
}

function scrollSectionSwipeToPanel(screenId, panelIndex) {
  return scrollHomeNativeScrollToPanel(screenId, panelIndex);
}

function bindSectionSwipeResizeHandler() {
  return bindHomeNativeScrollResizeHandler();
}

function bindSectionSwipeControls(screenId) {
  return bindHomeNativeScrollControls(screenId);
}

function getHomeSwipeElements(screenId) {
  return getHomeNativeScrollElements(screenId);
}

function getHomeSwipeActiveIndex(track) {
  return getHomeNativeScrollActiveIndex(track);
}

function updateHomeSwipeDots(screenId) {
  return updateHomeNativeScrollDots(screenId);
}

function scrollHomeSwipeToPanel(screenId, panelIndex) {
  return scrollHomeNativeScrollToPanel(screenId, panelIndex);
}

function bindHomeSwipeResizeHandler() {
  return bindHomeNativeScrollResizeHandler();
}

function bindHomeSwipeControls(screenId) {
  return bindHomeNativeScrollControls(screenId);
}

function bindHomeSwipePanels() {
  return bindHomeNativeScrollPanels();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindHomeNativeScrollPanels, { once: true });
  } else {
    bindHomeNativeScrollPanels();
  }
}

let headerIconActionHandlersBound = false;

function getHeaderIconActionDescriptor(actionValue = "goHome()") {
  const value = String(actionValue || "").trim();

  if (!value || value === "goHome()") {
    return { action: "home", target: "" };
  }

  const showScreenMatch = value.match(/^showScreen\(['"]([^'"]+)['"]\)$/);
  if (showScreenMatch) {
    return { action: "screen", target: showScreenMatch[1] };
  }

  const functionMatch = value.match(/^([A-Za-z_$][\w$]*)\(\)$/);
  if (functionMatch) {
    const functionName = functionMatch[1];
    if (functionName === "goBackFromStudentResourceDetail") {
      return { action: "function", target: functionName };
    }
  }

  console.warn("Unsupported header icon action:", value);
  return { action: "home", target: "" };
}

function applyHeaderIconAction(button, actionValue) {
  if (!button) return false;

  const descriptor = getHeaderIconActionDescriptor(actionValue);
  button.removeAttribute("onclick");
  button.dataset.headerAction = descriptor.action;

  if (descriptor.target) {
    button.dataset.headerTarget = descriptor.target;
  } else {
    delete button.dataset.headerTarget;
  }

  return true;
}

function bindHeaderIconActionHandlers() {
  if (headerIconActionHandlersBound === true) return true;
  if (!document || typeof document.addEventListener !== "function") return false;

  headerIconActionHandlersBound = true;
  document.addEventListener("click", handleHeaderIconActionClick);
  return true;
}

function handleHeaderIconActionClick(event) {
  const button = event.target && event.target.closest
    ? event.target.closest("[data-header-action]")
    : null;

  if (!button || button.disabled) return;

  event.preventDefault();

  const action = button.dataset.headerAction || "home";
  const target = button.dataset.headerTarget || "";

  if (action === "home") {
    goHome();
    return;
  }

  if (action === "screen") {
    showScreen(target || "student-home");
    return;
  }

  if (action === "function" && target && typeof window[target] === "function") {
    window[target]();
  }
}

bindHeaderIconActionHandlers();

function setHomeIconButton(button, actionValue = "goHome()") {
  if (!button) return;
  bindHeaderIconActionHandlers();

  button.classList.remove("back-icon-btn", "save-return-btn");
  button.classList.add("home-icon-btn", "icon-action-btn", "icon-action-btn-large");
  applyHeaderIconAction(button, actionValue);
  button.setAttribute("aria-label", "Home");
  button.setAttribute("title", "Home");
  button.innerHTML = `
    <span class="app-icon app-icon-large" style="--app-icon-url: url('/icons/home.svg')" aria-hidden="true"></span>
    <span class="header-icon-label">Home</span>
  `;
}

function setBackIconButton(button, actionValue = "goHome()") {
  if (!button) return;
  bindHeaderIconActionHandlers();

  button.classList.remove("home-icon-btn", "save-return-btn");
  button.classList.add("back-icon-btn", "icon-action-btn", "icon-action-btn-large");
  applyHeaderIconAction(button, actionValue);
  button.setAttribute("aria-label", "Back");
  button.setAttribute("title", "Back");
  button.innerHTML = `
    <span class="app-icon app-icon-large" style="--app-icon-url: url('/icons/back.svg?v=96.4')" aria-hidden="true"></span>
    <span class="header-icon-label">close</span>
  `;
}

function getHeaderIconButtonMarkup(type, actionValue, label) {
  const safeType = type === "back" ? "back" : "home";
  const iconPath = safeType === "back" ? "/icons/back.svg" : "/icons/home.svg";
  const className = safeType === "back" ? "back-icon-btn" : "home-icon-btn";
  const safeLabel = escapeHtml(label || (safeType === "back" ? "Back" : "Home"));
  const descriptor = getHeaderIconActionDescriptor(actionValue);
  const targetAttr = descriptor.target
    ? ` data-header-target="${escapeForAttribute(descriptor.target)}"`
    : "";

  return `
    <button
      type="button"
      class="small-btn ${className} icon-action-btn icon-action-btn-large"
      data-header-action="${escapeForAttribute(descriptor.action)}"${targetAttr}
      aria-label="${safeLabel}"
      title="${safeLabel}"
    >
      <span class="app-icon app-icon-large" style="--app-icon-url: url('${iconPath}')" aria-hidden="true"></span>
      <span class="header-icon-label">${safeLabel}</span>
    </button>
  `;
}

function getHomeIconButtonMarkup(actionValue = "goHome()") {
  return getHeaderIconButtonMarkup("home", actionValue, "Home");
}

function getBackIconButtonMarkup(actionValue = "goHome()") {
  return getHeaderIconButtonMarkup("back", actionValue, "Back");
}

function getXCloseHomeButtonMarkup(extraClassName = "") {
  bindHeaderIconActionHandlers();

  const safeExtraClassName = String(extraClassName || "")
    .split(/\s+/)
    .filter(Boolean)
    .map(className => className.replace(/[^A-Za-z0-9_-]/g, ""))
    .filter(Boolean)
    .join(" ");

  return `
    <button
      type="button"
      class="xclose-home-btn icon-action-btn${safeExtraClassName ? ` ${safeExtraClassName}` : ""}"
      data-header-action="home"
      aria-label="Home"
      title="Home"
    >
      <span class="app-icon app-icon-xclose" aria-hidden="true"></span>
      <span class="visually-hidden">Home</span>
    </button>
  `;
}

function escapeForAttribute(value) {
  if (typeof escapeAttribute === "function") {
    return escapeAttribute(value);
  }

  if (typeof escapeHtml === "function") {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCurrentUserName() {
  const user = state.user || {};
  return String(
    user.username ||
    user.Username ||
    user.name ||
    user.Name ||
    user.AdminName ||
    user.StudentName ||
    ""
  ).trim();
}

function getCurrentStudentGroupValue(user = state.user || {}) {
  for (const key of ["classgroup", "ClassGroup", "group", "Group"]) {
    if (user[key] !== null && user[key] !== undefined && String(user[key]).trim() !== "") {
      return String(user[key]).trim();
    }
  }

  return "";
}

function getCurrentStudentGroupLabel(user = state.user || {}) {
  const group = getCurrentStudentGroupValue(user);

  if (!group) return "";
  if (group === "0") return "ALL (Group 0)";

  return `Group ${group}`;
}

function getCurrentUserLevelText() {
  const user = state.user || {};
  const role = String(user.role || user.Role || "").trim();

  if (getBottomNavRole() === "admin") {
    return getDisplayRoleLabel(role) || "Admin";
  }

  const groupLabel = getCurrentStudentGroupLabel(user);

  return groupLabel ? `Student · ${groupLabel}` : "Student";
}

function getCurrentUserRoleLabel() {
  const user = state.user || {};
  const role = String(user.role || user.Role || "").trim();
  const navRole = getBottomNavRole();

  if (navRole === "admin") {
    return getDisplayRoleLabel(role) || "Admin";
  }

  return "Student";
}

function getDisplayRoleLabel(role) {
  const normalized = String(role || "").trim().toUpperCase();
  if (normalized === "SENIOR") return "SENIOR TEACHER";
  return String(role || "").trim().replace(/_/g, " ");
}

function getCurrentUserGroupLabel() {
  return getCurrentStudentGroupLabel(state.user || {});
}

function hasUnifiedAccountProfile() {
  return state.authMode === "account" || (
    window.M4LAuth &&
    typeof window.M4LAuth.hasUnifiedAccountWorkspaceSession === "function" &&
    window.M4LAuth.hasUnifiedAccountWorkspaceSession()
  );
}

function getStoredAccountContexts() {
  try {
    const stored = JSON.parse(localStorage.getItem("m4l_account_contexts") || "[]");
    if (Array.isArray(stored) && stored.length) return stored;
  } catch (error) {}

  return state.accountContext ? [state.accountContext] : [];
}

function accountContextMatches(left, right) {
  const normalize = value => String(value || "").trim().toUpperCase();
  return normalize(left?.scope) === normalize(right?.scope) &&
    normalize(left?.courseId || left?.courseid) === normalize(right?.courseId || right?.courseid) &&
    normalize(left?.role) === normalize(right?.role);
}

function getUserBandProfileMarkup(username, role) {
  const contexts = getStoredAccountContexts();
  const current = state.accountContext || null;
  const contextMarkup = contexts.length ? contexts.map(context => {
    const courseName = String(context.courseName || context.coursename || "M4L Platform").trim();
    const contextRole = getDisplayRoleLabel(context.role);
    const isCurrent = accountContextMatches(context, current);
    const elementName = isCurrent ? "div" : "button";
    const switchAttributes = isCurrent ? "" : `
        type="button"
        data-user-profile-context
        data-context-scope="${escapeForAttribute(context.scope || "COURSE")}"
        data-context-course-id="${escapeForAttribute(context.courseId || context.courseid || "")}"
        data-context-role="${escapeForAttribute(context.role || "")}"`;
    return `
      <${elementName} class="app-user-profile-menu__context${isCurrent ? " is-current" : " is-switchable"}"${switchAttributes}>
        <span>
          <strong>${escapeHtml(courseName)}</strong>
          <small>${escapeHtml(contextRole || "Role unavailable")}</small>
        </span>
        ${isCurrent ? '<em>Current</em>' : '<em>Switch</em>'}
      </${elementName}>
    `;
  }).join("") : `
    <div class="app-user-profile-menu__context is-current">
      <span>
        <strong>${escapeHtml(String(state.accountContext?.courseName || "Current program"))}</strong>
        <small>${escapeHtml(getCurrentUserRoleLabel())}</small>
      </span>
      <em>Current</em>
    </div>
  `;
  const groupLabel = role === "student" ? getCurrentUserGroupLabel() : "";

  return `
    <p class="app-user-profile-menu__title">Profile</p>
    <div class="app-user-profile-menu__row">
      <span class="app-user-profile-menu__label">Name</span>
      <span class="app-user-profile-menu__value">${escapeHtml(username)}</span>
    </div>
    ${groupLabel ? `
      <div class="app-user-profile-menu__row">
        <span class="app-user-profile-menu__label">Group</span>
        <span class="app-user-profile-menu__value">${escapeHtml(groupLabel)}</span>
      </div>
    ` : ""}
    <p class="app-user-profile-menu__section-label">Switch program or role</p>
    <div class="app-user-profile-menu__contexts">${contextMarkup}</div>
    <p class="app-user-profile-menu__feedback" data-user-profile-feedback role="status" aria-live="polite"></p>
  `;
}

function getUserBandElement() {
  if (!document.body) {
    console.warn("User band could not be created because document.body is missing.");
    return null;
  }

  let band = document.getElementById("app-user-band");

  if (!band) {
    band = document.createElement("header");
    band.id = "app-user-band";
    band.className = "app-user-band hidden";
    band.setAttribute("aria-label", "Logged-in user");
    document.body.prepend(band);
  }

  return band;
}

function clearUserBand(band) {
  if (!band) return false;
  band.innerHTML = "";
  return true;
}

function setBodyUserBandState(shouldShow) {
  if (!document.body) return false;
  document.body.classList.toggle("has-user-band", !!shouldShow);
  return true;
}

function attachUserBandLogoutHandler(band) {
  if (!band) return false;

  const logoutButton = band.querySelector("[data-user-band-logout]");
  if (!logoutButton) return false;

  logoutButton.addEventListener("click", (event) => {
    event.preventDefault();

    if (typeof logout === "function") {
      logout();
      return;
    }

    console.warn("Logout function is missing.");
  });

  return true;
}

function getActiveScreenId() {
  const activeScreen = document.querySelector(".screen.active");
  return activeScreen ? String(activeScreen.id || "") : "";
}

function removeLegacyScreenRefreshButtons() {
  document.querySelectorAll(".manual-refresh-btn").forEach(button => {
    if (!button.closest("#app-user-band")) {
      button.remove();
    }
  });
}

let userBandRefreshInProgress = false;
let userBandLoadingMessage = "";
let userBandLoadingVisible = false;
let userBandLoadingStatusTimer = 0;
let userBandLoadingStatusKind = "";
let m4lAppStatusTokenCounter = 0;
const m4lAppStatusTokens = new Map();

function syncUserBandLoadingIndicator() {
  const loading = document.getElementById("app-user-band-loading");
  if (!loading) return false;

  const text = loading.querySelector("[data-user-band-loading-text]");
  if (text) {
    text.textContent = userBandLoadingMessage || (userBandLoadingVisible ? "Loading..." : "");
  }

  loading.setAttribute("aria-hidden", (userBandLoadingVisible || !!userBandLoadingMessage) ? "false" : "true");
  return true;
}

function setUserBandLoadingState(isLoading, message = "", kind = "") {
  userBandLoadingVisible = !!isLoading;
  userBandLoadingMessage = String(message || "");
  userBandLoadingStatusKind = String(kind || "");

  if (document && document.body) {
    document.body.classList.toggle("is-app-loading", userBandLoadingVisible);
    document.body.classList.toggle("has-app-status", !userBandLoadingVisible && !!userBandLoadingMessage);
    document.body.classList.toggle("app-status-error", userBandLoadingStatusKind === "error");
  }

  window.clearTimeout(userBandLoadingStatusTimer || 0);

  if (!userBandLoadingVisible && userBandLoadingMessage) {
    userBandLoadingStatusTimer = window.setTimeout(() => {
      userBandLoadingMessage = "";
      userBandLoadingStatusKind = "";
      if (document && document.body) {
        document.body.classList.remove("has-app-status", "app-status-error");
      }
      syncUserBandLoadingIndicator();
    }, 1300);
  }

  syncUserBandLoadingIndicator();
  return true;
}

function getM4LAppStatusFallbackMessage(kind) {
  if (kind === "saving") return "Saving...";
  if (kind === "refresh") return "Refreshing...";
  return "Loading...";
}

function renderM4LAppStatusTokens() {
  if (!m4lAppStatusTokens || m4lAppStatusTokens.size === 0) {
    return false;
  }

  const activeStatuses = Array.from(m4lAppStatusTokens.values());
  const latestStatus = activeStatuses[activeStatuses.length - 1] || {};
  const message = latestStatus.message || getM4LAppStatusFallbackMessage(latestStatus.kind || "");
  setUserBandLoadingState(true, message, latestStatus.kind || "");
  return true;
}

function beginAppStatus(message = "Loading...", options = {}) {
  const statusKind = String(options.kind || "").trim();
  const token = `m4l-status-${Date.now()}-${++m4lAppStatusTokenCounter}`;

  m4lAppStatusTokens.set(token, {
    message: String(message || getM4LAppStatusFallbackMessage(statusKind)),
    kind: statusKind,
    startedAt: Date.now()
  });

  renderM4LAppStatusTokens();
  return token;
}

function updateAppStatus(token, message = "", options = {}) {
  if (!token || !m4lAppStatusTokens.has(token)) {
    return false;
  }

  const status = m4lAppStatusTokens.get(token) || {};
  status.message = String(message || status.message || getM4LAppStatusFallbackMessage(status.kind || ""));
  if (options.kind !== undefined) {
    status.kind = String(options.kind || "").trim();
  }
  m4lAppStatusTokens.set(token, status);
  renderM4LAppStatusTokens();
  return true;
}

function endAppStatus(token, message = "", options = {}) {
  if (token && m4lAppStatusTokens.has(token)) {
    m4lAppStatusTokens.delete(token);
  }

  if (renderM4LAppStatusTokens()) {
    return true;
  }

  const finalMessage = String(message || "");
  const finalKind = String(options.kind || "").trim();
  setUserBandLoadingState(false, finalMessage, finalKind);
  return true;
}

function failAppStatus(token, message = "Action failed") {
  if (token && m4lAppStatusTokens.has(token)) {
    m4lAppStatusTokens.delete(token);
  }

  if (renderM4LAppStatusTokens()) {
    return true;
  }

  setUserBandLoadingState(false, String(message || "Action failed"), "error");
  return true;
}

async function withAppStatus(message, callback, options = {}) {
  const token = beginAppStatus(message, options);

  try {
    const result = await callback(token);
    endAppStatus(token, options.successMessage || "");
    return result;
  } catch (error) {
    failAppStatus(token, options.errorMessage || "Action failed");
    throw error;
  }
}

function setUserBandRefreshState(isRefreshing, button) {
  userBandRefreshInProgress = !!isRefreshing;

  const targetButton = button || document.querySelector("#app-user-band [data-user-band-refresh], #app-user-band [data-app-menu-action='refresh']");
  if (targetButton) {
    targetButton.disabled = !!isRefreshing;
    targetButton.classList.toggle("is-refreshing", !!isRefreshing);
  }

  return true;
}

function waitForUserBandRefreshFrame() {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
}

function waitForUserBandRefreshMinimumDuration(startTime, minimumMs) {
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, minimumMs - elapsed);

  if (!remaining) {
    return Promise.resolve();
  }

  return new Promise(resolve => setTimeout(resolve, remaining));
}

async function runUserBandRefresh(button, callback) {
  const refreshStartedAt = Date.now();
  const minimumSpinMs = 450;
  const statusToken = beginAppStatus("Refreshing...", { kind: "refresh" });

  setUserBandRefreshState(true, button);

  try {
    // Let Safari/Chrome paint the loading state before running quick synchronous refresh actions.
    await waitForUserBandRefreshFrame();
    await callback();
    await waitForUserBandRefreshMinimumDuration(refreshStartedAt, minimumSpinMs);
    endAppStatus(statusToken, "Updated");
  } catch (error) {
    await waitForUserBandRefreshMinimumDuration(refreshStartedAt, minimumSpinMs);
    failAppStatus(statusToken, "Refresh failed");
    throw error;
  } finally {
    setUserBandRefreshState(false, document.querySelector("#app-user-band [data-user-band-refresh], #app-user-band [data-app-menu-action='refresh']"));
  }
}

// V97.1.5.5 HOTFIX: runManualRefresh was the shared name Attendance, Timetable, and
// this file's own refreshCurrentResourceView() called, but it was removed during an
// earlier cleanup when this helper was renamed to runUserBandRefresh. Callers were
// never updated, so every manual refresh threw a ReferenceError before it could reach
// the Worker, silently leaving devices on their locally cached timetable/Zoom link.
// Restored here as an alias so no caller needs to change.
const runManualRefresh = runUserBandRefresh;

function getStudentResourceViewModeSafe() {
  return typeof studentResourceViewMode !== "undefined"
    ? String(studentResourceViewMode || "")
    : "";
}

function isOptionalFunctionLoaded(functionName) {
  return typeof window[String(functionName || "")] === "function";
}

async function refreshCurrentResourceView(button) {
  await runManualRefresh(button, async () => {
    const role = getBottomNavRole();
    const resourceMode = getStudentResourceViewModeSafe();
    const shouldUseAdminResources = resourceMode === "admin" || role === "admin";

    if (shouldUseAdminResources && isOptionalFunctionLoaded("showAdminResources")) {
      await window.showAdminResources({ force: true });
      return;
    }

    if (isOptionalFunctionLoaded("showStudentResources")) {
      await window.showStudentResources({ force: true });
      return;
    }

    console.warn("No resource refresh action is available for this screen.");
  });
}

function getUserBandRefreshAction(screenId, role) {
  const activeScreenId = String(screenId || getActiveScreenId() || "");

  if (!activeScreenId || activeScreenId === "auth-screen" || activeScreenId === "pdf-viewer-screen") {
    return null;
  }

  if (activeScreenId === "student-home") {
    return typeof refreshStudentHomeTimetable === "function"
      ? { label: "Refresh", title: "Refresh timetable", handler: refreshStudentHomeTimetable }
      : null;
  }

  if (activeScreenId === "admin-home") {
    return typeof refreshAdminHomeTimetable === "function"
      ? { label: "Refresh", title: "Refresh timetable", handler: refreshAdminHomeTimetable }
      : null;
  }

  if (activeScreenId === "admin-timetable-screen") {
    return typeof refreshAdminTimetable === "function"
      ? { label: "Refresh", title: "Refresh timetable", handler: refreshAdminTimetable }
      : null;
  }

  if (activeScreenId === "timetable-builder-screen") {
    return typeof loadTimetableBuilder === "function"
      ? { label: "Refresh", title: "Refresh Program Timetables", handler: () => loadTimetableBuilder(true) }
      : null;
  }

  if (activeScreenId === "weekly-planner-screen") {
    return typeof loadWeeklyPlanner === "function"
      ? { label: "Refresh", title: "Refresh weekly planner", handler: loadWeeklyPlanner }
      : null;
  }

  if (activeScreenId === "progress-report") {
    return typeof showProgressReport === "function"
      ? { label: "Refresh", title: "Refresh progress menu", handler: showProgressReport }
      : null;
  }

  if (activeScreenId === "attendance-screen") {
    if (typeof refreshCurrentAttendancePanel === "function") {
      return { label: "Refresh", title: "Refresh attendance", handler: refreshCurrentAttendancePanel };
    }

    return typeof openMarkRegister === "function"
      ? { label: "Refresh", title: "Refresh attendance", handler: openMarkRegister }
      : null;
  }

  if (activeScreenId === "admin-academics") {
    return typeof showAdminAcademics === "function"
      ? { label: "Refresh", title: "Refresh admin menu", handler: showAdminAcademics }
      : null;
  }

  if (String(activeScreenId).startsWith("student-resources")) {
    return { label: "Refresh", title: "Refresh library", handler: refreshCurrentResourceView };
  }

  if (activeScreenId === "progress-subjects-screen") {
    if (role === "student" && typeof refreshStudentTaskProgress === "function") {
      return { label: "Refresh", title: "Refresh progress", handler: refreshStudentTaskProgress };
    }

    if (role === "admin" && typeof refreshProgressSubjects === "function") {
      return { label: "Refresh", title: "Refresh progress", handler: refreshProgressSubjects };
    }
  }

  if (activeScreenId === "progress-tasks-screen") {
    if (role === "student" && typeof refreshStudentModuleTaskList === "function") {
      return { label: "Refresh", title: "Refresh tasks", handler: refreshStudentModuleTaskList };
    }

    if (role === "admin" && typeof refreshProgressTasks === "function") {
      return { label: "Refresh", title: "Refresh tasks", handler: refreshProgressTasks };
    }
  }

  if (activeScreenId === "progress-task-students-screen" && role === "admin") {
    const safeProgressState = typeof progressState !== "undefined" ? progressState : null;

    if (safeProgressState && safeProgressState.contextType === "student" && typeof refreshIndividualStudentTaskList === "function") {
      return { label: "Refresh", title: "Refresh student tasks", handler: refreshIndividualStudentTaskList };
    }

    if (typeof refreshProgressTaskStudents === "function") {
      return { label: "Refresh", title: "Refresh student progress", handler: refreshProgressTaskStudents };
    }
  }

  return null;
}

function attachUserBandRefreshHandler(band, refreshAction) {
  if (!band || !refreshAction || typeof refreshAction.handler !== "function") return false;

  const refreshButton = band.querySelector("[data-user-band-refresh]");
  if (!refreshButton) return false;

  refreshButton.addEventListener("click", event => {
    event.preventDefault();

    if (userBandRefreshInProgress) return;

    runUserBandRefresh(refreshButton, async () => {
      await refreshAction.handler(refreshButton);
    }).catch(error => {
      console.error("User band refresh failed:", error);
      alert(error && error.message ? error.message : "Unable to refresh this screen.");
    });
  });

  return true;
}

const USER_BAND_MENU_ITEMS = {
  student: [
    { action: "home", label: "Home", icon: "/icons/home.svg" },
    { action: "record", label: "VoiceNote", icon: "/icons/navrecord.svg?v=92.3a" },
    { action: "library", label: "Library", icon: "/icons/resources.svg" },
    { action: "progress", label: "Progress", icon: "/icons/progress.svg" },
    { action: "refresh", label: "Refresh", icon: "/icons/refresh.svg" },
    { action: "logout", label: "Logout", icon: "/icons/logout.svg" }
  ],
  admin: [
    { action: "home", label: "Home", icon: "/icons/home.svg" },
    { action: "attendance", label: "Attendance", icon: "/icons/attendance.svg" },
    { action: "record", label: "VoiceNote", icon: "/icons/navrecord.svg?v=92.3a" },
    { action: "planner", label: "Planner", icon: "/icons/planner.svg?v=95.1" },
    { action: "library", label: "Library", icon: "/icons/resources.svg" },
    { action: "progress", label: "Progress", icon: "/icons/progress.svg" },
    { action: "admin", label: "Admin", icon: "/icons/admin.svg" },
    { action: "refresh", label: "Refresh", icon: "/icons/refresh.svg" },
    { action: "logout", label: "Logout", icon: "/icons/logout.svg" }
  ]
};

function getUserBandMenuItems(role) {
  const key = String(role || getBottomNavRole() || "student").toLowerCase() === "admin" ? "admin" : "student";
  const items = [...(USER_BAND_MENU_ITEMS[key] || USER_BAND_MENU_ITEMS.student)];
  return isGlobalLibraryOnlyContext()
    ? items.filter(item => ["library", "refresh", "logout"].includes(item.action))
    : items;
}

function getUserBandMenuProfileMarkup(username, role) {
  const courseName = String(state.accountContext?.courseName || "").trim();
  const roleDetail = role === "student" ? getCurrentUserGroupLabel() : getCurrentUserRoleLabel();
  const detail = courseName ? `${courseName} · ${roleDetail}` : roleDetail;
  const safeName = escapeHtml(username || (role === "admin" ? "Admin" : "Student"));
  const safeDetail = escapeHtml(detail || (role === "admin" ? "Admin" : ""));

  return `
    <button type="button" class="app-user-menu__profile-tile" data-app-menu-action="profile" role="menuitem" aria-label="Open Profile for ${safeName}">
      <span class="app-user-menu__tile-icon" style="--app-menu-icon: url('/icons/user.svg')" aria-hidden="true"></span>
      <span class="app-user-menu__tile-label">Profile</span>
      ${safeDetail ? `<span class="app-user-menu__tile-subtitle">${safeName} · ${safeDetail}</span>` : `<span class="app-user-menu__tile-subtitle">${safeName}</span>`}
    </button>
  `;
}

function getUserBandMenuMarkup(username, role, screenId) {
  const items = getUserBandMenuItems(role);
  let activeKey = typeof getBottomNavActiveKey === "function"
    ? String(getBottomNavActiveKey(screenId || getActiveScreenId(), role) || "")
    : "";

  if (String(screenId || getActiveScreenId() || "").startsWith("weekly-planner")) {
    activeKey = "planner";
  }

  return `
    ${getUserBandMenuProfileMarkup(username, role)}
    ${items.map(item => {
      const isActive = item.action === activeKey;
      const activeClass = isActive ? " is-active" : "";
      const activeStyle = isActive ? " color: var(--primary-light);" : "";
      const ariaCurrent = isActive ? ' aria-current="page"' : "";

      return `
        <button
          type="button"
          class="app-user-menu__tile${activeClass}"
          data-app-menu-action="${escapeForAttribute(item.action)}"
          role="menuitem"${ariaCurrent}
          style="${activeStyle}"
        >
          <span class="app-user-menu__tile-icon" style="--app-menu-icon: url('${escapeForAttribute(item.icon)}')" aria-hidden="true"></span>
          <span class="app-user-menu__tile-label">${escapeHtml(item.label)}</span>
        </button>
      `;
    }).join("")}
  `;
}

let userBandMenuDismissHandlerBound = false;


function closeUserBandMenu() {
  const menu = document.getElementById("app-user-band-menu");
  const toggle = document.querySelector("#app-user-band [data-app-menu-toggle]");

  if (menu) {
    menu.classList.add("hidden");
    menu.setAttribute("aria-hidden", "true");
  }

  if (toggle) {
    toggle.setAttribute("aria-expanded", "false");
  }

  return true;
}

function closeUserBandProfileMenu() {
  const menu = document.getElementById("app-user-band-profile-menu");
  const toggle = document.querySelector("#app-user-band [data-user-profile-toggle]");

  if (menu) {
    menu.classList.add("hidden");
  }

  if (toggle) {
    toggle.setAttribute("aria-expanded", "false");
  }

  return true;
}

function closeUserBandMenus() {
  closeUserBandMenu();
  closeUserBandProfileMenu();
  return true;
}

function setUserBandMenuOpen(isOpen) {
  const menu = document.getElementById("app-user-band-menu");
  const toggle = document.querySelector("#app-user-band [data-app-menu-toggle]");

  if (!menu || !toggle) return false;

  if (isOpen) {
    closeUserBandProfileMenu();
  }

  menu.classList.toggle("hidden", !isOpen);
  menu.setAttribute("aria-hidden", isOpen ? "false" : "true");
  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  return true;
}

function setUserBandProfileMenuOpen(isOpen) {
  const menu = document.getElementById("app-user-band-profile-menu");
  const toggle = document.querySelector("#app-user-band [data-user-profile-toggle]");

  if (!menu) return false;

  if (isOpen) {
    closeUserBandMenu();
  }

  menu.classList.toggle("hidden", !isOpen);
  if (toggle) toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  return true;
}

function renderUserBandProfileMenu(username, role) {
  const menu = document.getElementById("app-user-band-profile-menu");
  if (!menu) return false;
  menu.innerHTML = getUserBandProfileMarkup(username, role);
  return true;
}

function openUserBandProfileCard() {
  const role = getBottomNavRole();
  const username = getCurrentUserName() || (role === "admin" ? "Admin" : "Student");
  renderUserBandProfileMenu(username, role);
  setUserBandProfileMenuOpen(true);

  if (
    hasUnifiedAccountProfile() &&
    window.M4LAuth &&
    typeof window.M4LAuth.refreshUnifiedAccountProfile === "function"
  ) {
    window.M4LAuth.refreshUnifiedAccountProfile()
      .then(() => {
        const menu = document.getElementById("app-user-band-profile-menu");
        if (menu && !menu.classList.contains("hidden")) {
          renderUserBandProfileMenu(username, role);
        }
      })
      .catch(error => {
        console.warn("Unable to refresh Profile contexts:", error);
      });
  }

  return true;
}

function bindUserBandMenuDismissHandler() {
  if (userBandMenuDismissHandlerBound === true) return true;
  if (!document || typeof document.addEventListener !== "function") return false;

  userBandMenuDismissHandlerBound = true;

  document.addEventListener("click", event => {
    const band = document.getElementById("app-user-band");
    if (!band || band.classList.contains("hidden")) return;
    if (band.contains(event.target)) return;
    closeUserBandMenus();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeUserBandMenus();
    }
  });

  return true;
}


function openUserBandZoomLink() {
  const confirmed = window.confirm("Do you want to open the Reboot Your Maktab Zoom link?");
  if (!confirmed) return false;

  if (typeof openTimetableZoomLink === "function") {
    openTimetableZoomLink();
    return true;
  }

  if (window.M4LTimetable && typeof window.M4LTimetable.openTimetableZoomLink === "function") {
    window.M4LTimetable.openTimetableZoomLink();
    return true;
  }

  const zoomButton = document.querySelector("[data-timetable-action='open-zoom'][data-zoom-link]:not(:disabled)");
  if (zoomButton && typeof zoomButton.click === "function") {
    zoomButton.click();
    return true;
  }

  alert("Zoom link has not been added yet.");
  return false;
}

function attachUserBandZoomHandler(band) {
  if (!band) return false;

  const zoomButton = band.querySelector("[data-user-band-zoom]");
  if (!zoomButton) return false;

  zoomButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    closeUserBandMenus();
    openUserBandZoomLink();
  });

  return true;
}

function handleUserBandMenuAction(action, role, triggerButton) {
  const activeRole = String(role || getBottomNavRole() || "").trim();
  const actionKey = String(action || "").trim();

  if (actionKey === "home") {
    return showScreen(getM4LAppHomeScreenId(activeRole));
  }

  if (actionKey === "refresh") {
    if (userBandRefreshInProgress) return false;

    const refreshAction = getUserBandRefreshAction(getActiveScreenId(), activeRole);

    if (!refreshAction || typeof refreshAction.handler !== "function") {
      setUserBandLoadingState(false, "Nothing to refresh");
      return false;
    }

    runUserBandRefresh(triggerButton, async () => {
      await refreshAction.handler(triggerButton);
    }).catch(error => {
      console.error("User band refresh failed:", error);
    });

    return true;
  }

  if (actionKey === "logout") {
    if (typeof logout === "function") {
      logout();
      return true;
    }

    console.warn("Logout function is missing.");
    return false;
  }

  if (actionKey === "profile") {
    return openUserBandProfileCard();
  }

  const actionKeyByMenuAction = {
    attendance: "attendance",
    record: "record",
    planner: "planner",
    library: "library",
    progress: "progress",
    admin: "admin"
  };

  const navKey = actionKeyByMenuAction[actionKey] || "";
  if (!navKey) return false;

  return handleBottomNavigationClick(activeRole, navKey);
}

function attachUserBandProfileHandler(band) {
  if (!band) return false;

  const menu = band.querySelector("#app-user-band-profile-menu");

  if (!menu) return false;

  bindUserBandMenuDismissHandler();

  menu.addEventListener("click", event => {
    const contextButton = event.target && typeof event.target.closest === "function"
      ? event.target.closest("[data-user-profile-context]")
      : null;
    if (!contextButton || contextButton.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const feedback = menu.querySelector("[data-user-profile-feedback]");
    const context = {
      scope: String(contextButton.dataset.contextScope || "COURSE"),
      courseId: String(contextButton.dataset.contextCourseId || ""),
      role: String(contextButton.dataset.contextRole || "")
    };
    if (
      window.M4LAuth &&
      typeof window.M4LAuth.switchUnifiedAccountContext === "function"
    ) {
      contextButton.disabled = true;
      if (feedback) feedback.textContent = "Validating the selected program and role…";
      window.M4LAuth.switchUnifiedAccountContext(context).catch(error => {
        contextButton.disabled = false;
        if (feedback) feedback.textContent = error.message || "The selected context could not be opened.";
      });
    }
  });

  return true;
}

function attachUserBandMenuHandlers(band) {
  if (!band) return false;

  const toggle = band.querySelector("[data-app-menu-toggle]");
  const menu = band.querySelector("#app-user-band-menu");

  if (!toggle || !menu) return false;

  bindUserBandMenuDismissHandler();

  toggle.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();

    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setUserBandMenuOpen(!isOpen);
  });

  menu.addEventListener("click", event => {
    const item = event.target && event.target.closest
      ? event.target.closest("[data-app-menu-action]")
      : null;

    if (!item) return;

    event.preventDefault();
    event.stopPropagation();

    const action = String(item.dataset.appMenuAction || "").trim();
    closeUserBandMenu();
    handleUserBandMenuAction(action, getBottomNavRole(), item);
  });

  return true;
}

function updateUserBand(screenId) {
  const band = getUserBandElement();
  if (!band) return false;

  const role = getBottomNavRole();
  const shouldShow = !!state.token && !!role && screenId !== "auth-screen";

  band.classList.toggle("hidden", !shouldShow);
  setBodyUserBandState(shouldShow);
  removeLegacyScreenRefreshButtons();

  if (!shouldShow) {
    clearUserBand(band);
    return false;
  }

  const username = getCurrentUserName() || (role === "admin" ? "Admin" : "Student");

  band.innerHTML = `
    <div class="app-user-band__identity-shell" aria-label="Logged in user">
      <span class="app-user-band__identity">
        <span class="app-user-band__name">${escapeHtml(username)}</span>
      </span>
    </div>
    ${isGlobalLibraryOnlyContext() ? "" : `<button
      type="button"
      class="app-user-band__zoom-btn"
      data-user-band-zoom
      aria-label="Open Zoom"
      title="Open Zoom"
    >
      <span class="app-icon app-icon-zoom" aria-hidden="true"></span>
      <span class="app-user-band__action-label">ZOOM</span>
    </button>`}
    <div class="app-user-band__menu-shell">
      <button
        type="button"
        class="app-user-band__menu-btn"
        data-app-menu-toggle
        aria-label="Open menu"
        title="Menu"
        aria-expanded="false"
        aria-controls="app-user-band-menu"
      >
        <span class="app-icon app-icon-menu" aria-hidden="true"></span>
        <span class="app-user-band__action-label">MENU</span>
      </button>
      <div id="app-user-band-menu" class="app-user-menu hidden" role="menu" aria-label="App menu" aria-hidden="true">
        ${getUserBandMenuMarkup(username, role, screenId)}
      </div>
    </div>
    <div id="app-user-band-profile-menu" class="app-user-profile-menu hidden" aria-label="Profile details">
      ${getUserBandProfileMarkup(username, role)}
    </div>
    <div id="app-user-band-loading" class="app-user-band__loading" role="status" aria-live="polite" aria-hidden="true">
      <span class="app-user-band__loading-bar" aria-hidden="true"></span>
      <span class="app-user-band__loading-text" data-user-band-loading-text></span>
    </div>
  `;

  syncUserBandLoadingIndicator();
  attachUserBandZoomHandler(band);
  attachUserBandMenuHandlers(band);
  attachUserBandProfileHandler(band);
  return true;
}


function setTextActionButton(button, text, actionValue) {
  if (!button) return;

  button.classList.remove("home-icon-btn", "back-icon-btn", "icon-action-btn", "icon-action-btn-large");
  button.removeAttribute("aria-label");
  button.removeAttribute("title");
  button.removeAttribute("onclick");
  button.textContent = text;

  if (actionValue) {
    applyHeaderIconAction(button, actionValue);
  } else {
    delete button.dataset.headerAction;
    delete button.dataset.headerTarget;
  }
}

const BOTTOM_NAV_ITEMS = {
  student: [
    {
      key: "home",
      label: "Home",
      icon: "/icons/home.svg",
      targetScreen: "student-home"
    },
    {
      key: "record",
      label: "Record",
      icon: "/icons/navrecord.svg?v=92.3",
      targetScreen: "record-lesson-screen"
    },
    {
      key: "library",
      label: "Library",
      icon: "/icons/resources.svg",
      targetScreen: "student-resources-subjects",
      actionName: "showStudentResources"
    },
    {
      key: "progress",
      label: "Progress",
      icon: "/icons/progress.svg",
      targetScreen: "progress-subjects-screen",
      actionName: "showStudentTasks"
    }
  ],
  admin: [
    {
      key: "home",
      label: "Home",
      icon: "/icons/home.svg",
      targetScreen: "admin-home"
    },
    {
      key: "record",
      label: "Record",
      icon: "/icons/navrecord.svg?v=92.3",
      targetScreen: "record-lesson-screen",
      hideFromBottomNav: true
    },
    {
      key: "attendance",
      label: "Attendance",
      icon: "/icons/attendance.svg",
      targetScreen: "attendance-screen",
      actionName: "openMarkRegister"
    },
    {
      key: "planner",
      label: "Planner",
      icon: "/icons/planner.svg?v=95.1",
      targetScreen: "weekly-planner-screen",
      actionName: "showWeeklyPlanner",
      hideFromBottomNav: true
    },
    {
      key: "library",
      label: "Library",
      icon: "/icons/resources.svg",
      targetScreen: "student-resources-subjects",
      actionName: "showAdminResources"
    },
    {
      key: "progress",
      label: "Progress",
      icon: "/icons/progress.svg",
      targetScreen: "progress-report",
      actionName: "showProgressReport"
    },
    {
      key: "admin",
      label: "Admin",
      icon: "/icons/admin.svg",
      targetScreen: "admin-academics",
      actionName: "showAdminAcademics"
    }
  ]
};

function getBottomNavRole() {
  const userType = String(state.userType || "").trim().toLowerCase();
  const portalType = String(state.portalType || "").trim().toLowerCase();

  if (userType === "admin" || portalType === "admin") return "admin";
  if (userType === "student" || portalType === "student") return "student";

  return "";
}

function isGlobalLibraryOnlyContext() {
  return String(state.accountContext?.scope || "").trim().toUpperCase() === "GLOBAL";
}



function getCoverHomeNavigationRole(button) {
  return String(
    (button && button.dataset ? button.dataset.coverHomeRole : "") ||
    (typeof getBottomNavRole === "function" ? getBottomNavRole() : "") ||
    ""
  ).trim();
}

function getCoverHomeNavigationItem(button) {
  if (!button) return null;

  const role = getCoverHomeNavigationRole(button);
  const key = String(button.dataset.coverHomeNav || "").trim();

  if (!role || !key) return null;

  return getBottomNavItems(role).find(navItem => navItem.key === key) || null;
}

function hydrateCoverHomeNavigationButtons(scope) {
  if (!document) return false;

  const root = scope && typeof scope.querySelectorAll === "function" ? scope : document;
  const buttons = Array.from(root.querySelectorAll("[data-cover-home-nav]"));

  buttons.forEach(button => {
    const item = getCoverHomeNavigationItem(button);
    if (!item) return;

    button.style.setProperty("--cover-home-icon", `url('${item.icon}')`);

    if (!button.getAttribute("aria-label")) {
      button.setAttribute("aria-label", `Open ${item.label}`);
    }

    const label = button.querySelector(".home-cover-icon-label");
    if (label && !label.textContent.trim()) {
      label.textContent = item.label;
    }
  });

  return true;
}

let coverHomeNavigationBound = false;

function isCoverHomeScreen(screenId) {
  return isM4LAppHomeScreen(screenId);
}

function bindCoverHomeNavigation() {
  if (coverHomeNavigationBound === true) return true;
  if (!document || typeof document.addEventListener !== "function") return false;

  coverHomeNavigationBound = true;
  hydrateCoverHomeNavigationButtons(document);
  document.addEventListener("click", handleCoverHomeNavigationClick);
  return true;
}

function handleCoverHomeNavigationClick(event) {
  const button = event.target && event.target.closest
    ? event.target.closest("[data-cover-home-nav]")
    : null;

  if (!button || button.disabled) return;

  const key = String(button.dataset.coverHomeNav || "").trim();
  if (!key) return;

  event.preventDefault();

  const role = String(button.dataset.coverHomeRole || getBottomNavRole() || "").trim();

  if (!role) {
    console.warn("Cover Home navigation could not determine role.");
    return;
  }

  handleBottomNavigationClick(role, key);
}


let bottomNavigationViewportHandlerBound = false;

function isDesktopBottomNavigationLayout() {
  if (!window || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(min-width: 768px)").matches;
}

function setBottomNavigationDesktopPlacement(nav) {
  if (!nav || !document.body) return false;

  /*
    Large-screen nav layout is controlled by styles.css.
    Keep the nav as a fixed-position body child so it is not treated as a
    flex item beside .app-shell. V45 inserted it immediately after the fixed
    user band and applied sticky inline positioning; because body is a flex
    container, that made the nav occupy the left side of the desktop layout.
  */
  if (nav.parentNode !== document.body || nav.nextSibling) {
    document.body.appendChild(nav);
  }

  clearBottomNavigationDesktopPlacement(nav);
  return true;
}

function clearBottomNavigationDesktopPlacement(nav) {
  if (!nav) return false;

  [
    "position",
    "top",
    "bottom",
    "left",
    "right",
    "width",
    "max-width",
    "height",
    "min-height",
    "display",
    "flex-direction",
    "align-items",
    "justify-content",
    "gap",
    "overflow-x",
    "overflow-y",
    "box-sizing",
    "margin",
    "padding",
    "transform",
    "border-radius",
    "z-index"
  ].forEach(propertyName => {
    nav.style.removeProperty(propertyName);
  });

  nav.querySelectorAll(".bottom-nav__item").forEach(item => {
    ["flex", "width", "min-width"].forEach(propertyName => {
      item.style.removeProperty(propertyName);
    });
  });

  return true;
}

function placeBottomNavigationForViewport(nav) {
  if (!nav || !document.body) return false;

  const isDesktop = isDesktopBottomNavigationLayout();
  nav.classList.toggle("bottom-nav--desktop-top", isDesktop);
  nav.classList.toggle("bottom-nav--mobile-bottom", !isDesktop);
  document.body.classList.toggle("has-desktop-top-nav", isDesktop);
  document.body.classList.toggle("has-mobile-bottom-nav", !isDesktop);

  if (isDesktop) {
    return setBottomNavigationDesktopPlacement(nav);
  }

  if (nav.parentNode !== document.body || nav.nextSibling) {
    document.body.appendChild(nav);
  }

  clearBottomNavigationDesktopPlacement(nav);
  return true;
}

function bindBottomNavigationViewportHandler(nav) {
  if (bottomNavigationViewportHandlerBound === true) return true;
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return false;

  bottomNavigationViewportHandlerBound = true;

  const handleViewportChange = () => {
    const currentNav = document.getElementById("bottom-nav");
    if (currentNav) {
      placeBottomNavigationForViewport(currentNav);
    }
  };

  window.addEventListener("resize", handleViewportChange, { passive: true });

  if (typeof window.matchMedia === "function") {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleViewportChange);
    }
  }

  placeBottomNavigationForViewport(nav);
  return true;
}

function getBottomNavElement() {
  if (!document.body) {
    console.warn("Bottom navigation could not be created because document.body is missing.");
    return null;
  }

  let nav = document.getElementById("bottom-nav");

  if (!nav) {
    nav = document.createElement("nav");
    nav.id = "bottom-nav";
    nav.className = "bottom-nav hidden";
    nav.setAttribute("aria-label", "Primary navigation");
    document.body.appendChild(nav);
  }

  installGlobalBottomNavigationGestureBoundary();
  installBottomNavigationGestureGuard(nav);
  bindBottomNavigationViewportHandler(nav);
  placeBottomNavigationForViewport(nav);
  return nav;
}

function installBottomNavigationGestureGuard(nav) {
  if (!nav || nav.dataset.gestureGuard === "true") return;

  nav.dataset.gestureGuard = "true";

  let touchStartX = 0;
  let touchStartY = 0;

  const stopInsideBottomNav = event => {
    event.stopPropagation();
  };

  [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "mousedown",
    "mousemove",
    "mouseup",
    "click",
    "wheel"
  ].forEach(eventName => {
    nav.addEventListener(eventName, stopInsideBottomNav, { passive: true });
  });

  nav.addEventListener("touchstart", event => {
    const touch = event.touches && event.touches[0];

    touchStartX = touch ? touch.clientX : 0;
    touchStartY = touch ? touch.clientY : 0;

    stopInsideBottomNav(event);
  }, { passive: true });

  nav.addEventListener("touchmove", event => {
    const touch = event.touches && event.touches[0];

    stopInsideBottomNav(event);

    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

    if (!isHorizontalSwipe) {
      event.preventDefault();
      return;
    }

    const maxScrollLeft = Math.max(0, nav.scrollWidth - nav.clientWidth);
    const isAtLeftEdge = nav.scrollLeft <= 0;
    const isAtRightEdge = nav.scrollLeft >= maxScrollLeft - 1;
    const isSwipingRight = deltaX > 0;
    const isSwipingLeft = deltaX < 0;

    if (maxScrollLeft === 0 || (isAtLeftEdge && isSwipingRight) || (isAtRightEdge && isSwipingLeft)) {
      event.preventDefault();
    }
  }, { passive: false });

  ["touchend", "touchcancel"].forEach(eventName => {
    nav.addEventListener(eventName, stopInsideBottomNav, { passive: true });
  });
}

function getBottomNavItems(role) {
  const items = Array.isArray(BOTTOM_NAV_ITEMS[role]) ? BOTTOM_NAV_ITEMS[role] : [];
  return isGlobalLibraryOnlyContext()
    ? items.filter(item => item.key === "library")
    : items;
}

function isBottomNavItemAvailable(item) {
  if (!item) return false;

  if (item.targetScreen && !document.getElementById(item.targetScreen)) {
    console.warn("Missing bottom nav target:", item.targetScreen);
    return false;
  }

  /*
    Keep nav rendering independent from optional module load timing.
    Some nav items use actionName helpers that are defined by later classic scripts.
    The screen target is the stable availability check; the click handler will call
    the action when it exists and otherwise fall back to showScreen(targetScreen).
  */
  return true;
}

function getAvailableBottomNavItems(role) {
  return getBottomNavItems(role).filter(item => {
    return item.hideFromBottomNav !== true && isBottomNavItemAvailable(item);
  });
}

function createBottomNavButton(item, role) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bottom-nav__item";
  button.dataset.bottomNavKey = item.key;
  button.setAttribute("aria-label", item.label);

  const icon = document.createElement("span");
  icon.className = "bottom-nav__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.style.setProperty("--bottom-nav-icon", `url('${item.icon}')`);

  const label = document.createElement("span");
  label.className = "bottom-nav__label";
  label.textContent = item.label;

  button.appendChild(icon);
  button.appendChild(label);

  button.addEventListener("click", event => {
    event.preventDefault();
    handleBottomNavigationClick(role, item.key);
  });

  return button;
}

function renderBottomNavigation(role) {
  const nav = getBottomNavElement();
  if (!nav) return null;

  const items = getAvailableBottomNavItems(role);
  const itemKeys = items.map(item => item.key).join("|");

  if (nav.dataset.role === role && nav.dataset.itemKeys === itemKeys) {
    return nav;
  }

  nav.dataset.role = role || "";
  nav.dataset.itemKeys = itemKeys;
  nav.innerHTML = "";

  items.forEach(item => {
    nav.appendChild(createBottomNavButton(item, role));
  });

  return nav;
}

function shouldShowBottomNavigation(screenId, role) {
  if (!role || !state.token) return false;

  const hiddenScreens = new Set([
    "auth-screen",
    "student-home",
    "admin-home",
    "pdf-viewer-screen"
  ]);

  return !hiddenScreens.has(screenId);
}

function getBottomNavActiveKey(screenId, role) {
  const id = String(screenId || "");

  if (role === "student") {
    if (id === "student-home") return "home";

    if (id === "record-lesson-screen") return "record";

    if (["progress-subjects-screen", "progress-tasks-screen"].includes(id)) {
      return "progress";
    }

    if (id.startsWith("student-resources")) {
      return "library";
    }

    return "";
  }

  if (role === "admin") {
    if (id === "admin-home") return "home";

    if (id === "record-lesson-screen") return "record";

    if (id.startsWith("attendance")) return "attendance";

    if (id.startsWith("student-resources")) return "library";

    if ([
      "progress-report",
      "progress-subjects-screen",
      "progress-tasks-screen",
      "progress-task-students-screen",
      "teacher-student-tasks"
    ].includes(id)) {
      return "progress";
    }

    if (id.startsWith("admin-timetable")) return "admin";

    if (id === "timetable-builder-screen") return "admin";

    if (id.startsWith("weekly-planner")) return "admin";

    if (id.startsWith("manage-student")) return "admin";

    if (["manage-admins-screen", "manage-resources-screen", "system-settings-screen"].includes(id)) {
      return "admin";
    }

    if (id === "placeholder-screen") {
      return "admin";
    }

    if (["admin-academics", "admin-system-menu", "subjects-screen"].includes(id)) {
      return "admin";
    }

    return "";
  }

  return "";
}

function handleBottomNavigationClick(role, key) {
  const item = getBottomNavItems(role).find(navItem => navItem.key === key);

  if (!isBottomNavItemAvailable(item)) return false;

  try {
    if (item.actionName && typeof window[item.actionName] === "function") {
      const result = window[item.actionName]();
      if (result && typeof result.catch === "function") {
        result.catch(error => {
          console.error("Bottom nav action failed:", item.actionName, error);
        });
      }
      return true;
    }

    if (item.targetScreen) {
      return showScreen(item.targetScreen);
    }
  } catch (error) {
    console.error("Bottom nav action failed:", key, error);
  }

  return false;
}

function updateBottomNavigation(screenId) {
  const role = getBottomNavRole();
  const nav = renderBottomNavigation(role);
  if (!nav) return;

  placeBottomNavigationForViewport(nav);

  const itemCount = nav.querySelectorAll(".bottom-nav__item").length;
  const isVisible = itemCount > 0 && shouldShowBottomNavigation(screenId, role);
  const isCoverHome = isCoverHomeScreen(screenId) && !!state.token;

  nav.classList.toggle("hidden", !isVisible);

  if (document.body) {
    document.body.classList.toggle("has-bottom-nav", isVisible);
    document.body.classList.toggle("is-cover-home", isCoverHome);
  }

  const appShell = document.querySelector(".app-shell");
  if (appShell) {
    appShell.classList.toggle("has-bottom-nav", isVisible);
    appShell.classList.toggle("is-cover-home", isCoverHome);
  }

  if (!isVisible) return;

  const activeKey = getBottomNavActiveKey(screenId, role);

  nav.querySelectorAll(".bottom-nav__item").forEach(item => {
    const isActive = item.dataset.bottomNavKey === activeKey;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-current", isActive ? "page" : "false");
  });

  const activeItem = nav.querySelector(".bottom-nav__item.is-active");
  if (activeItem && typeof activeItem.scrollIntoView === "function") {
    activeItem.scrollIntoView({ inline: "center", block: "nearest" });
  }
}

window.M4LShell = {
  showScreen: typeof showScreen === "function" ? showScreen : undefined,
  bindHeaderIconActionHandlers: typeof bindHeaderIconActionHandlers === "function" ? bindHeaderIconActionHandlers : undefined,
  setHomeIconButton: typeof setHomeIconButton === "function" ? setHomeIconButton : undefined,
  setBackIconButton: typeof setBackIconButton === "function" ? setBackIconButton : undefined,
  getHeaderIconButtonMarkup: typeof getHeaderIconButtonMarkup === "function" ? getHeaderIconButtonMarkup : undefined,
  getHomeIconButtonMarkup: typeof getHomeIconButtonMarkup === "function" ? getHomeIconButtonMarkup : undefined,
  getBackIconButtonMarkup: typeof getBackIconButtonMarkup === "function" ? getBackIconButtonMarkup : undefined,
  getXCloseHomeButtonMarkup: typeof getXCloseHomeButtonMarkup === "function" ? getXCloseHomeButtonMarkup : undefined,
  getCurrentUserName: typeof getCurrentUserName === "function" ? getCurrentUserName : undefined,
  getCurrentUserLevelText: typeof getCurrentUserLevelText === "function" ? getCurrentUserLevelText : undefined,
  getActiveScreenId: typeof getActiveScreenId === "function" ? getActiveScreenId : undefined,
  updateUserBand: typeof updateUserBand === "function" ? updateUserBand : undefined,
  setTextActionButton: typeof setTextActionButton === "function" ? setTextActionButton : undefined,
  getBottomNavRole: typeof getBottomNavRole === "function" ? getBottomNavRole : undefined,
  isBottomNavGestureTarget: typeof isBottomNavGestureTarget === "function" ? isBottomNavGestureTarget : undefined,
  isBottomNavGestureActive: typeof isBottomNavGestureActive === "function" ? isBottomNavGestureActive : undefined,
  installGlobalBottomNavigationGestureBoundary: typeof installGlobalBottomNavigationGestureBoundary === "function" ? installGlobalBottomNavigationGestureBoundary : undefined,
  updateBottomNavigation: typeof updateBottomNavigation === "function" ? updateBottomNavigation : undefined,
  bindCoverHomeNavigation: typeof bindCoverHomeNavigation === "function" ? bindCoverHomeNavigation : undefined,
  bindHomeSwipeControls: typeof bindHomeSwipeControls === "function" ? bindHomeSwipeControls : undefined,
  bindHomeNativeScrollControls: typeof bindHomeNativeScrollControls === "function" ? bindHomeNativeScrollControls : undefined,
  bindHomeNativeScrollPanels: typeof bindHomeNativeScrollPanels === "function" ? bindHomeNativeScrollPanels : undefined,
  updateHomeNativeScrollDots: typeof updateHomeNativeScrollDots === "function" ? updateHomeNativeScrollDots : undefined,
  scrollHomeNativeScrollToPanel: typeof scrollHomeNativeScrollToPanel === "function" ? scrollHomeNativeScrollToPanel : undefined,
  bindHomeSwipePanels: typeof bindHomeSwipePanels === "function" ? bindHomeSwipePanels : undefined,
  placeBottomNavigationForViewport: typeof placeBottomNavigationForViewport === "function" ? placeBottomNavigationForViewport : undefined,
  beginAppStatus: typeof beginAppStatus === "function" ? beginAppStatus : undefined,
  updateAppStatus: typeof updateAppStatus === "function" ? updateAppStatus : undefined,
  endAppStatus: typeof endAppStatus === "function" ? endAppStatus : undefined,
  failAppStatus: typeof failAppStatus === "function" ? failAppStatus : undefined,
  withAppStatus: typeof withAppStatus === "function" ? withAppStatus : undefined,
  runUserBandRefresh: typeof runUserBandRefresh === "function" ? runUserBandRefresh : undefined,
  runManualRefresh: typeof runManualRefresh === "function" ? runManualRefresh : undefined,
  refreshCurrentResourceView: typeof refreshCurrentResourceView === "function" ? refreshCurrentResourceView : undefined,
  getStudentResourceViewModeSafe: typeof getStudentResourceViewModeSafe === "function" ? getStudentResourceViewModeSafe : undefined,
  isOptionalFunctionLoaded: typeof isOptionalFunctionLoaded === "function" ? isOptionalFunctionLoaded : undefined,
  getUserBandRefreshAction: typeof getUserBandRefreshAction === "function" ? getUserBandRefreshAction : undefined,
  recordAppHistoryScreen: typeof recordM4LAppHistoryScreen === "function" ? recordM4LAppHistoryScreen : undefined,
  recordAppSectionHome: typeof recordM4LAppSectionHome === "function" ? recordM4LAppSectionHome : undefined,
  recordAppSectionView: typeof recordM4LAppSectionView === "function" ? recordM4LAppSectionView : undefined,
  getAppHistoryState: typeof getM4LAppHistoryPublicState === "function" ? getM4LAppHistoryPublicState : undefined,
  registerAppHistorySection: typeof registerM4LAppHistorySection === "function" ? registerM4LAppHistorySection : undefined,
  closeAppHistoryLayer: typeof closeM4LAppHistoryLayer === "function" ? closeM4LAppHistoryLayer : undefined,
  closeAppSectionView: typeof closeM4LAppSectionView === "function" ? closeM4LAppSectionView : undefined,
  installAppHistoryModuleAdapters: typeof installM4LAppHistoryModuleAdapters === "function" ? installM4LAppHistoryModuleAdapters : undefined,
  initAppHistory: typeof initM4LAppHistory === "function" ? initM4LAppHistory : undefined
};

window.M4LAppHistory = {
  recordScreen: typeof recordM4LAppHistoryScreen === "function" ? recordM4LAppHistoryScreen : undefined,
  recordSectionHome: typeof recordM4LAppSectionHome === "function" ? recordM4LAppSectionHome : undefined,
  recordSectionView: typeof recordM4LAppSectionView === "function" ? recordM4LAppSectionView : undefined,
  getCurrentState: typeof getM4LAppHistoryPublicState === "function" ? getM4LAppHistoryPublicState : undefined,
  registerSection: typeof registerM4LAppHistorySection === "function" ? registerM4LAppHistorySection : undefined,
  getSectionForScreen: typeof getM4LAppSectionForScreen === "function" ? getM4LAppSectionForScreen : undefined,
  getSectionHomeScreen: typeof getM4LAppSectionHomeScreenId === "function" ? getM4LAppSectionHomeScreenId : undefined,
  closeLayer: typeof closeM4LAppHistoryLayer === "function" ? closeM4LAppHistoryLayer : undefined,
  closeSectionView: typeof closeM4LAppSectionView === "function" ? closeM4LAppSectionView : undefined,
  installModuleAdapters: typeof installM4LAppHistoryModuleAdapters === "function" ? installM4LAppHistoryModuleAdapters : undefined,
  init: typeof initM4LAppHistory === "function" ? initM4LAppHistory : undefined
};
