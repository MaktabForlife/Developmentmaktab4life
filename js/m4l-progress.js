/* M4L v90.9.6 - Progress JS cleanup wave 3
   Baseline: V90.9.5 Progress JS cleanup wave 2, deployed and tested good.
   Scope: remove legacy Progress summary percentage/statistic logic and old
   progress/status-bar rendering from the JS. Keep the active Class grid,
   selected-student Individual Progress, Student autosave, and batch save chain.
   Protected: confirmed save behaviour, Student autosave, Admin background
   save, Class Progress, selected-student Individual Progress, backend/API
   files, Attendance, Library, Home, Recorder, nav, and auth banner.
*/

/* =========================  
   STUDENT TASK VIEW  
========================= */  
  
let studentSubjectTaskGroups = {};  
let currentStudentSubjectKey = "";  
  
let progressUiGlobalHandlersBound = false;  
const M4L_PROGRESS_TICK = "\u2713";  
let studentProgressAutoSaveTimer = 0;  
let studentProgressAutoSaveInFlight = null;  
let studentProgressAutoSaveDrainRequested = false;
let studentProgressSectionStateGuardBound = false;  
let studentProgressModuleEditState = Object.create(null);  
let adminIndividualProgressEditMode = false;  
let adminIndividualProgressModuleEditState = Object.create(null);
let adminIndividualProgressActiveModuleIndex = 0;  
let adminProgressSwipeEscapeGuardBound = false;
let progressBatchEndpointSupport = Object.create(null);
  
function resetStudentProgressViewportScroll() {  
  const reset = () => {  
    if (typeof window !== "undefined" && typeof window.scrollTo === "function" && ((window.scrollX || 0) !== 0 || (window.scrollY || 0) !== 0)) {  
      window.scrollTo(0, 0);  
    }  
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
  
function isStudentProgressScreenId(screenId) {  
  return [  
    "progress-subjects-screen",  
    "progress-tasks-screen"  
  ].includes(String(screenId || ""));  
}  
  
function setStudentProgressSectionBodyState(screenIdOrActive) {  
  if (typeof document === "undefined" || !document.body) {  
    return false;  
  }  
  
  const isActive = typeof screenIdOrActive === "boolean"  
    ? screenIdOrActive  
    : isStudentProgressScreenId(screenIdOrActive);  
  
  document.body.classList.toggle("is-student-progress-section", isActive);  
  
  if (isActive) {  
    resetStudentProgressViewportScroll();  
  }  
  
  return isActive;  
}  
  
function bindStudentProgressSectionStateGuard() {  
  if (studentProgressSectionStateGuardBound === true) return true;  
  if (typeof window === "undefined" || typeof window.showScreen !== "function") return false;  
  
  studentProgressSectionStateGuardBound = true;  
  
  if (window.showScreen.__m4lStudentProgressSectionGuard === true) {  
    return true;  
  }  
  
  const originalShowScreen = window.showScreen;  
  
  const guardedShowScreen = function guardedStudentProgressShowScreen(screenId, ...args) {  
    const result = originalShowScreen.call(this, screenId, ...args);  
  
    if (result !== false) {  
      setStudentProgressSectionBodyState(screenId);  
    }  
  
    return result;  
  };  
  
  guardedShowScreen.__m4lStudentProgressSectionGuard = true;  
  window.showScreen = guardedShowScreen;  
  return true;  
}  
  
function bindProgressUiHandlers(containerOrId) {  
  // Progress actions use one delegated handler so dynamically-rendered  
  // student/admin progress rows do not need inline onclick strings.  
  if (progressUiGlobalHandlersBound === true) {  
    return !!getDomElement(containerOrId);  
  }  
  
  if (!document || typeof document.addEventListener !== "function") {  
    return false;  
  }  
  
  progressUiGlobalHandlersBound = true;  
  document.addEventListener("click", handleProgressUiClick);  
  document.addEventListener("keydown", handleProgressUiKeydown);  
  document.addEventListener("change", handleProgressUiChange);  
  document.addEventListener("input", handleProgressUiInput);  
  bindAdminProgressSwipeEscapeGuard();
  return !!getDomElement(containerOrId);  
}  
  
function bindAdminProgressSwipeEscapeGuard() {
  if (adminProgressSwipeEscapeGuardBound === true) return true;
  if (typeof document === "undefined" || typeof document.addEventListener !== "function") return false;

  adminProgressSwipeEscapeGuardBound = true;

  const progressRootSelector = [
    "#progress-report.admin-theme .admin-progress-class-overview",
    "#progress-report.admin-theme .admin-individual-progress-shell"
  ].join(", ");

  const horizontalScrollSelector = [
    ".admin-progress-class-grid-scroll",
    ".admin-individual-progress-pane-viewport",
    ".admin-individual-progress-module-numbers",
    ".student-progress-stepper-number-strip"
  ].join(", ");

  let gesture = null;

  const getTouchPoint = event => {
    const touches = event && event.touches;
    return touches && touches.length ? touches[0] : null;
  };

  const preventSwipeEscape = event => {
    if (!event) return false;
    if (event.cancelable && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }
    return true;
  };

  const getHorizontalScroller = target => {
    if (!target || typeof target.closest !== "function") return null;
    const scroller = target.closest(horizontalScrollSelector);
    if (!scroller) return null;
    return (scroller.scrollWidth || 0) > (scroller.clientWidth || 0) + 2 ? scroller : null;
  };

  const shouldAbsorbHorizontalEscape = (target, deltaX, deltaY) => {
    const absX = Math.abs(Number(deltaX || 0));
    const absY = Math.abs(Number(deltaY || 0));

    if (absX < 10 || absX < absY * 1.08) {
      return false;
    }

    const horizontalScroller = getHorizontalScroller(target);

    if (!horizontalScroller) {
      return true;
    }

    const maxScrollLeft = Math.max(0, (horizontalScroller.scrollWidth || 0) - (horizontalScroller.clientWidth || 0));
    const currentScrollLeft = Math.max(0, horizontalScroller.scrollLeft || 0);
    const atStart = currentScrollLeft <= 1;
    const atEnd = currentScrollLeft >= maxScrollLeft - 1;

    // Touch: deltaX > 0 means the finger is moving right and trying to move the
    // scroll container before its first pane. Wheel/trackpad: the caller passes
    // deltaX in native wheel direction, so normalize before calling this helper.
    const swipingRight = deltaX > 0;
    const swipingLeft = deltaX < 0;

    return (atStart && swipingRight) || (atEnd && swipingLeft);
  };

  document.addEventListener("touchstart", event => {
    const target = event && event.target;
    if (!target || typeof target.closest !== "function") {
      gesture = null;
      return;
    }

    const root = target.closest(progressRootSelector);
    const point = getTouchPoint(event);

    if (!root || !point) {
      gesture = null;
      return;
    }

    gesture = {
      root,
      target,
      startX: point.clientX,
      startY: point.clientY
    };
  }, { capture: true, passive: true });

  document.addEventListener("touchmove", event => {
    if (!gesture || !gesture.root || !gesture.target) return;

    if (!document.body || !document.body.contains(gesture.root)) {
      gesture = null;
      return;
    }

    const point = getTouchPoint(event);
    if (!point) return;

    const deltaX = point.clientX - gesture.startX;
    const deltaY = point.clientY - gesture.startY;

    if (shouldAbsorbHorizontalEscape(gesture.target, deltaX, deltaY)) {
      preventSwipeEscape(event);
    }
  }, { capture: true, passive: false });

  document.addEventListener("wheel", event => {
    const target = event && event.target;
    if (!target || typeof target.closest !== "function") return;

    const root = target.closest(progressRootSelector);
    if (!root) return;

    const deltaX = Number(event.deltaX || 0);
    const deltaY = Number(event.deltaY || 0);
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 6 || absX < absY * 1.02) {
      return;
    }

    const horizontalScroller = getHorizontalScroller(target);

    if (!horizontalScroller) {
      preventSwipeEscape(event);
      return;
    }

    const maxScrollLeft = Math.max(0, (horizontalScroller.scrollWidth || 0) - (horizontalScroller.clientWidth || 0));
    const currentScrollLeft = Math.max(0, horizontalScroller.scrollLeft || 0);
    const atStart = currentScrollLeft <= 1;
    const atEnd = currentScrollLeft >= maxScrollLeft - 1;

    // Wheel deltaX is negative when scrolling left and positive when scrolling right.
    if ((atStart && deltaX < 0) || (atEnd && deltaX > 0)) {
      preventSwipeEscape(event);
    }
  }, { capture: true, passive: false });

  document.addEventListener("touchend", () => {
    gesture = null;
  }, { capture: true, passive: true });

  document.addEventListener("touchcancel", () => {
    gesture = null;
  }, { capture: true, passive: true });

  return true;
}

function getProgressActionElement(event) {  
  const target = event && event.target;  
  if (!target || typeof target.closest !== "function") return null;  
  
  const actionEl = target.closest("[data-progress-action]");  
  if (!actionEl) return null;  
  
  const progressScope = actionEl.closest(  
    "#progress-report, #admin-progress-dashboard, #admin-progress-student-popout, " +  
    "#progress-subjects-screen, #progress-tasks-screen, #progress-task-students-screen, " +  
    "#progress-subjects-list, #progress-tasks-list, #progress-task-students-list"  
  );  
  
  return progressScope ? actionEl : null;  
}  
  
function getProgressChangeElement(event) {  
  const target = event && event.target;  
  if (!target || typeof target.closest !== "function") return null;  
  
  const actionEl = target.closest("[data-progress-change-action]");  
  if (!actionEl) return null;  
  
  const progressScope = actionEl.closest(  
    "#progress-report, #admin-progress-dashboard, #admin-progress-student-popout, " +  
    "#progress-subjects-screen, #progress-tasks-screen, #progress-task-students-screen, " +  
    "#progress-subjects-list, #progress-tasks-list, #progress-task-students-list"  
  );  
  
  return progressScope ? actionEl : null;  
}  
  
function getProgressBoolean(value) {  
  return String(value || "").toLowerCase() === "true";  
}  
  
function getProgressInputElement(event) {  
  const target = event && event.target;  
  if (!target || typeof target.closest !== "function") return null;  
  const actionEl = target.closest("[data-progress-input-action]");  
  if (!actionEl) return null;  
  const progressScope = actionEl.closest(  
    "#progress-report, #admin-progress-dashboard, #admin-progress-student-popout, " +  
    "#progress-subjects-screen, #progress-tasks-screen, #progress-task-students-screen, " +  
    "#progress-subjects-list, #progress-tasks-list, #progress-task-students-list"  
  );  
  return progressScope ? actionEl : null;  
}  
  
function handleProgressUiInput(event) {  
  const actionEl = getProgressInputElement(event);  
  if (!actionEl || actionEl.disabled) return;  
  const action = actionEl.dataset.progressInputAction || "";  
  
  switch (action) {  
    case "filter-admin-student-list":
      // V90.8.5 cleanup: old Individual student search has been removed.
      break;
    default:  
      break;  
  }  
}  
  
function handleProgressUiChange(event) {  
  const actionEl = getProgressChangeElement(event);  
  if (!actionEl || actionEl.disabled) return;  
  
  const action = actionEl.dataset.progressChangeAction || "";  
  
  switch (action) {  
    default:  
      console.warn("Unknown progress change action:", action);  
      break;  
  }  
}  
  
function handleProgressUiKeydown(event) {  
  if (!event || (event.key !== "Enter" && event.key !== " ")) return;  
  
  const actionEl = getProgressActionElement(event);  
  if (!actionEl) return;  
  
  event.preventDefault();  
  actionEl.click();  
}  
  
function handleProgressUiClick(event) {  
  const actionEl = getProgressActionElement(event);  
  if (!actionEl || actionEl.disabled) return;  
  
  event.preventDefault();  
  event.stopPropagation();  
  
  const action = actionEl.dataset.progressAction || "";  
  
  switch (action) {  
    case "open-student-subject-tasks":  
      openStudentSubjectTasks(actionEl.dataset.subjectKey || "");  
      break;  
  
    case "scroll-student-progress-module":  
      scrollStudentProgressSwipeToIndex(  
        Number(actionEl.dataset.progressPanelIndex || 0)  
      );  
      break;  

    case "step-student-progress-module":
      stepStudentProgressSwipeBy(
        Number(actionEl.dataset.progressStep || 0)
      );
      break;
  
    case "toggle-student-progress-module-edit":  
      toggleStudentProgressModuleEdit(actionEl);  
      break;  
    case "save-student-progress":  
      saveStudentProgressSwipeChanges(actionEl);  
      break;  
  
    case "close-student-progress":  
      closeStudentProgressAndReturnHome(actionEl);  
      break;  
  
    case "toggle-admin-progress-grid-edit":  
      setAdminProgressMatrixEditMode(!adminProgressMatrixEditMode, actionEl);  
      break;  
  
    case "toggle-student-subject-task":  
      if (canToggleStudentProgressGridCell(actionEl)) {  
        toggleStudentSubjectTask(  
          actionEl.dataset.studenttaskid || "",  
          getProgressBoolean(actionEl.dataset.complete)  
        );  
      }  
      break;  
  
    case "toggle-student-task-inline-player":  
      toggleStudentTaskInlinePlayer(  
        actionEl.dataset.playerId || "",  
        actionEl.dataset.link || "",  
        actionEl.dataset.type || ""  
      );  
      break;  
  
    case "open-student-task-external-link":  
      openStudentTaskExternalLink(  
        actionEl.dataset.link || "",  
        actionEl.dataset.type || ""  
      );  
      break;  
  
    case "open-progress-subject":  
      openProgressSubject(  
        actionEl.dataset.subjectid || "",  
        actionEl.dataset.subjectname || ""  
      );  
      break;  
  
    case "open-progress-task":  
      openProgressTask(  
        actionEl.dataset.taskid || "",  
        actionEl.dataset.taskname || ""  
      );  
      break;  
  
    case "open-admin-progress-task-card":  
      openAdminProgressTaskCard(  
        actionEl.dataset.subjectid || "",  
        actionEl.dataset.subjectname || "",  
        actionEl.dataset.taskid || "",  
        actionEl.dataset.taskname || "",  
        actionEl.dataset.classgroup || "ALL"  
      );  
      break;  
  
    case "open-admin-individual-student-card":  
      openAdminIndividualStudentCard(  
        actionEl.dataset.studentid || "",  
        actionEl.dataset.username || "Student"  
      );  
      break;  
  
    case "close-admin-individual-student-view":  
      requestCloseAdminIndividualStudentView();  
      break;  

    case "toggle-admin-individual-progress-edit":  
      toggleAdminIndividualProgressEdit(actionEl);  
      break;  

    case "scroll-admin-individual-progress-module":
      scrollAdminIndividualProgressModuleToIndex(
        Number(actionEl.dataset.progressPanelIndex || 0)
      );
      break;

    case "step-admin-individual-progress-module":
      stepAdminIndividualProgressModuleBy(
        Number(actionEl.dataset.progressStep || 0)
      );
      break;

    case "cycle-admin-individual-progress-cell":
      cycleAdminIndividualProgressCell(actionEl);
      break;
  
    case "open-admin-progress-student-popout":  
      openAdminProgressStudentPopout(  
        actionEl.dataset.studentid || "",  
        actionEl.dataset.username || "Student"  
      );  
      break;  
  
    case "scroll-admin-progress-group":  
      scrollAdminProgressGroupToIndex(  
        Number(actionEl.dataset.progressGroupIndex || 0)  
      );  
      break;  

    case "scroll-admin-class-progress-module":
      scrollAdminProgressClassModuleToIndex(
        Number(actionEl.dataset.progressClassModuleIndex || 0)
      );
      break;

    case "toggle-admin-progress-class-group":
      toggleAdminProgressClassAccordionGroup(
        actionEl.dataset.progressClassGroupKey || ""
      );
      break;

    case "toggle-admin-progress-class-module":
      toggleAdminProgressClassAccordionModule(
        actionEl.dataset.progressClassModuleKey || ""
      );
      break;

    case "cycle-admin-progress-class-cell":
      cycleAdminProgressClassMatrixCell(actionEl);
      break;
  
    case "scroll-admin-popout-module":  
      scrollAdminProgressPopoutModuleToIndex(  
        Number(actionEl.dataset.progressModuleIndex || 0)  
      );  
      break;  
  
    case "close-admin-progress-task-screen":  
      requestCloseAdminProgressTaskScreen();  
      break;  
  
    case "save-admin-progress-task":  
      saveAdminProgressTaskChanges(actionEl);  
      break;  
  
    case "toggle-progress-pending-popout":  
      toggleProgressPendingForAdminPopout(  
        actionEl.dataset.studenttaskid || "",  
        actionEl.dataset.field || "",  
        getProgressBoolean(actionEl.dataset.value)  
      );  
      break;  
  
    case "close-admin-progress-student-popout":  
      requestCloseAdminProgressStudentPopout();  
      break;  
  
    case "save-admin-progress-popout":  
      saveAdminProgressPopoutChanges(actionEl);  
      break;  
  
    case "toggle-progress-pending":  
      if (canToggleAdminIndividualProgressCell(actionEl)) {  
        toggleProgressPending(  
          actionEl.dataset.studenttaskid || "",  
          actionEl.dataset.field || "",  
          getProgressBoolean(actionEl.dataset.value)  
        );  
      }  
      break;  
  
    default:  
      console.warn("Unknown progress action:", action);  
      break;  
  }  
}  
  
  
  
async function showStudentTasks(options = {}) {  
  setStudentProgressSectionBodyState(true);  
  bindStudentProgressSectionStateGuard();  
  setProgressScreensForStudent();  
  setManualRefreshButton("progress-subjects-screen", "refreshStudentTaskProgress(this)");  
  
  if (!showScreen("progress-subjects-screen")) {  
    console.warn("Student progress screen is missing.");  
    return;  
  }  
  
  resetStudentProgressViewportScroll();  
  setDomText("progress-subjects-title", "Progress");  
  
  if (!setDomHtml("progress-subjects-list", "")) {  
    console.warn("Missing progress-subjects-list container.");  
    return;  
  }  
  
  const statusToken = beginProgressLoadStatus("Loading progress...");

  try {  
    const result = await apiPost("/api/tasks/student", {  
      subjectid: "ALL"  
    }, state.token);  
  
    if (!result.success) {  
      failProgressLoadStatus(statusToken, "Progress load failed");
      setDomHtml("progress-subjects-list", `<p class="error-message">${escapeHtml(result.error || "Failed to load tasks")}</p>`);  
      return;  
    }  
  
    if (!result.tasks || result.tasks.length === 0) {  
      endProgressLoadStatus(statusToken, "Progress loaded");
      setDomHtml("progress-subjects-list", `<p class="helper-text">No tasks assigned yet.</p>`);  
      return;  
    }  
  
    const normalizedTasks = result.tasks.map(normalizeStudentTask);  
    studentSubjectTaskGroups = buildStudentSubjectTaskGroups(normalizedTasks);  
    renderStudentSubjectProgress(options);  
    endProgressLoadStatus(statusToken, "Progress loaded");
  
  } catch (err) {  
    failProgressLoadStatus(statusToken, "Progress load failed");
    console.error("Could not load student tasks:", err);  
    setDomHtml("progress-subjects-list", `<p class="error-message">${escapeHtml(err.message || "Failed to load tasks")}</p>`);  
  }  
}  
  

function setProgressScreensForStudent() {  
  ["progress-subjects-screen", "progress-tasks-screen"].forEach(id => {  
    const screen = document.getElementById(id);  
    if (!screen) return;  
    screen.classList.remove("admin-theme");  
    screen.classList.add("student-theme");  
  });  
  
  const subjectBackButton = document.querySelector("#progress-subjects-screen .nav-header .small-btn:not(.student-progress-save-btn)");  
  if (subjectBackButton) {  
    // The V70 student progress landing page has its own frozen module header.  
    // The legacy app-screen header is kept in the HTML for compatibility but hidden by CSS.  
    subjectBackButton.classList.remove("home-icon-btn", "back-icon-btn", "icon-action-btn", "icon-action-btn-large", "save-return-btn", "student-progress-save-btn");  
    subjectBackButton.removeAttribute("data-header-action");  
    subjectBackButton.removeAttribute("data-header-target");  
    subjectBackButton.setAttribute("onclick", "showScreen('student-home')");  
    subjectBackButton.textContent = "Back";  
  }  
  
  const taskBackButton = document.querySelector("#progress-tasks-screen .small-btn:not(.student-progress-save-btn)");  
  if (taskBackButton) {  
    taskBackButton.classList.remove("save-return-btn", "student-progress-save-btn");  
    setBackIconButton(taskBackButton, "showScreen('progress-subjects-screen')");  
  }  
  
  ensureStudentProgressSaveButton();  
}  
  
  
function ensureStudentProgressSaveButton() {  
  // Legacy Student Progress save-button cleanup retained for compatibility.  
  // V75.6 removes the visible Student Progress Save button and auto-saves changes.  
  // V70 renders the student Progress Save button inside the frozen module header.  
  // Remove any legacy save button that may have been injected into the old nav-header.  
  document.querySelectorAll("#progress-subjects-screen .nav-header .student-progress-save-btn").forEach(button => button.remove());  
}  
  
  
function setProgressScreensForAdmin() {  
  document  
    .querySelectorAll("#progress-subjects-screen .student-progress-save-btn, #progress-tasks-screen .student-progress-save-btn")  
    .forEach(button => button.remove());  
  
  ["progress-subjects-screen", "progress-tasks-screen", "progress-task-students-screen"].forEach(id => {  
    const screen = document.getElementById(id);  
    if (!screen) return;  
    screen.classList.remove("student-theme");  
    screen.classList.add("admin-theme");  
  });  
  
  const subjectBackButton = document.querySelector("#progress-subjects-screen .small-btn");  
  setAdminProgressCloseButton(subjectBackButton, "showScreen('progress-report')");  
  
  const taskBackButton = document.querySelector("#progress-tasks-screen .small-btn");  
  setAdminProgressCloseButton(taskBackButton, "showScreen('progress-subjects-screen')");  
  
  prepareAdminProgressTaskHeader();  
}  
  
function setAdminProgressCloseButton(button, fallbackOnclick) {  
  if (!button) return false;  
  button.classList.remove("home-icon-btn", "back-icon-btn", "icon-action-btn", "icon-action-btn-large", "save-return-btn", "student-progress-save-btn", "admin-progress-save-button");  
  button.classList.add("admin-progress-close-btn");  
  button.type = "button";  
  button.textContent = "X";  
  button.setAttribute("aria-label", "Close");  
  button.setAttribute("title", "Close");  
  button.removeAttribute("data-header-action");  
  button.removeAttribute("data-header-target");  
  if (fallbackOnclick) {  
    button.setAttribute("onclick", fallbackOnclick);  
  }  
  return true;  
}  
  
function prepareAdminProgressTaskHeader() {  
  const detailScreen = document.getElementById("progress-task-students-screen");  
  
  const header = document.querySelector("#progress-task-students-screen .nav-header");  
  if (!header) return false;  
  
  header.classList.add("admin-progress-detail-header", "admin-progress-sticky-detail-header");  
  
  const title = header.querySelector("#progress-task-students-title");  
  if (!title) return false;  
  
  header.querySelectorAll("button").forEach(button => {  
    if (button.dataset.progressAction !== "close-admin-progress-task-screen") {  
      button.remove();  
    }  
  });  
  
  let closeButton = header.querySelector('[data-progress-action="close-admin-progress-task-screen"]');  
  if (!closeButton) {  
    closeButton = document.createElement("button");  
    closeButton.type = "button";  
    closeButton.dataset.progressAction = "close-admin-progress-task-screen";  
    header.insertBefore(closeButton, title);  
  }  
  
  closeButton.className = "small-btn admin-progress-close-btn";  
  closeButton.textContent = "X";  
  closeButton.setAttribute("aria-label", "Close progress detail");  
  closeButton.setAttribute("title", "Close");  
  closeButton.removeAttribute("onclick");  
  
  if (header.firstElementChild !== closeButton) {  
    header.insertBefore(closeButton, header.firstElementChild);  
  }  
  if (closeButton.nextElementSibling !== title) {  
    header.insertBefore(title, closeButton.nextSibling);  
  }  
  
  return true;  
}  
  
function getStudentTaskField(task, names, fallback = "") {  
  for (const name of names) {  
    if (task && task[name] !== undefined && task[name] !== null && String(task[name]).trim() !== "") {  
      return task[name];  
    }  
  }  
  return fallback;  
}  
  
function normalizeStudentTask(task) {  
  return {  
    ...task,  
    studenttaskid: getStudentTaskField(task, ["studenttaskid", "studentTaskId", "StudentTaskID", "StudentTaskId"]),  
    taskid: getStudentTaskField(task, ["taskid", "taskID", "TaskID", "TaskId"]),  
    taskname: getStudentTaskField(task, ["taskname", "taskName", "TaskName", "Task"], "Untitled Task"),  
    subjectid: getStudentTaskField(task, ["subjectid", "subjectID", "SubjectID", "SubjectId"]),  
    subjectname: getStudentTaskField(task, ["subjectname", "subjectName", "SubjectName", "Subject"], "Other"),  
    moduleid: getStudentTaskField(task, ["moduleid", "moduleID", "ModuleID", "ModuleId"]),  
    modulename: getStudentTaskField(task, ["modulename", "moduleName", "ModuleName", "Module"]),  
    completestatus: getStudentTaskField(task, ["completestatus", "completeStatus", "CompleteStatus", "Complete", "Completed"]),  
    verifystatus: getStudentTaskField(task, ["verifystatus", "verifyStatus", "VerifyStatus", "Verified"]),  
    completeddate: getStudentTaskField(task, [  
      "completeddate", "completedDate", "CompletedDate", "CompleteDate", "LastCompletedDate",  
      "lastCompletedDate", "LatestCompletedDate", "latestCompletedDate", "CompletedAt", "completedAt"  
    ]),  
    verifieddate: getStudentTaskField(task, [  
      "verifieddate", "verifiedDate", "VerifiedDate", "VerifyDate", "LastVerifiedDate",  
      "lastVerifiedDate", "LatestVerifiedDate", "latestVerifiedDate", "VerifiedAt", "verifiedAt"  
    ]),  
    audiolink: getStudentTaskField(task, ["audiolink", "audioLink", "AudioLink", "Audio"]),  
    graphiclink: getStudentTaskField(task, ["graphiclink", "graphicLink", "GraphicLink", "GraphicsLink", "ImageLink", "visuallink", "visualLink", "VisualLink"]),  
    videolink: getStudentTaskField(task, ["videolink", "videoLink", "VideoLink", "Video"]),  
    pdflink: getStudentTaskField(task, ["pdflink", "pdfLink", "PDFLink", "PdfLink", "PDF"])  
  };  
}  
  
function buildStudentSubjectTaskGroups(tasks) {  
  const groups = {};  
  
  [...tasks].sort(sortByModuleThenTask).forEach(task => {  
    const moduleName = task.modulename || "General";  
    const moduleKey = task.moduleid || moduleName;  
  
    if (!groups[moduleKey]) {  
      groups[moduleKey] = {  
        subjectid: moduleKey,  
        subjectname: moduleName,  
        tasks: []  
      };  
    }  
  
    groups[moduleKey].tasks.push(task);  
  });  
  
  return groups;  
}  
  
function getStudentProgressModules() {  
  return Object.values(studentSubjectTaskGroups || {}).sort(sortModuleGroupsByModuleId);  
}  
  
function getStudentProgressSwipeTrack() {  
  return document.querySelector("#progress-subjects-screen [data-progress-swipe-track]");  
}  

function getStudentProgressPaneViewport(track) {
  const targetTrack = track || getStudentProgressSwipeTrack();

  if (!targetTrack || typeof targetTrack.closest !== "function") {
    return null;
  }

  return targetTrack.closest("[data-progress-pane-viewport], .student-progress-pane-viewport");
}

function getStudentProgressStepperVisibleSlots() {
  if (isStudentProgressMobileSwipeViewport()) {
    return 1;
  }

  if (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1180px)").matches) {
    return 5;
  }

  return 3;
}

function syncStudentProgressStepperViewport(track) {
  const targetTrack = track || getStudentProgressSwipeTrack();

  if (!targetTrack) {
    return false;
  }

  if (isStudentProgressMobileSwipeViewport()) {
    targetTrack.style.removeProperty("--student-progress-visible-slots");
    targetTrack.style.removeProperty("--student-progress-card-gap");
    targetTrack.style.removeProperty("--student-progress-card-width");
    targetTrack.style.removeProperty("--student-progress-card-step");
    targetTrack.style.removeProperty("--student-progress-edge-space");
    targetTrack.style.removeProperty("--student-progress-track-offset");
    targetTrack.style.transform = "";
    return true;
  }

  const viewport = getStudentProgressPaneViewport(targetTrack) || targetTrack.parentElement;
  const viewportWidth = viewport && viewport.clientWidth ? viewport.clientWidth : targetTrack.clientWidth;
  const slots = getStudentProgressStepperVisibleSlots();
  const gap = slots >= 5 ? 16 : 14;
  const cardWidth = Math.max(1, Math.floor((Math.max(1, viewportWidth) - ((slots - 1) * gap)) / slots));
  const cardStep = cardWidth + gap;
  const edgeSpace = Math.max(0, (Math.max(1, viewportWidth) - cardWidth) / 2);

  targetTrack.style.setProperty("--student-progress-visible-slots", String(slots));
  targetTrack.style.setProperty("--student-progress-card-gap", `${gap}px`);
  targetTrack.style.setProperty("--student-progress-card-width", `${cardWidth}px`);
  targetTrack.style.setProperty("--student-progress-card-step", `${cardStep}px`);
  targetTrack.style.setProperty("--student-progress-edge-space", `${edgeSpace}px`);
  targetTrack.style.removeProperty("--student-progress-track-offset");
  targetTrack.style.transform = "";
  targetTrack.classList.remove("is-stepper-jump", "is-pointer-dragging");
  return true;
}

function moveStudentProgressStepperTrackToIndex(index, options = {}) {
  const track = getStudentProgressSwipeTrack();
  const panels = getStudentProgressSwipePanels(track);
  const viewport = getStudentProgressPaneViewport(track);

  if (!track || !viewport || !panels.length || isStudentProgressMobileSwipeViewport()) {
    return false;
  }

  const requestedIndex = Number(index || 0);
  const safeIndex = Math.max(0, Math.min(panels.length - 1, Number.isFinite(requestedIndex) ? requestedIndex : 0));
  const panel = panels[safeIndex];

  if (!panel) {
    return false;
  }

  syncStudentProgressStepperViewport(track);

  const viewportWidth = viewport.clientWidth || track.clientWidth || 1;
  const panelCenter = (panel.offsetLeft || 0) + ((panel.offsetWidth || panel.clientWidth || 0) / 2);
  const targetLeft = Math.max(0, Math.min(
    Math.max(0, (viewport.scrollWidth || 0) - viewportWidth),
    panelCenter - (viewportWidth / 2)
  ));

  track.style.removeProperty("--student-progress-track-offset");
  track.style.transform = "";
  track.classList.toggle("is-stepper-jump", options.behavior === "auto");

  if (typeof viewport.scrollTo === "function") {
    viewport.scrollTo({
      left: targetLeft,
      top: 0,
      behavior: options.behavior === "auto" ? "auto" : "smooth"
    });
  } else {
    viewport.scrollLeft = targetLeft;
  }

  return true;
}

function getStudentProgressSwipePanels(track) {  
  const targetTrack = track || getStudentProgressSwipeTrack();  
  
  if (!targetTrack || !targetTrack.children) {  
    return [];  
  }  
  
  return Array.from(targetTrack.children).filter(child => {  
    return child &&  
      child.matches &&  
      child.matches("[data-progress-swipe-panel], .m4l-progress-swipe-panel, .student-progress-module-panel");  
  });  
}  
  
function getStudentProgressNativeViewportActiveIndex(track) {
  const targetTrack = track || getStudentProgressSwipeTrack();
  const viewport = getStudentProgressPaneViewport(targetTrack);
  const panels = getStudentProgressSwipePanels(targetTrack);

  if (!targetTrack || !viewport || !panels.length || isStudentProgressMobileSwipeViewport()) {
    return 0;
  }

  const viewportCenter = (viewport.scrollLeft || 0) + ((viewport.clientWidth || 0) / 2);
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  panels.forEach((panel, index) => {
    const panelCenter = (panel.offsetLeft || 0) + ((panel.offsetWidth || panel.clientWidth || 0) / 2);
    const distance = Math.abs(panelCenter - viewportCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return Math.max(0, Math.min(panels.length - 1, closestIndex));
}

function syncStudentProgressNativeViewportActiveIndex(track, options = {}) {
  const targetTrack = track || getStudentProgressSwipeTrack();
  const panels = getStudentProgressSwipePanels(targetTrack);

  if (!targetTrack || !panels.length || isStudentProgressMobileSwipeViewport()) {
    return false;
  }

  const requestedIndex = Number(
    options && options.index !== undefined
      ? options.index
      : getStudentProgressNativeViewportActiveIndex(targetTrack)
  );
  const index = Math.max(0, Math.min(
    panels.length - 1,
    Number.isFinite(requestedIndex) ? requestedIndex : 0
  ));
  const activePanel = panels[index];

  if (!activePanel) {
    return false;
  }

  currentStudentSubjectKey = String(activePanel.dataset.progressModuleKey || currentStudentSubjectKey || "");
  targetTrack.dataset.progressActiveModuleKey = currentStudentSubjectKey;
  targetTrack.dataset.progressActiveIndex = String(index);
  targetTrack.style.setProperty("--student-progress-active-index", String(index));

  if (options.update !== false) {
    updateStudentProgressSwipeDots();
  }

  return true;
}


function getStudentProgressSwipePanelStep(track) {  
  const targetTrack = track || getStudentProgressSwipeTrack();  
  const panels = getStudentProgressSwipePanels(targetTrack);  
  
  if (!targetTrack || panels.length <= 1) {  
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
  
  return targetTrack.clientWidth || 1;  
}  
  
function getStudentProgressSwipeActiveIndex(track) {  
  const targetTrack = track || getStudentProgressSwipeTrack();  
  
  if (!targetTrack) {  
    return 0;  
  }  
  
  const panels = getStudentProgressSwipePanels(targetTrack);  
  const panelCount = panels.length;  
  
  if (panelCount <= 1) {  
    return 0;  
  }  

  const clampIndex = value => {
    const numberValue = Number(value);
    return Math.max(0, Math.min(panelCount - 1, Number.isFinite(numberValue) ? numberValue : 0));
  };

  // V89.6.6.2: On medium/large screens native PaneViewport scrolling updates
  // the stored active index after the scroll settles. Stepper clicks scroll the
  // same viewport. Mobile keeps the original track scroll-position behaviour.
  if (!isStudentProgressMobileSwipeViewport()) {
    const storedIndex = Number(targetTrack.dataset.progressActiveIndex || "");
    if (Number.isFinite(storedIndex)) {
      return clampIndex(storedIndex);
    }

    const activeKey = String(currentStudentSubjectKey || targetTrack.dataset.progressActiveModuleKey || "");
    if (activeKey) {
      const selectedIndex = panels.findIndex(panel => {
        return String(panel.dataset.progressModuleKey || "") === activeKey;
      });

      if (selectedIndex >= 0) {
        return clampIndex(selectedIndex);
      }
    }
  }
  
  // Responsive grid layouts have no meaningful horizontal scroll. In that mode,  
  // the selected dot/module becomes the active module for the sticky header.  
  if ((targetTrack.scrollWidth || 0) <= (targetTrack.clientWidth || 0) + 2) {  
    const activeKey = String(currentStudentSubjectKey || targetTrack.dataset.progressActiveModuleKey || "");  
  
    if (activeKey) {  
      const selectedIndex = panels.findIndex(panel => {  
        return String(panel.dataset.progressModuleKey || "") === activeKey;  
      });  
  
      if (selectedIndex >= 0) {  
        return selectedIndex;  
      }  
    }  
  
    return 0;  
  }  
  
  const step = getStudentProgressSwipePanelStep(targetTrack);  
  const index = Math.round((targetTrack.scrollLeft || 0) / step);  
  
  return Math.max(0, Math.min(panelCount - 1, index));  
}  
  
function getStudentProgressSwipeActiveModuleKey() {  
  const track = getStudentProgressSwipeTrack();  
  const panels = getStudentProgressSwipePanels(track);  
  const activeIndex = getStudentProgressSwipeActiveIndex(track);  
  const activePanel = panels[activeIndex];  
  
  return activePanel ? String(activePanel.dataset.progressModuleKey || "") : "";  
}  
  
function updateStudentProgressHeaderMetrics() {  
  const screen = document.getElementById("progress-subjects-screen");  
  const header = screen && screen.querySelector  
    ? screen.querySelector("[data-student-progress-active-module-header]")  
    : null;  
  
  if (!screen || !header || typeof header.getBoundingClientRect !== "function") {  
    return false;  
  }  
  
  const height = Math.ceil(header.getBoundingClientRect().height || 0);  
  if (height > 0) {  
    screen.style.setProperty("--student-progress-active-header-height", `${height}px`);  
  }  
  
  return height > 0;  
}  
  
function scheduleStudentProgressHeaderMetricsUpdate() {  
  const runUpdate = () => updateStudentProgressHeaderMetrics();  
  
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {  
    window.requestAnimationFrame(runUpdate);  
  } else if (typeof window !== "undefined" && typeof window.setTimeout === "function") {  
    window.setTimeout(runUpdate, 0);  
  } else {  
    runUpdate();  
  }  
  
  return true;  
}  
  
function centerStudentProgressActiveNumber(numberButton) {
  if (!numberButton || typeof numberButton.closest !== "function") {
    return false;
  }

  const nav = numberButton.closest("[data-progress-number-nav], [data-progress-swipe-dots]");

  if (!nav || typeof nav.scrollTo !== "function" || typeof nav.getBoundingClientRect !== "function" || typeof numberButton.getBoundingClientRect !== "function") {
    return false;
  }

  const navRect = nav.getBoundingClientRect();
  const buttonRect = numberButton.getBoundingClientRect();
  const targetLeft = (buttonRect.left - navRect.left + (nav.scrollLeft || 0)) - ((nav.clientWidth || 0) - (buttonRect.width || 0)) / 2;
  const maxLeft = Math.max(0, (nav.scrollWidth || 0) - (nav.clientWidth || 0));
  const left = Math.max(0, Math.min(maxLeft, targetLeft || 0));

  nav.scrollTo({ left, top: 0, behavior: "smooth" });
  return true;
}

function updateStudentProgressSwipeDots() {  
  const screen = document.getElementById("progress-subjects-screen");  
  const track = getStudentProgressSwipeTrack();  
  
  if (!screen || !track) {  
    return false;  
  }  
  
  const dots = Array.from(screen.querySelectorAll("[data-progress-swipe-dots] [data-progress-panel-index]"));  
  if (!dots.length) {  
    return false;  
  }  
  
  const activeIndex = getStudentProgressSwipeActiveIndex(track);  
  const panels = getStudentProgressSwipePanels(track);  
  const panelCount = panels.length;
  const activePanel = panels[activeIndex];  
  
  if (activePanel) {  
    currentStudentSubjectKey = String(activePanel.dataset.progressModuleKey || currentStudentSubjectKey || "");  
    track.dataset.progressActiveModuleKey = currentStudentSubjectKey;  
  }  
  
  let activeNumberButton = null;

  dots.forEach((dot, fallbackIndex) => {  
    const dotIndex = Number(dot.dataset.progressPanelIndex || fallbackIndex || 0);  
    const isActive = dotIndex === activeIndex;  
    dot.classList.toggle("is-active", isActive);  
    dot.setAttribute("aria-current", isActive ? "true" : "false");  
    if (isActive) {
      activeNumberButton = dot;
    }
  });

  screen.querySelectorAll("[data-progress-step-direction]").forEach(button => {
    const direction = button.dataset.progressStepDirection || "";
    const shouldDisable = panelCount <= 1 ||
      (direction === "previous" && activeIndex <= 0) ||
      (direction === "next" && activeIndex >= panelCount - 1);

    button.disabled = shouldDisable;
    button.setAttribute("aria-disabled", shouldDisable ? "true" : "false");
  });

  panels.forEach((panel, index) => {
    const distance = Math.abs(index - activeIndex);
    panel.classList.toggle("is-active", distance === 0);
    panel.classList.toggle("is-adjacent", distance === 1);
    panel.classList.toggle("is-far", distance > 1);
    panel.setAttribute("aria-current", distance === 0 ? "true" : "false");
  });

  if (activeNumberButton) {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => centerStudentProgressActiveNumber(activeNumberButton));
    } else {
      centerStudentProgressActiveNumber(activeNumberButton);
    }
  }
  
  updateStudentProgressFrozenHeader();  
  scheduleStudentProgressHeaderMetricsUpdate();  
  updateStudentProgressTaskScrollState();  
  
  return true;  
}  
  
function scrollStudentProgressSwipeToIndex(panelIndex, options = {}) {  
  const track = getStudentProgressSwipeTrack();  
  const panels = getStudentProgressSwipePanels(track);  
  const requestedIndex = Number(panelIndex || 0);  
  const index = Math.max(0, Math.min(panels.length - 1, Number.isFinite(requestedIndex) ? requestedIndex : 0));  
  
  if (!track || !panels[index]) {  
    return false;  
  }  
  
  const behavior = options.behavior || "smooth";  
  const panel = panels[index];  
  const isMobile = isStudentProgressMobileSwipeViewport();
  
  currentStudentSubjectKey = String(panel.dataset.progressModuleKey || currentStudentSubjectKey || "");  
  track.dataset.progressActiveModuleKey = currentStudentSubjectKey;
  track.dataset.progressActiveIndex = String(index);
  track.style.setProperty("--student-progress-active-index", String(index));
  
  if (!isMobile) {
    moveStudentProgressStepperTrackToIndex(index, { behavior });
    resetStudentProgressViewportScroll();
    updateStudentProgressSwipeDots();

    const finishStepperUpdate = () => {
      moveStudentProgressStepperTrackToIndex(index, { behavior });
      updateStudentProgressSwipeDots();
    };

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(finishStepperUpdate);
    } else {
      window.setTimeout(finishStepperUpdate, 0);
    }

    return true;
  }
  
  // V76.7.2: scroll only the Student Progress rail. Avoid panel.scrollIntoView(),
  // because iOS Safari can satisfy it by horizontally scrolling the page/body.
  // V89.6.1.1: mobile keeps the existing left-aligned card focus; medium/large
  // uses the same safe scrollLeft method, but centres the selected card in the
  // controlled stepper viewport.
  const trackRect = track.getBoundingClientRect ? track.getBoundingClientRect() : null;  
  const panelRect = panel.getBoundingClientRect ? panel.getBoundingClientRect() : null;  
  const rawLeft = trackRect && panelRect  
    ? (panelRect.left - trackRect.left + (track.scrollLeft || 0))  
    : (panel.offsetLeft - track.offsetLeft);  
  const panelWidth = panelRect && panelRect.width ? panelRect.width : (panel.offsetWidth || 0);
  const trackWidth = trackRect && trackRect.width ? trackRect.width : (track.clientWidth || 0);
  const maxLeft = Math.max(0, (track.scrollWidth || 0) - (track.clientWidth || 0));  
  const centredLeft = rawLeft - Math.max(0, (trackWidth - panelWidth) / 2);
  const targetLeft = Math.max(0, Math.min(maxLeft, isMobile ? (rawLeft || 0) : (centredLeft || 0)));  
  
  if (typeof track.scrollTo === "function") {  
    track.scrollTo({  
      left: targetLeft,  
      top: 0,  
      behavior  
    });  
  } else {  
    track.scrollLeft = targetLeft;  
  }  
  
  // Keep the app/page itself anchored at the left edge. The nested rail owns  
  // horizontal movement; the document should never remain horizontally panned.  
  resetStudentProgressViewportScroll();  
  
  updateStudentProgressSwipeDots();  
  
  const finishUpdate = () => {
    // Some desktop Safari/WebKit builds are conservative with programmatic
    // scrolling when overflow is visually hidden. Keep the rail's stored active
    // index authoritative and nudge the scroll position once if needed.
    if (!isMobile && Math.abs((track.scrollLeft || 0) - targetLeft) > 2) {
      track.scrollLeft = targetLeft;
    }
    updateStudentProgressSwipeDots();
  };

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {  
    window.requestAnimationFrame(finishUpdate);  
  } else {  
    window.setTimeout(finishUpdate, 0);  
  }  
  
  return true;  
}  
  
function scrollStudentProgressSwipeToModule(moduleKey, options = {}) {  
  const track = getStudentProgressSwipeTrack();  
  const panels = getStudentProgressSwipePanels(track);  
  
  if (!track || !panels.length) {  
    return false;  
  }  
  
  const key = String(moduleKey || "");  
  const index = Math.max(0, panels.findIndex(panel => {  
    return String(panel.dataset.progressModuleKey || "") === key;  
  }));  
  
  return scrollStudentProgressSwipeToIndex(index, options);  
}  

function stepStudentProgressSwipeBy(delta, options = {}) {
  const track = getStudentProgressSwipeTrack();
  const panels = getStudentProgressSwipePanels(track);
  const step = Number(delta || 0);

  if (!track || !panels.length || !Number.isFinite(step) || step === 0) {
    return false;
  }

  const activeIndex = getStudentProgressSwipeActiveIndex(track);
  const nextIndex = Math.max(0, Math.min(panels.length - 1, activeIndex + step));

  if (nextIndex === activeIndex) {
    updateStudentProgressSwipeDots();
    return false;
  }

  return scrollStudentProgressSwipeToIndex(nextIndex, options);
}

function isStudentProgressMobileSwipeViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }

  return window.matchMedia("(max-width: 767px)").matches;
}
  
let studentProgressSwipeResizeHandlerBound = false;  
  
function bindStudentProgressSwipeResizeHandler() {  
  if (studentProgressSwipeResizeHandlerBound === true) {  
    return true;  
  }  
  
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {  
    return false;  
  }  
  
  studentProgressSwipeResizeHandlerBound = true;  
  window.addEventListener("resize", () => {
    const track = getStudentProgressSwipeTrack();

    if (track && !isStudentProgressMobileSwipeViewport()) {
      syncStudentProgressStepperViewport(track);
      const activeIndex = getStudentProgressSwipeActiveIndex(track);
      scrollStudentProgressSwipeToIndex(activeIndex, { behavior: "auto" });
    } else {
      syncStudentProgressStepperViewport(track);
      updateStudentProgressSwipeDots();
    }

    scheduleStudentProgressHeaderMetricsUpdate();
    updateStudentProgressTaskScrollState();
  }, { passive: true });  
  return true;  
}  
  
function bindStudentProgressSwipeDragControls(track) {
  if (!track || track.dataset.progressSwipeDragBound === "true") {
    return !!track;
  }

  if (typeof window === "undefined" || typeof track.addEventListener !== "function") {
    return false;
  }

  track.dataset.progressSwipeDragBound = "true";

  let pointerId = null;
  let startX = 0;
  let startLeft = 0;
  let didMove = false;

  const endDrag = () => {
    pointerId = null;
    track.classList.remove("is-pointer-dragging");

    if (didMove) {
      didMove = false;
      updateStudentProgressSwipeDots();
    }
  };

  track.addEventListener("pointerdown", event => {
    if (!event || event.pointerType === "touch" || !isStudentProgressMobileSwipeViewport()) {
      return;
    }

    const target = event.target;
    if (target && typeof target.closest === "function" && target.closest("button, a, input, select, textarea, [data-progress-action]")) {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX || 0;
    startLeft = track.scrollLeft || 0;
    didMove = false;
    track.classList.add("is-pointer-dragging");

    if (typeof track.setPointerCapture === "function") {
      try {
        track.setPointerCapture(pointerId);
      } catch (error) {
        // Pointer capture is only a convenience for desktop dragging.
      }
    }
  });

  track.addEventListener("pointermove", event => {
    if (pointerId === null || event.pointerId !== pointerId) {
      return;
    }

    const deltaX = (event.clientX || 0) - startX;

    if (Math.abs(deltaX) > 2) {
      didMove = true;
      track.scrollLeft = startLeft - deltaX;
      event.preventDefault();
    }
  });

  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("lostpointercapture", endDrag);

  return true;
}

function bindStudentProgressSwipeWheelControls(track) {
  if (!track || track.dataset.progressSwipeWheelBound === "true") {
    return !!track;
  }

  if (typeof track.addEventListener !== "function") {
    return false;
  }

  track.dataset.progressSwipeWheelBound = "true";

  track.addEventListener("wheel", event => {
    if (!event || event.ctrlKey || event.metaKey) {
      return;
    }

    const deltaX = Number(event.deltaX || 0);
    const deltaY = Number(event.deltaY || 0);
    const isMostlyHorizontal = Math.abs(deltaX) >= Math.abs(deltaY);
    const shouldUseVerticalAsHorizontal = event.shiftKey && Math.abs(deltaY) > 0;

    // V89.6.6.1: medium/large Progress uses native scrolling on the
    // PaneViewport, so do not block horizontal touchpad/wheel movement.
    // The PaneViewport scroll listener keeps the Stepper active index synced.
    if (!isStudentProgressMobileSwipeViewport()) {
      return;
    }

    const maxLeft = Math.max(0, (track.scrollWidth || 0) - (track.clientWidth || 0));

    if (maxLeft <= 2) {
      return;
    }

    const target = event.target;
    const verticalScroller = target && typeof target.closest === "function"
      ? target.closest(".student-progress-module-grid")
      : null;

    if (!isMostlyHorizontal && !shouldUseVerticalAsHorizontal) {
      return;
    }

    if (verticalScroller && !isMostlyHorizontal && !shouldUseVerticalAsHorizontal) {
      return;
    }

    const scrollDelta = isMostlyHorizontal ? deltaX : deltaY;

    if (!scrollDelta) {
      return;
    }

    event.preventDefault();
    track.scrollLeft = Math.max(0, Math.min(maxLeft, (track.scrollLeft || 0) + scrollDelta));

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(updateStudentProgressSwipeDots);
    } else {
      updateStudentProgressSwipeDots();
    }
  }, { passive: false });

  return true;
}


function bindStudentProgressNativeBoundaryGuard(track) {
  const targetTrack = track || getStudentProgressSwipeTrack();
  const viewport = getStudentProgressPaneViewport(targetTrack);

  if (!targetTrack || !viewport || viewport.dataset.progressNativeBoundaryGuardBound === "true") {
    return !!targetTrack;
  }

  if (typeof viewport.addEventListener !== "function") {
    return false;
  }

  viewport.dataset.progressNativeBoundaryGuardBound = "true";

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartLeft = 0;

  const getViewportMaxLeft = () => {
    return Math.max(0, (viewport.scrollWidth || 0) - (viewport.clientWidth || 0));
  };

  const isAtBoundary = (direction, startLeft) => {
    if (isStudentProgressMobileSwipeViewport()) {
      return false;
    }

    const maxLeft = getViewportMaxLeft();

    if (maxLeft <= 2) {
      return false;
    }

    const currentLeft = viewport.scrollLeft || 0;
    const referenceLeft = Number.isFinite(startLeft) ? startLeft : currentLeft;
    const atStart = currentLeft <= 2 && referenceLeft <= 4;
    const atEnd = currentLeft >= maxLeft - 2 && referenceLeft >= maxLeft - 4;

    return (direction < 0 && atStart) || (direction > 0 && atEnd);
  };

  const absorbBoundaryEscape = (event, direction) => {
    const maxLeft = getViewportMaxLeft();

    if (direction < 0) {
      viewport.scrollLeft = 0;
    } else if (direction > 0) {
      viewport.scrollLeft = maxLeft;
    }

    if (event && event.cancelable && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    if (event && typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }

    return true;
  };

  viewport.addEventListener("wheel", event => {
    if (!event || isStudentProgressMobileSwipeViewport()) {
      return;
    }

    const deltaX = Number(event.deltaX || 0);
    const deltaY = Number(event.deltaY || 0);

    if (!deltaX || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    const direction = deltaX < 0 ? -1 : 1;

    if (isAtBoundary(direction)) {
      absorbBoundaryEscape(event, direction);
    }
  }, { passive: false });

  viewport.addEventListener("touchstart", event => {
    if (!event || isStudentProgressMobileSwipeViewport()) {
      return;
    }

    const touch = event.touches && event.touches[0];

    if (!touch) {
      return;
    }

    touchStartX = touch.clientX || 0;
    touchStartY = touch.clientY || 0;
    touchStartLeft = viewport.scrollLeft || 0;
  }, { passive: true });

  viewport.addEventListener("touchmove", event => {
    if (!event || isStudentProgressMobileSwipeViewport()) {
      return;
    }

    const touch = event.touches && event.touches[0];

    if (!touch) {
      return;
    }

    const deltaX = (touch.clientX || 0) - touchStartX;
    const deltaY = (touch.clientY || 0) - touchStartY;
    const horizontalIntent = Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.08;

    if (!horizontalIntent) {
      return;
    }

    // Finger moving right at the first module would ask the scroll container to
    // go past scrollLeft 0. Finger moving left at the final module would ask it
    // to go past max scrollLeft. Absorb only those edge escapes; normal module
    // swipes remain fully native.
    const direction = deltaX > 0 ? -1 : 1;

    if (isAtBoundary(direction, touchStartLeft)) {
      absorbBoundaryEscape(event, direction);
    }
  }, { passive: false });

  return true;
}


function bindStudentProgressNativeScrollSnap(track) {
  const targetTrack = track || getStudentProgressSwipeTrack();
  const viewport = getStudentProgressPaneViewport(targetTrack);

  if (!targetTrack || !viewport || viewport.dataset.progressNativeScrollBound === "true") {
    return !!targetTrack;
  }

  if (typeof viewport.addEventListener !== "function") {
    return false;
  }

  viewport.dataset.progressNativeScrollBound = "true";
  viewport.classList.add("student-progress-pane-viewport--native-scroll");

  let settleTimer = 0;
  let lastScrollLeft = viewport.scrollLeft || 0;
  let scrollStartLeft = lastScrollLeft;
  let scrollStartIndex = getStudentProgressSwipeActiveIndex(targetTrack);
  let scrollDirection = 0;

  const getClampedIndex = value => {
    const panels = getStudentProgressSwipePanels(targetTrack);
    const numberValue = Number(value);
    return Math.max(0, Math.min(
      Math.max(0, panels.length - 1),
      Number.isFinite(numberValue) ? numberValue : 0
    ));
  };

  const getStudentProgressNativeStep = () => {
    const panels = getStudentProgressSwipePanels(targetTrack);

    if (panels.length > 1) {
      const firstPanel = panels[0];
      const secondPanel = panels[1];
      const firstCenter = (firstPanel.offsetLeft || 0) + ((firstPanel.offsetWidth || firstPanel.clientWidth || 0) / 2);
      const secondCenter = (secondPanel.offsetLeft || 0) + ((secondPanel.offsetWidth || secondPanel.clientWidth || 0) / 2);
      const measuredStep = Math.abs(secondCenter - firstCenter);

      if (measuredStep > 1) {
        return measuredStep;
      }
    }

    const computed = typeof window !== "undefined" && typeof window.getComputedStyle === "function"
      ? window.getComputedStyle(targetTrack)
      : null;
    const cssStep = computed ? parseFloat(computed.getPropertyValue("--student-progress-card-step")) : 0;

    return Number.isFinite(cssStep) && cssStep > 1
      ? cssStep
      : Math.max(1, viewport.clientWidth || targetTrack.clientWidth || 1);
  };

  const finishNativeScrollSync = () => {
    if (isStudentProgressMobileSwipeViewport()) {
      return false;
    }

    syncStudentProgressStepperViewport(targetTrack);

    const panels = getStudentProgressSwipePanels(targetTrack);

    if (!panels.length) {
      return false;
    }

    const nativeIndex = getStudentProgressNativeViewportActiveIndex(targetTrack);
    const startIndex = getClampedIndex(scrollStartIndex);
    const currentLeft = viewport.scrollLeft || 0;
    const totalDelta = currentLeft - scrollStartLeft;
    const direction = Math.abs(totalDelta) > 1 ? Math.sign(totalDelta) : scrollDirection;
    const step = getStudentProgressNativeStep();
    const threshold = Math.max(18, Math.min(90, step * 0.16));
    let nextIndex = nativeIndex;

    // V89.6.6.2: native scroll-snap can settle back on the current card if the
    // scroll listener keeps the old active index too eagerly. Accept both
    // scrollLeft increases and decreases after the scroll settles, using the
    // measured scroll direction as a tie-breaker when the nearest card has not
    // changed yet. This specifically restores backward/right swipe movement.
    if (Math.abs(totalDelta) >= threshold) {
      if (direction < 0 && nativeIndex >= startIndex) {
        nextIndex = Math.max(0, startIndex - 1);
      } else if (direction > 0 && nativeIndex <= startIndex) {
        nextIndex = Math.min(panels.length - 1, startIndex + 1);
      }
    }

    syncStudentProgressNativeViewportActiveIndex(targetTrack, {
      index: nextIndex,
      update: false
    });
    updateStudentProgressSwipeDots();

    if (nextIndex !== nativeIndex) {
      moveStudentProgressStepperTrackToIndex(nextIndex, {
        behavior: "smooth"
      });
    }

    lastScrollLeft = viewport.scrollLeft || 0;
    scrollStartLeft = lastScrollLeft;
    scrollStartIndex = nextIndex;
    scrollDirection = 0;
    return true;
  };

  viewport.addEventListener("scroll", () => {
    if (isStudentProgressMobileSwipeViewport()) {
      return;
    }

    const currentScrollLeft = viewport.scrollLeft || 0;

    if (!settleTimer) {
      scrollStartLeft = lastScrollLeft;
      scrollStartIndex = getStudentProgressSwipeActiveIndex(targetTrack);
      scrollDirection = 0;
    }

    if (currentScrollLeft > lastScrollLeft + 0.5) {
      scrollDirection = 1;
    } else if (currentScrollLeft < lastScrollLeft - 0.5) {
      scrollDirection = -1;
    }

    lastScrollLeft = currentScrollLeft;

    if (settleTimer && typeof window !== "undefined" && typeof window.clearTimeout === "function") {
      window.clearTimeout(settleTimer);
    }

    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
      settleTimer = window.setTimeout(() => {
        settleTimer = 0;
        finishNativeScrollSync();
      }, 170);
    } else {
      finishNativeScrollSync();
    }
  }, { passive: true });

  return true;
}


function bindStudentProgressSwipeControls() {  
  const track = getStudentProgressSwipeTrack();  
  
  if (!track) {  
    return false;  
  }  
  
  bindStudentProgressSwipeResizeHandler();  
  bindStudentProgressSwipeDragControls(track);
  bindStudentProgressNativeScrollSnap(track);
  bindStudentProgressNativeBoundaryGuard(track);
  bindStudentProgressSwipeWheelControls(track);
  
  if (track.dataset.progressSwipeBound !== "true") {  
    track.dataset.progressSwipeBound = "true";  
    let pendingFrame = 0;  
  
    track.addEventListener("scroll", () => {  
      if (!isStudentProgressMobileSwipeViewport()) return;
      if (pendingFrame) return;  

      pendingFrame = window.requestAnimationFrame(() => {  
        pendingFrame = 0;  
        updateStudentProgressSwipeDots();  
      });  
    }, { passive: true });  
  }  
  
  window.setTimeout(updateStudentProgressSwipeDots, 0);  
  return true;  
}  
  
  
function getStudentProgressModuleByKey(modules, moduleKey) {  
  const list = Array.isArray(modules) ? modules : getStudentProgressModules();  
  const key = String(moduleKey || "");  
  
  if (!list.length) {  
    return null;  
  }  
  
  return list.find(module => String(module.subjectid || "") === key) || list[0];  
}  
  
  
  
function renderStudentProgressCloseButton() {
  return `
    <button
      type="button"
      class="student-progress-close-btn"
      data-progress-action="close-student-progress"
      aria-label="Save and close Student Progress"
      title="Save and close"
    >
      <span class="app-icon app-icon-xclose" aria-hidden="true"></span>
      <span class="visually-hidden">Save and close Student Progress</span>
    </button>
  `;
}  
  
function renderStudentProgressModuleEditToggle(module) {
  if (!module) return "";
  const moduleKey = String(module.subjectid || "");
  const isEditing = isStudentProgressModuleEditing(moduleKey);
  const label = isEditing ? "Save completed changes" : "Click to edit";
  const visibleLabel = isEditing ? "SAVE" : "CLICK TO EDIT";

  return `
    <button
      type="button"
      class="student-progress-module-edit-toggle${isEditing ? " is-editing" : ""}"
      data-progress-action="toggle-student-progress-module-edit"
      data-progress-module-key="${escapeForAttribute(moduleKey)}"
      aria-label="${label}"
      aria-pressed="${isEditing ? "true" : "false"}"
      title="${isEditing ? "Save" : "Click to edit"}"
    >
      <span class="app-icon ${isEditing ? "save-mode-icon" : "student-edit-icon"}" aria-hidden="true"></span>
      <span class="student-progress-module-edit-label" aria-hidden="true">${visibleLabel}</span>
    </button>
  `;
}  
  
function renderStudentProgressActiveModuleHeaderContent(module) {
  if (!module) return "";
  const title = module.subjectname || module.modulename || "Progress";
  return `
    <div class="student-progress-panel-module-title-block">
      <h2 class="student-progress-panel-module-title">${escapeHtml(title)}</h2>
    </div>
    ${renderStudentProgressModuleEditToggle(module)}
  `;
}  
  
  
function renderStudentProgressActiveModuleHeader(modules, activeModuleKey) {
  // V89.1: Student Progress no longer renders a separate global active-module header.
  // Each module panel carries its own header/card label so mobile, medium, and large
  // screens use the same card structure.
  return "";
}  
  
function renderStudentProgressPanelModuleHeader(module) {  
  if (!module) return "";  
  
  const moduleKey = String(module.subjectid || "");  
  const title = module.subjectname || module.modulename || "Progress";  
  
  return `  
    <div  
      class="student-progress-panel-module-header student-progress-header-panel"  
      data-student-progress-panel-module-header="${escapeForAttribute(moduleKey)}"  
      aria-label="${escapeForAttribute(title)} module progress"  
    >  
      ${renderStudentProgressActiveModuleHeaderContent(module)}  
    </div>  
  `;  
}  
  
function renderStudentProgressStepperArrow(direction, isDisabled) {
  const normalizedDirection = Number(direction || 0) < 0 ? -1 : 1;
  const isPrevious = normalizedDirection < 0;
  const label = isPrevious ? "Previous module" : "Next module";
  const iconClass = isPrevious ? "app-icon-left" : "app-icon-right";

  return `
    <button
      type="button"
      class="student-progress-stepper-arrow student-progress-stepper-arrow--${isPrevious ? "previous" : "next"}"
      data-progress-action="step-student-progress-module"
      data-progress-step="${normalizedDirection}"
      data-progress-step-direction="${isPrevious ? "previous" : "next"}"
      aria-label="${label}"
      title="${label}"
      ${isDisabled ? 'disabled aria-disabled="true"' : 'aria-disabled="false"'}
    >
      <span class="app-icon ${iconClass}" aria-hidden="true"></span>
      <span class="visually-hidden">${label}</span>
    </button>
  `;
}

function getStudentProgressModuleIndexFromKey(modules, activeModuleKey) {
  const list = Array.isArray(modules) ? modules : [];
  const activeKey = String(activeModuleKey || "");

  if (!list.length) {
    return 0;
  }

  const index = activeKey
    ? list.findIndex(module => String(module.subjectid || "") === activeKey)
    : 0;

  return index >= 0 ? index : 0;
}

function renderStudentProgressGlobalActions(modules, activeModuleKey) {
  const list = Array.isArray(modules) ? modules : [];
  const activeIndex = getStudentProgressModuleIndexFromKey(list, activeModuleKey || (list[0] && list[0].subjectid));
  const numbersMarkup = renderStudentProgressSwipeDots(list, activeModuleKey);
  const hasMultipleModules = list.length > 1;

  return `
    <div class="student-progress-global-actions student-progress-global-swipe" data-progress-global-actions data-student-progress-global-swipe>
      <div class="student-progress-top-control-row student-progress-stepper-row">
        ${renderStudentProgressStepperArrow(-1, !hasMultipleModules || activeIndex <= 0)}
        <div class="student-progress-top-control-dots student-progress-stepper-number-strip" data-progress-number-nav>
          ${numbersMarkup}
        </div>
        ${renderStudentProgressStepperArrow(1, !hasMultipleModules || activeIndex >= list.length - 1)}
      </div>
    </div>
  `;
}  
  
/* Compatibility wrapper retained for older calls. The current layout no longer  
   uses a separate global frozen module heading or legacy percentage indicator. */  
function renderStudentProgressFrozenHeader(modules, activeModuleKey) {  
  return renderStudentProgressGlobalActions(modules, activeModuleKey);  
}  
  
function updateStudentProgressModuleIndicators(moduleKey) {  
  const modules = getStudentProgressModules();  
  const activeModuleKey = String(  
    moduleKey ||  
    getStudentProgressSwipeActiveModuleKey() ||  
    currentStudentSubjectKey ||  
    (modules[0] && modules[0].subjectid) ||  
    ""  
  );  
  const activeModule = getStudentProgressModuleByKey(modules, activeModuleKey);  
  const header = document.querySelector("#progress-subjects-screen [data-student-progress-active-module-header]");  
  
  if (header && activeModule) {  
    header.innerHTML = `${renderStudentProgressCloseButton()}${renderStudentProgressActiveModuleHeaderContent(activeModule)}`;  
  }  
  
  document  
    .querySelectorAll("#progress-subjects-screen [data-student-progress-panel-module-header]")  
    .forEach(panelHeader => {  
      const panelModule = getStudentProgressModuleByKey(  
        modules,  
        panelHeader.dataset.studentProgressPanelModuleHeader || ""  
      );  
  
      if (panelModule) {  
        panelHeader.innerHTML = renderStudentProgressActiveModuleHeaderContent(panelModule);  
      }  
    });  
  
  scheduleStudentProgressHeaderMetricsUpdate();  
  return true;  
}  
  
function updateStudentProgressFrozenHeader() {  
  const track = getStudentProgressSwipeTrack();  
  const modules = getStudentProgressModules();  
  
  if (!track || !modules.length) {  
    return false;  
  }  
  
  const activeIndex = getStudentProgressSwipeActiveIndex(track);  
  const panels = getStudentProgressSwipePanels(track);  
  const activePanel = panels[activeIndex];  
  const activeModuleKey = activePanel ? String(activePanel.dataset.progressModuleKey || "") : String(modules[0].subjectid || "");  
  const activeModule = getStudentProgressModuleByKey(modules, activeModuleKey);  
  
  if (!activeModule) {  
    return false;  
  }  
  
  currentStudentSubjectKey = String(activeModule.subjectid || activeModuleKey || currentStudentSubjectKey || "");  
  setDomText("progress-subjects-title", activeModule.subjectname || "Progress");  
  updateStudentProgressModuleIndicators(currentStudentSubjectKey);  
  
  return true;  
}  
  
function updateStudentProgressTaskScrollState() {  
  document.querySelectorAll("#progress-subjects-screen .student-progress-task-scroll").forEach(container => {  
    const hasVerticalScroll = (container.scrollHeight || 0) > (container.clientHeight || 0) + 3;  
    container.classList.toggle("has-vertical-scroll", hasVerticalScroll);  
  });  
  
  return true;  
}  
  
function renderStudentProgressSwipeDots(modules, activeModuleKey) {  
  if (!modules || modules.length < 1) {  
    return "";  
  }  
  
  const activeKey = String(activeModuleKey || modules[0].subjectid || "");  
  
  return `  
    <div class="m4l-progress-swipe-dots student-progress-swipe-dots student-progress-module-numbers" data-progress-swipe-dots aria-label="Progress modules">  
      ${modules.map((module, index) => {  
        const moduleKey = String(module.subjectid || "");  
        const isActive = moduleKey === activeKey || (!activeKey && index === 0);  
        const numberLabel = String(index + 1);
  
        return `  
          <button  
            type="button"  
            class="m4l-progress-swipe-dot student-progress-swipe-dot student-progress-module-number${isActive ? " is-active" : ""}"  
            data-progress-action="scroll-student-progress-module"  
            data-progress-panel-index="${index}"  
            aria-label="Show module ${numberLabel}: ${escapeForAttribute(module.subjectname || `module ${numberLabel}`)}"  
            aria-current="${isActive ? "true" : "false"}"  
          >${escapeHtml(numberLabel)}</button>  
        `;  
      }).join("")}  
    </div>  
  `;  
}  
  
  
function formatStudentProgressDateNote(value) {  
  const raw = String(value || "").trim();  
  if (!raw) return "";  
  
  const parsed = new Date(raw);  
  if (!Number.isNaN(parsed.getTime())) {  
    return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short" });  
  }  
  
  return raw.length > 12 ? raw.slice(0, 12) : raw;  
}  
  
function renderStudentProgressFocusedDateNote(value) {  
  const label = formatStudentProgressDateNote(value);  
  return label ? `<span class="student-progress-grid-date-note">${escapeHtml(label)}</span>` : "";  
}

function renderAdminProgressStatusIndicator(type, isOn, options = {}) {
  const normalizedType = type === "verify" ? "verify" : "complete";
  const onClass = normalizedType === "verify" ? "status-tick-verified" : "status-tick-complete";
  const onLabel = normalizedType === "verify" ? "Verified" : "Completed";
  const offLabel = normalizedType === "verify" ? "Not verified" : "Not complete";
  const mutedClass = options.muted ? " is-muted" : "";

  if (isOn) {
    return `
      <span class="status-tick ${onClass}" aria-hidden="true">${M4L_PROGRESS_TICK}</span>
      <span class="visually-hidden">${onLabel}</span>
    `;
  }

  return `
    <span class="app-icon student-edit-icon admin-progress-status-edit-icon${mutedClass}" aria-hidden="true"></span>
    <span class="visually-hidden">${offLabel}</span>
  `;
}

function isAdminIndividualProgressPendingControl(actionEl) {
  return !!(actionEl && actionEl.closest && actionEl.closest(".admin-individual-progress-shell"));
}

function getAdminIndividualProgressModuleEditKey(source) {
  if (!source) return "";

  if (source.dataset && source.dataset.progressModuleKey) {
    return String(source.dataset.progressModuleKey || "");
  }

  if (source.closest) {
    const panel = source.closest(".admin-individual-progress-module-panel");
    if (panel && panel.dataset) {
      return String(panel.dataset.progressModuleKey || "");
    }
  }

  return "";
}

function isAdminIndividualProgressModuleEditing(moduleKey) {
  return adminIndividualProgressModuleEditState[String(moduleKey || "")] === true;
}

function hasAdminIndividualProgressEditingModule() {
  return Object.keys(adminIndividualProgressModuleEditState || {}).some(key => adminIndividualProgressModuleEditState[key] === true);
}

function syncAdminIndividualProgressModuleEditDom() {
  const hasEditingModule = hasAdminIndividualProgressEditingModule();

  document.querySelectorAll(".admin-individual-progress-shell").forEach(shell => {
    shell.classList.toggle("has-editing-module", hasEditingModule);
    shell.classList.toggle("is-editing", hasEditingModule);
    shell.classList.toggle("is-viewing", !hasEditingModule);
  });

  document.querySelectorAll(".admin-individual-progress-module-panel").forEach(panel => {
    const moduleKey = getAdminIndividualProgressModuleEditKey(panel);
    const isEditing = isAdminIndividualProgressModuleEditing(moduleKey);
    panel.classList.toggle("is-editing", isEditing);
    panel.classList.toggle("is-viewing", !isEditing);
  });

  document.querySelectorAll('[data-progress-action="toggle-admin-individual-progress-edit"]').forEach(button => {
    const moduleKey = getAdminIndividualProgressModuleEditKey(button);
    updateAdminIndividualProgressEditButton(button, isAdminIndividualProgressModuleEditing(moduleKey));
  });

  return true;
}

function canToggleAdminIndividualProgressCell(actionEl) {
  if (!isAdminIndividualProgressPendingControl(actionEl)) {
    return true;
  }

  const panel = actionEl.closest && actionEl.closest(".admin-individual-progress-module-panel");
  return !!(panel && panel.classList.contains("is-editing"));
}

function setAdminIndividualProgressEditMode(isEditing) {
  // V90.8.7.3: Individual Progress no longer uses a global edit mode.
  // Keep this compatibility wrapper for older call sites, but apply it to the
  // currently active module only so behaviour matches Student Progress.
  const panels = getAdminIndividualProgressPanels();
  const activePanel = panels[clampAdminIndividualProgressModuleIndex(adminIndividualProgressActiveModuleIndex, panels)] || panels[0];
  const moduleKey = getAdminIndividualProgressModuleEditKey(activePanel);
  return setAdminIndividualProgressModuleEditState(moduleKey, isEditing);
}

function setAdminIndividualProgressModuleEditState(moduleKey, isEditing) {
  const key = String(moduleKey || "");
  if (!key) return false;

  if (isEditing) {
    adminIndividualProgressModuleEditState[key] = true;
  } else {
    delete adminIndividualProgressModuleEditState[key];
  }

  adminIndividualProgressEditMode = hasAdminIndividualProgressEditingModule();
  return syncAdminIndividualProgressModuleEditDom();
}

function updateAdminIndividualProgressEditButton(button, isEditing) {
  if (!button) return false;

  button.disabled = false;
  button.classList.toggle("is-editing", !!isEditing);
  button.classList.remove("is-saving", "has-save-error");
  button.setAttribute("aria-pressed", isEditing ? "true" : "false");
  button.setAttribute("aria-label", isEditing ? "Save this module's progress changes" : "Click to edit this module");
  button.setAttribute("title", isEditing ? "Save" : "Click to edit");
  button.innerHTML = `
    <span class="app-icon app-icon-small ${isEditing ? "save-mode-icon" : "student-edit-icon"}" aria-hidden="true"></span>
    <span class="student-progress-module-edit-label">${isEditing ? "Save" : "Click to edit"}</span>
  `;
  return true;
}

function setAdminIndividualProgressEditButtonSaving(button, label = "Saving...") {
  if (!button) return false;

  button.disabled = true;
  button.classList.add("is-editing", "is-saving");
  button.classList.remove("has-save-error");
  button.setAttribute("aria-pressed", "true");
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  button.innerHTML = `
    <span class="app-icon app-icon-small save-mode-icon" aria-hidden="true"></span>
    <span class="student-progress-module-edit-label">${escapeHtml(label)}</span>
  `;
  return true;
}

function setAdminIndividualProgressEditButtonError(button, label = "Save failed") {
  if (!button) return false;

  button.disabled = false;
  button.classList.add("is-editing", "has-save-error");
  button.classList.remove("is-saving");
  button.setAttribute("aria-pressed", "true");
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  button.innerHTML = `
    <span class="app-icon app-icon-small save-mode-icon" aria-hidden="true"></span>
    <span class="student-progress-module-edit-label">${escapeHtml(label)}</span>
  `;
  return true;
}

function finishAdminIndividualProgressEdit(button) {
  const moduleKey = getAdminIndividualProgressModuleEditKey(button);

  if (!hasProgressPendingUpdates()) {
    setAdminIndividualProgressModuleEditState(moduleKey, false);
    return true;
  }

  const statusToken = beginProgressLoadStatus("Saving progress...");
  setAdminIndividualProgressEditButtonSaving(button, "Saving...");
  const saveStarted = startAdminProgressBackgroundSave({ confirm: false });

  if (saveStarted === false) {
    failProgressLoadStatus(statusToken, "Save cancelled");
    setAdminIndividualProgressEditButtonError(button, "Save failed");
    return false;
  }

  setAdminIndividualProgressModuleEditState(moduleKey, false);

  if (saveStarted && typeof saveStarted.then === "function") {
    saveStarted.then(saved => {
      if (saved) {
        endProgressLoadStatus(statusToken, "Progress saved");
      } else {
        failProgressLoadStatus(statusToken, "Save failed");
      }
    }).catch(err => {
      console.error("Could not save Admin Individual Progress changes in the background:", err);
      failProgressLoadStatus(statusToken, "Save failed");
    });
  } else {
    endProgressLoadStatus(statusToken, "Progress saved");
  }

  return true;
}

function toggleAdminIndividualProgressEdit(button) {
  const moduleKey = getAdminIndividualProgressModuleEditKey(button);

  if (isAdminIndividualProgressModuleEditing(moduleKey)) {
    finishAdminIndividualProgressEdit(button);
    return true;
  }

  return setAdminIndividualProgressModuleEditState(moduleKey, true);
}

function renderAdminIndividualProgressEditToggle(moduleKey) {
  const key = String(moduleKey || "");
  const isEditing = isAdminIndividualProgressModuleEditing(key);

  return `
    <button
      type="button"
      class="student-progress-module-edit-toggle admin-individual-progress-edit-toggle${isEditing ? " is-editing" : ""}"
      data-progress-action="toggle-admin-individual-progress-edit"
      data-progress-module-key="${escapeForAttribute(key)}"
      aria-label="${isEditing ? "Save this module's progress changes" : "Click to edit this module"}"
      aria-pressed="${isEditing ? "true" : "false"}"
      title="${isEditing ? "Save" : "Click to edit"}"
    >
      <span class="app-icon app-icon-small ${isEditing ? "save-mode-icon" : "student-edit-icon"}" aria-hidden="true"></span>
      <span class="student-progress-module-edit-label">${isEditing ? "Save" : "Click to edit"}</span>
    </button>
  `;
}

function isStudentProgressModuleEditing(moduleKey) {  
  return studentProgressModuleEditState[String(moduleKey || "")] === true;  
}  
  
function setStudentProgressModuleEditState(moduleKey, isEditing) {  
  const key = String(moduleKey || "");  
  if (!key) return false;  
  
  studentProgressModuleEditState[key] = !!isEditing;  
  
  document.querySelectorAll(`[data-progress-module-key="${escapeCssAttributeValue(key)}"]`).forEach(panel => {  
    panel.classList.toggle("is-editing", !!isEditing);  
    panel.classList.toggle("is-viewing", !isEditing);  
  });  
  
  document.querySelectorAll(`[data-progress-action="toggle-student-progress-module-edit"][data-progress-module-key="${escapeForAttribute(key)}"]`).forEach(button => {  
    updateStudentProgressModuleEditButton(button, !!isEditing);  
  });  
  
  return true;  
}  
  
function updateStudentProgressModuleEditButton(button, isEditing) {
  if (!button) return false;

  const label = isEditing ? "Save completed changes" : "Click to edit";
  const visibleLabel = isEditing ? "SAVE" : "CLICK TO EDIT";

  button.disabled = false;
  button.classList.toggle("is-editing", !!isEditing);
  button.classList.remove("is-saving", "has-save-error");
  button.setAttribute("aria-pressed", isEditing ? "true" : "false");
  button.setAttribute("aria-label", label);
  button.setAttribute("title", isEditing ? "Save" : "Click to edit");
  button.innerHTML = `
    <span class="app-icon ${isEditing ? "save-mode-icon" : "student-edit-icon"}" aria-hidden="true"></span>
    <span class="student-progress-module-edit-label" aria-hidden="true">${visibleLabel}</span>
  `;
  return true;
}  
  
function setStudentProgressModuleEditButtonSaving(button, label = "Saving...") {
  if (!button) return false;

  button.disabled = true;
  button.classList.add("is-editing", "is-saving");
  button.classList.remove("has-save-error");
  button.setAttribute("aria-pressed", "true");
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  button.innerHTML = `
    <span class="app-icon save-mode-icon" aria-hidden="true"></span>
    <span class="student-progress-module-edit-label" aria-hidden="true">SAVING</span>
  `;
  return true;
}  
  
function setStudentProgressModuleEditButtonError(button, label = "Save failed") {
  if (!button) return false;

  button.disabled = false;
  button.classList.add("is-editing", "has-save-error");
  button.classList.remove("is-saving");
  button.setAttribute("aria-pressed", "true");
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  button.innerHTML = `
    <span class="app-icon save-mode-icon" aria-hidden="true"></span>
    <span class="student-progress-module-edit-label" aria-hidden="true">RETRY</span>
  `;
  return true;
}  
  
async function finishStudentProgressModuleEdit(button, key) {
  const moduleKey = String(key || button?.dataset?.progressModuleKey || getStudentProgressSwipeActiveModuleKey() || "");

  if (!moduleKey) {
    return false;
  }

  // V90.9.1: the save icon acts as "done editing". Return to the
  // Click-to-edit state immediately while the reliable autosave queue drains
  // in the background and the global saving pill remains visible.
  setStudentProgressModuleEditState(moduleKey, false);

  try {
    const saved = await flushStudentProgressAutoSave();

    if (saved === false && hasProgressPendingUpdates()) {
      setStudentProgressModuleEditState(moduleKey, true);
      const retryButton = document.querySelector(`[data-progress-action="toggle-student-progress-module-edit"][data-progress-module-key="${escapeCssAttributeValue(moduleKey)}"]`);
      setStudentProgressModuleEditButtonError(retryButton || button, "Save failed");
      return false;
    }

    return true;
  } catch (err) {
    console.error("Could not save student progress before finishing edit mode:", err);
    setStudentProgressModuleEditState(moduleKey, true);
    const retryButton = document.querySelector(`[data-progress-action="toggle-student-progress-module-edit"][data-progress-module-key="${escapeCssAttributeValue(moduleKey)}"]`);
    setStudentProgressModuleEditButtonError(retryButton || button, "Save failed");
    return false;
  }
}  
  
function toggleStudentProgressModuleEdit(button) {  
  const key = String(button?.dataset?.progressModuleKey || getStudentProgressSwipeActiveModuleKey() || "");  
  if (!key) return false;  
  
  if (isStudentProgressModuleEditing(key)) {  
    finishStudentProgressModuleEdit(button, key);  
    return true;  
  }  
  
  return setStudentProgressModuleEditState(key, true);  
}  
  
function canToggleStudentProgressGridCell(actionEl) {  
  if (!actionEl) return true;  
  const panel = actionEl.closest(".student-progress-module-panel");  
  if (!panel) return true;  
  return panel.classList.contains("is-editing");  
}  
  
function renderStudentProgressVerifiedStatusContent(task, isVerified) {  
  if (!isVerified) {  
    return `<span class="student-progress-grid-empty-status" aria-hidden="true"></span><span class="visually-hidden">Not verified yet</span>`;  
  }  
  
  return `  
    <span class="status-tick status-tick-verified" aria-hidden="true">${M4L_PROGRESS_TICK}</span>  
    <span class="visually-hidden">Teacher verified</span>  
    ${renderStudentProgressFocusedDateNote(task.verifieddate)}  
  `;  
}  
  
function renderStudentProgressCompletedStatusContent(task, isComplete) {  
  if (isComplete) {  
    return `  
      <span class="status-tick status-tick-complete" aria-hidden="true">${M4L_PROGRESS_TICK}</span>  
      <span class="visually-hidden">Completed</span>  
      ${renderStudentProgressFocusedDateNote(task.completeddate)}  
    `;  
  }  
  
  return `  
    <span class="app-icon student-edit-icon student-progress-grid-edit-affordance" aria-hidden="true"></span>  
    <span class="visually-hidden">Click to mark complete</span>  
  `;  
}  
  
function renderStudentProgressTaskTableHeader() {  
  return `  
    <div class="student-progress-grid-row student-progress-grid-heading-row" role="row" aria-hidden="true">  
      <div class="student-progress-grid-task-heading" role="columnheader" aria-label="Task"></div>  
      <div class="student-progress-grid-status-heading" role="columnheader"><span class="visually-hidden">Completed</span></div>  
      <div class="student-progress-grid-status-heading" role="columnheader"><span class="visually-hidden">Teacher verified</span></div>  
    </div>  
  `;  
}  
  
function renderStudentProgressTaskTableRow(task) {  
  const pending = progressPendingUpdates[task.studenttaskid] || {};  
  
  const completeStatus = pending.completeStatus !== undefined  
    ? pending.completeStatus  
    : task.completestatus;  
  
  const isComplete = isStatusOn(completeStatus);  
  const isVerified = isStatusOn(task.verifystatus);  
  const taskName = task.taskname || "Untitled Task";  
  
  return `  
    <div class="student-progress-grid-row" role="row">  
      <div class="student-progress-grid-task-name" role="cell">${escapeHtml(taskName)}</div>  
  
      <button  
        type="button"  
        class="student-progress-grid-status-cell student-progress-grid-complete-cell${isComplete ? " is-on" : ""}"  
        data-progress-action="toggle-student-subject-task"  
        data-studenttaskid="${escapeForAttribute(task.studenttaskid)}"  
        data-complete="${isComplete ? "false" : "true"}"  
        data-complete-date="${escapeForAttribute(task.completeddate || "")}"  
        aria-label="${isComplete ? "Completed" : "Click to mark complete"}: ${escapeForAttribute(taskName)}"  
      >  
        ${renderStudentProgressCompletedStatusContent(task, isComplete)}  
      </button>  
  
      <button  
        type="button"  
        class="student-progress-grid-status-cell student-progress-grid-verified-cell is-read-only${isVerified ? " is-on" : ""}"  
        aria-label="${isVerified ? "Teacher verified" : "Not verified yet"}: ${escapeForAttribute(taskName)}"  
      >  
        ${renderStudentProgressVerifiedStatusContent(task, isVerified)}  
      </button>  
    </div>  
  `;  
}  
  
function renderStudentProgressTaskTable(module) {  
  const title = module.subjectname || module.modulename || "Module";  
  const taskRowsHtml = [...module.tasks]  
    .sort(sortByModuleThenTask)  
    .map(task => renderStudentProgressTaskTableRow(task))  
    .join("");  
  
  return `  
    <section class="admin-progress-task-card admin-progress-individual-module-card student-progress-module-task-card student-progress-module-grid-card student-progress-task-list-panel" aria-label="${escapeForAttribute(title)} progress tasks">  
      <div class="student-progress-module-grid" role="table" aria-label="${escapeForAttribute(title)} progress tasks">  
        ${renderStudentProgressTaskTableHeader()}  
        ${taskRowsHtml}  
      </div>  
    </section>  
  `;  
}  
  
function renderStudentProgressModulePanel(module, index, moduleCount) {  
  const moduleKey = String(module.subjectid || "");  
  const title = module.subjectname || `Module ${index + 1}`;  
  
  return `  
    <section  
      class="m4l-progress-swipe-panel m4l-progress-swipe-panel--full m4l-responsive-swipe-panel student-progress-module-panel${isStudentProgressModuleEditing(moduleKey) ? " is-editing" : " is-viewing"}"  
      data-progress-swipe-panel  
      data-progress-panel-index="${index}"  
      data-progress-module-key="${escapeForAttribute(moduleKey)}"  
      aria-label="${escapeForAttribute(title)}"  
    >  
      ${renderStudentProgressPanelModuleHeader(module)}  
      ${renderStudentProgressTaskTable(module)}  
    </section>  
  `;  
}  
  
function renderStudentSubjectProgress(options = {}) {
  const container = getDomElement("progress-subjects-list");
  if (!container) {
    console.warn("Missing progress-subjects-list container.");
    return;
  }

  const modules = getStudentProgressModules();

  if (modules.length === 0) {
    setDomHtml(container, `<p class="helper-text">No tasks assigned yet.</p>`);
    return;
  }

  const preferredModuleKey = String(
    options.moduleKey ||
    getStudentProgressSwipeActiveModuleKey() ||
    currentStudentSubjectKey ||
    modules[0].subjectid ||
    ""
  );

  if (!currentStudentSubjectKey) {
    currentStudentSubjectKey = preferredModuleKey;
  }

  setDomHtml(container, `
    <div class="m4l-progress-swipe-shell student-progress-swipe-shell" data-progress-swipe="progress-subjects-screen">
      ${renderStudentProgressGlobalActions(modules, preferredModuleKey)}
      <div class="student-progress-pane-viewport" data-progress-pane-viewport>
        <div
          id="student-progress-swipe-track"
          class="m4l-progress-swipe-track m4l-progress-swipe-track--full m4l-responsive-swipe-track student-progress-swipe-track"
          data-progress-swipe-track
          data-progress-active-index="${getStudentProgressModuleIndexFromKey(modules, preferredModuleKey)}"
          aria-label="Student progress modules"
        >
          ${modules.map((module, index) => renderStudentProgressModulePanel(module, index, modules.length)).join("")}
        </div>
      </div>
    </div>
  `);

  bindProgressUiHandlers(container);
  bindStudentProgressSwipeControls();
  updateStudentProgressFrozenHeader();
  scheduleStudentProgressHeaderMetricsUpdate();

  const preferredIndex = getStudentProgressModuleIndexFromKey(modules, preferredModuleKey);
  const settleProgressPaneLayout = () => {
    updateStudentProgressHeaderMetrics();
    updateStudentProgressTaskScrollState();

    if (!isStudentProgressMobileSwipeViewport()) {
      syncStudentProgressStepperViewport(getStudentProgressSwipeTrack());
      scrollStudentProgressSwipeToIndex(preferredIndex, {
        behavior: options.scrollBehavior || "auto"
      });
      return;
    }

    if (preferredModuleKey && preferredModuleKey !== String(modules[0].subjectid || "")) {
      scrollStudentProgressSwipeToModule(preferredModuleKey, {
        behavior: options.scrollBehavior || "auto"
      });
    } else {
      updateStudentProgressSwipeDots();
    }
  };

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => window.setTimeout(settleProgressPaneLayout, 0));
  } else {
    window.setTimeout(settleProgressPaneLayout, 0);
  }
}  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
function renderStudentTaskLinkButtons(task) {  
  const links = [];  
  
  // Note: The audio block has been completely removed from here  
  // so it no longer generates the small inline "▶" button.  
  
  if (task.graphiclink) {  
    links.push({  
      type: "GRAPHIC",  
      label: "▧",  
      title: "Open Graphic",  
      link: task.graphiclink,  
      inline: false  
    });  
  }  
  
  if (task.videolink) {  
    links.push({  
      type: "VIDEO",  
      label: "▶",  
      title: "Play Video",  
      link: task.videolink,  
      inline: true  
    });  
  }  
  
  if (task.pdflink) {  
    links.push({  
      type: "PDF",  
      label: "PDF",  
      title: "Open PDF",  
      link: task.pdflink,  
      inline: false  
    });  
  }  
  
  if (links.length === 0) {  
    return "";  
  }  
  
  const safeTaskId = safeDomId(task.studenttaskid || task.taskid || task.taskname);  
  const buttonsHtml = links.map((item, index) => {  
    const playerId = `student-task-player-${safeTaskId}-${index}`;  
  
    if (item.inline) {  
      return `  
        <button  
          type="button"  
          class="student-task-link-btn"  
          title="${escapeHtml(item.title)}"  
          data-progress-action="toggle-student-task-inline-player"  
          data-player-id="${escapeForAttribute(playerId)}"  
          data-link="${escapeForAttribute(item.link)}"  
          data-type="${escapeForAttribute(item.type)}"  
        >${escapeHtml(item.label)}</button>  
        <div id="${escapeHtml(playerId)}" class="student-task-inline-player hidden"></div>  
      `;  
    }  
  
    return `  
      <button  
        type="button"  
        class="student-task-link-btn"  
        title="${escapeHtml(item.title)}"  
        data-progress-action="open-student-task-external-link"  
        data-link="${escapeForAttribute(item.link)}"  
        data-type="${escapeForAttribute(item.type)}"  
      >${escapeHtml(item.label)}</button>  
    `;  
  }).join("");  
  
  return `<div class="student-task-link-row">${buttonsHtml}</div>`;  
}  
  
  
function toggleStudentTaskInlinePlayer(playerId, link, type) {  
  if (!link) return;  
  
  const player = document.getElementById(playerId);  
  if (!player) return;  
  
  const isHidden = player.classList.contains("hidden");  
  
  document.querySelectorAll(".student-task-inline-player").forEach(item => {  
    if (item.id !== playerId) {  
      item.classList.add("hidden");  
      item.innerHTML = "";  
    }  
  });  
  
  if (!isHidden) {  
    player.classList.add("hidden");  
    player.innerHTML = "";  
    return;  
  }  
  
  const resourceType = String(type || "").toUpperCase();  
  
  if (resourceType === "VIDEO") {  
    player.innerHTML = `  
      <video class="student-task-media-control" controls controlsList="nodownload" preload="metadata">  
        <source src="${escapeForAttribute(link)}" />  
        Your browser cannot play this video file.  
      </video>  
    `;  
  } else {  
    player.innerHTML = `  
      <audio class="student-task-media-control" controls controlsList="nodownload" preload="none">  
        <source src="${escapeForAttribute(link)}" />  
        Your browser cannot play this audio file.  
      </audio>  
    `;  
  }  
  
  player.classList.remove("hidden");  
}  
  
function openStudentTaskExternalLink(link, type) {  
  if (!link) return;  
  
  const resourceType = String(type || "").toUpperCase();  
  
  if (resourceType === "PDF" || isPdfLink(link)) {  
    openPdfResource(link);  
    return;  
  }  
  
  window.open(link, "_blank", "noopener,noreferrer");  
}  
  
  
  
function updateStudentProgressStatusControls(studenttaskid, complete) {  
  const id = String(studenttaskid || "");  
  const isComplete = !!complete;  
  
  if (!id) {  
    return false;  
  }  
  
  let didUpdate = false;  
  
  document  
    .querySelectorAll("#progress-subjects-screen [data-progress-action='toggle-student-subject-task']")  
    .forEach(button => {  
      if (String(button.dataset.studenttaskid || "") !== id) {  
        return;  
      }  
  
      const taskName = button.getAttribute("aria-label")  
        ? String(button.getAttribute("aria-label")).replace(/^Mark (complete|incomplete):\s*/i, "")  
        : "task";  
  
      const dateValue = button.dataset.completeDate || "";  
      button.dataset.complete = isComplete ? "false" : "true";  
      button.classList.toggle("is-on", isComplete);  
      button.setAttribute("aria-label", `${isComplete ? "Mark incomplete" : "Click to mark complete"}: ${taskName}`);  
      button.innerHTML = renderStudentProgressCompletedStatusContent({ completeddate: dateValue }, isComplete);  
      didUpdate = true;  
    });  
  
  return didUpdate;  
}  
  
function finishStudentProgressAllModuleEditStates() {
  Object.keys(studentProgressModuleEditState || {}).forEach(moduleKey => {
    if (studentProgressModuleEditState[moduleKey] === true) {
      setStudentProgressModuleEditState(moduleKey, false);
    }
  });

  return true;
}

function resetStudentProgressSavedModuleEditStates() {
  if (hasProgressPendingUpdates()) {
    return false;
  }

  Object.keys(studentProgressModuleEditState || {}).forEach(moduleKey => {
    if (studentProgressModuleEditState[moduleKey] === true) {
      setStudentProgressModuleEditState(moduleKey, false);
    }
  });

  return true;
}

async function flushStudentProgressAutoSave() {  
  if (studentProgressAutoSaveTimer && typeof window !== "undefined") {  
    window.clearTimeout(studentProgressAutoSaveTimer);  
    studentProgressAutoSaveTimer = 0;  
  }  
  
  if (studentProgressAutoSaveInFlight) {
    studentProgressAutoSaveDrainRequested = true;
    return studentProgressAutoSaveInFlight;
  }

  if (!hasProgressPendingUpdates()) {  
    resetStudentProgressSavedModuleEditStates();
    return true;  
  }  
  
  studentProgressAutoSaveDrainRequested = true;

  studentProgressAutoSaveInFlight = (async () => {
    let allSaved = true;

    while (studentProgressAutoSaveDrainRequested || hasProgressPendingUpdates()) {
      studentProgressAutoSaveDrainRequested = false;

      if (!hasProgressPendingUpdates()) {
        break;
      }

      const saved = await saveProgressPendingChanges({ reload: false, alert: false });

      if (!saved) {
        allSaved = false;
        break;
      }
    }

    if (allSaved && !hasProgressPendingUpdates()) {
      resetStudentProgressSavedModuleEditStates();
    }

    return allSaved;
  })()
    .catch(err => {  
      console.error("Could not auto-save student progress:", err);  
      return false;  
    })  
    .finally(() => {  
      studentProgressAutoSaveInFlight = null;
      studentProgressAutoSaveDrainRequested = false;
    });  
  
  return studentProgressAutoSaveInFlight;  
}  
  
async function closeStudentProgressAndReturnHome(actionEl) {  
  const closeButton = actionEl && actionEl.closest  
    ? actionEl.closest("[data-progress-action='close-student-progress']")  
    : actionEl;  
  
  if (closeButton) {  
    closeButton.disabled = true;  
  }  
  
  try {  
    const saved = await flushStudentProgressAutoSave();  
  
    if (saved === false && hasProgressPendingUpdates()) {  
      alert("Some progress changes may not have saved yet. Please check your connection and try again.");  
      return false;  
    }  
  
    setStudentProgressSectionBodyState(false);  
    showScreen("student-home");  
    return true;  
  } catch (err) {  
    console.error("Could not close Student Progress cleanly:", err);  
    alert(err.message || "Could not save progress before closing.");  
    return false;  
  } finally {  
    if (closeButton) {  
      closeButton.disabled = false;  
    }  
  }  
}  
  
function scheduleStudentProgressAutoSave(delay = 650) {  
  if (typeof window === "undefined") {  
    return false;  
  }  
  
  if (studentProgressAutoSaveTimer) {  
    window.clearTimeout(studentProgressAutoSaveTimer);  
  }  
  
  studentProgressAutoSaveTimer = window.setTimeout(() => {  
    flushStudentProgressAutoSave();  
  }, delay);  
  
  return true;  
}  
  
function toggleStudentSubjectTask(studenttaskid, complete) {  
  if (!studenttaskid) return;  
  
  if (!progressPendingUpdates[studenttaskid]) {  
    progressPendingUpdates[studenttaskid] = {  
      studenttaskid  
    };  
  }  
  
  progressPendingUpdates[studenttaskid].completeStatus = complete ? "YES" : "";  
  
  Object.values(studentSubjectTaskGroups).forEach(subject => {  
    subject.tasks.forEach(task => {  
      if (String(task.studenttaskid) === String(studenttaskid)) {  
        task.completestatus = complete ? "YES" : "";  
      }  
    });  
  });  
  
  if (getStudentProgressSwipeTrack()) {  
    updateStudentProgressStatusControls(studenttaskid, complete);  
    updateStudentProgressModuleIndicators(currentStudentSubjectKey);  
    updateStudentProgressTaskScrollState();  
    scheduleStudentProgressAutoSave();  
    return;  
  }  
  
  renderStudentSubjectTaskList();  
  scheduleStudentProgressAutoSave();  
}  
  
  
async function toggleStudentTask(studenttaskid, complete) {  
  const result = await postProgressUpdatesWithBatchFallback(
    "/api/tasks/update-complete",
    [{ studenttaskid, complete }],
    [{ studenttaskid, complete }],
    "completion"
  );  
  
  if (!result.success) {  
    alert(result.error || "Could not update task.");  
    return;  
  }  
  
  showStudentTasks();  
}  
  
/* =========================  
   TEACHER / ADMIN PROGRESS DRILLDOWN  
========================= */  
  
function normalizeProgressSubject(subject) {  
  const moduleId = subject.moduleid || subject.moduleID || subject.ModuleID || subject.subjectid || subject.SubjectID || "";  
  const moduleName = subject.modulename || subject.moduleName || subject.ModuleName || subject.subjectname || subject.SubjectName || "Module";  
  
  return {  
    ...subject,  
    subjectid: moduleId,  
    subjectname: moduleName,  
    moduleid: moduleId,  
    modulename: moduleName  
  };  
}  
  
function normalizeProgressTask(task) {  
  return {  
    ...task,  
    taskid: getStudentTaskField(task, ["taskid", "taskID", "TaskID", "TaskId"]),  
    taskname: getStudentTaskField(task, ["taskname", "taskName", "TaskName", "Task"], "Untitled Task"),  
    subjectid: getStudentTaskField(task, ["subjectid", "subjectID", "SubjectID", "SubjectId"]),  
    subjectname: getStudentTaskField(task, ["subjectname", "subjectName", "SubjectName", "Subject"], "Other"),  
    moduleid: getStudentTaskField(task, ["moduleid", "moduleID", "ModuleID", "ModuleId"]),  
    modulename: getStudentTaskField(task, ["modulename", "moduleName", "ModuleName", "Module"], "General")  
  };  
}  
  
function normalizeProgressStudentRow(row) {  
  const source = row || {};  
  const normalized = normalizeStudentTask(source);  
  
  return {  
    ...normalized,  
    studenttaskid: getStudentTaskField(source, [  
      "studenttaskid", "studentTaskId", "StudentTaskID", "StudentTaskId"  
    ], normalized.studenttaskid),  
    studentid: getStudentTaskField(source, [  
      "studentid", "studentID", "StudentID", "StudentId"  
    ], normalized.studentid || ""),  
    username: getStudentTaskField(source, [  
      "username", "userName", "Username", "StudentName", "studentName", "Name", "name"  
    ], normalized.username || "Student"),  
    classgroup: getStudentTaskField(source, [  
      "classgroup", "classGroup", "ClassGroup", "Group", "group", "GroupNo", "groupno"  
    ], normalized.classgroup || ""),  
    subjectid: getStudentTaskField(source, [  
      "subjectid", "subjectID", "SubjectID", "SubjectId"  
    ], normalized.subjectid || ""),  
    subjectname: getStudentTaskField(source, [  
      "subjectname", "subjectName", "SubjectName", "Subject"  
    ], normalized.subjectname || "Other"),  
    moduleid: getStudentTaskField(source, [  
      "moduleid", "moduleID", "ModuleID", "ModuleId"  
    ], normalized.moduleid || ""),  
    modulename: getStudentTaskField(source, [  
      "modulename", "moduleName", "ModuleName", "Module"  
    ], normalized.modulename || "General")  
  };  
}  
  
function sortProgressSubjects(a, b) {  
  return sortSubjectGroupsBySubjectId(normalizeProgressSubject(a), normalizeProgressSubject(b));  
}  
  
function sortProgressTasks(a, b) {  
  return sortBySubjectIdThenTask(normalizeProgressTask(a), normalizeProgressTask(b));  
}  
  
const progressState = {  
  contextType: null,  
  classgroup: "ALL",  
  studentid: "ALL",  
  studentName: "",  
  subjectid: "ALL",  
  subjectname: "",  
  taskid: "ALL",  
  taskname: "",  
  fromAdminDashboard: false,  
  activePopoutStudentId: "",  
  activePopoutStudentName: ""  
};  
  
let progressPendingUpdates = {};  
let currentProgressRows = [];  
let adminProgressDashboardModules = [];  
let adminProgressDashboardRows = [];  
let adminProgressIndividualRows = [];  
let adminProgressActiveTaskRows = [];  
let adminProgressPopoutRows = [];  
let adminProgressClassExpandedGroups = Object.create(null);
let adminProgressClassExpandedModules = Object.create(null);

function ensureAdminProgressClassDefaultExpandedModules(modules) {
  const list = Array.isArray(modules) ? modules : [];

  list.forEach(module => {
    const moduleKey = String(getAdminModuleKey(module) || "").trim();

    if (!moduleKey) return;

    if (!Object.prototype.hasOwnProperty.call(adminProgressClassExpandedModules, moduleKey)) {
      adminProgressClassExpandedModules[moduleKey] = true;
    }
  });

  return true;
}
  
const ADMIN_PROGRESS_DASHBOARD_CACHE_KEY = "m4l_admin_progress_dashboard_v77";  
let adminProgressLeaveGuardBound = false;  
let adminProgressBackgroundSaveInFlight = null;  
  
function hasProgressPendingUpdates() {  
  return Object.keys(progressPendingUpdates || {}).length > 0;  
}  
  
function isAdminProgressScreenId(screenId) {  
  return [  
    "progress-report",  
    "progress-subjects-screen",  
    "progress-tasks-screen",  
    "progress-task-students-screen"  
  ].includes(String(screenId || ""));  
}  
  
function setAdminProgressSectionBodyState(screenIdOrActive) {  
  if (typeof document === "undefined" || !document.body) {  
    return false;  
  }  
  
  const isActive = typeof screenIdOrActive === "boolean"  
    ? screenIdOrActive  
    : isAdminProgressScreenId(screenIdOrActive);  
  
  document.body.classList.toggle("is-admin-progress-section", isActive);  
  return isActive;  
}  
  
function readAdminProgressDashboardCache() {  
  if (typeof window === "undefined" || !window.sessionStorage) return null;  
  
  try {  
    const raw = window.sessionStorage.getItem(ADMIN_PROGRESS_DASHBOARD_CACHE_KEY);  
    if (!raw) return null;  
  
    const parsed = JSON.parse(raw);  
    if (!parsed || !Array.isArray(parsed.modules)) return null;  
  
    return {  
      modules: parsed.modules,  
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],  
      savedAt: parsed.savedAt || 0  
    };  
  } catch (err) {  
    console.warn("Could not read admin progress dashboard cache:", err);  
    return null;  
  }  
}  
  
function writeAdminProgressDashboardCache(modules, rows) {  
  if (typeof window === "undefined" || !window.sessionStorage) return false;  
  
  try {  
    window.sessionStorage.setItem(ADMIN_PROGRESS_DASHBOARD_CACHE_KEY, JSON.stringify({  
      savedAt: Date.now(),  
      modules: Array.isArray(modules) ? modules : [],  
      rows: Array.isArray(rows) ? rows : []  
    }));  
    return true;  
  } catch (err) {  
    console.warn("Could not cache admin progress dashboard:", err);  
    return false;  
  }  
}  
  
function clearAdminProgressDashboardCache() {  
  if (typeof window === "undefined" || !window.sessionStorage) return false;  
  
  try {  
    window.sessionStorage.removeItem(ADMIN_PROGRESS_DASHBOARD_CACHE_KEY);  
    return true;  
  } catch (err) {  
    return false;  
  }  
}  
  
function bindAdminProgressSwipeUpClose(element, closeHandler) {  
  // V76.6.3: Progress screens close only through their visible X buttons.  
  // Do not attach swipe-up-to-close to headers, panels, backdrops, or scrollable lists.  
  return false;  
}  
  
  
/* V90.9.5: obsolete AIG selector/view-switching helpers removed. */

/* V87.3: in-screen Progress loading cards removed. The global user-band status strip now owns Progress loading feedback. */

function startAdminProgressBackgroundSave(options = {}) {  
  const hasPending = hasProgressPendingUpdates();
  const existingSave = adminProgressBackgroundSaveInFlight ||
    (typeof adminProgressClassMatrixSaveInFlight !== "undefined" ? adminProgressClassMatrixSaveInFlight : null);

  if (!hasPending) {
    return existingSave || null;
  }

  const pendingSnapshot = { ...(progressPendingUpdates || {}) };
  const pendingCount = Object.keys(pendingSnapshot).length;

  if (options.confirm !== false) {
    const shouldSave = window.confirm(
      "You have unsaved progress changes. Press OK to save in the background and continue, or Cancel to stay."
    );

    if (!shouldSave) {
      return false;
    }
  }

  if (adminProgressBackgroundSaveInFlight) {
    return adminProgressBackgroundSaveInFlight;
  }

  const restorePendingSnapshot = () => {
    progressPendingUpdates = {
      ...pendingSnapshot,
      ...(progressPendingUpdates || {})
    };
  };

  const sourcePromise = existingSave || saveProgressPendingChanges({ reload: false, alert: false });

  adminProgressBackgroundSaveInFlight = Promise.resolve(sourcePromise)
    .then(saved => {
      if (saved) {
        clearAdminProgressDashboardCache();
        refreshAdminProgressDashboardCacheInBackground({
          render: !!document.querySelector("#progress-report.active")
        });
        return true;
      }

      restorePendingSnapshot();
      alert(`${pendingCount} progress ${pendingCount === 1 ? "change" : "changes"} could not be saved. Please retry from Progress.`);
      return false;
    })
    .catch(err => {
      restorePendingSnapshot();
      console.error("Could not save progress changes in the background:", err);
      alert(err.message || "Could not save progress changes in the background.");
      return false;
    })
    .finally(() => {
      adminProgressBackgroundSaveInFlight = null;
    });

  return adminProgressBackgroundSaveInFlight;
}  
  
async function saveAdminProgressPendingForClose() {  
  const saveStarted = startAdminProgressBackgroundSave({ confirm: true });
  return saveStarted !== false;
}  
  
async function requestCloseAdminProgressTaskScreen() {  
  const saveStarted = startAdminProgressBackgroundSave({ confirm: true });
  if (saveStarted === false) {
    return false;
  }
  closeAdminProgressStudentPopout({ silent: true });  
  await showProgressReport();  
  return true;  
}  
  
async function requestCloseAdminProgressStudentPopout() {  
  const saveStarted = startAdminProgressBackgroundSave({ confirm: true });
  if (saveStarted === false) {
    return false;
  }
  closeAdminProgressStudentPopout({ silent: true });  
  return true;  
}  
  
function bindAdminProgressLeaveGuard() {  
  if (adminProgressLeaveGuardBound === true) return true;  
  if (typeof window === "undefined") return false;  
  
  adminProgressLeaveGuardBound = true;  
  
  if (typeof window.addEventListener === "function") {  
    window.addEventListener("beforeunload", event => {  
      if (!hasProgressPendingUpdates() && !adminProgressBackgroundSaveInFlight) return;  
      event.preventDefault();  
      event.returnValue = "";  
    });  
  }  
  
  if (typeof window.showScreen !== "function" || window.showScreen.__m4lAdminProgressGuard === true) {  
    return true;  
  }  
  
  const originalShowScreen = window.showScreen;  
  
  const guardedShowScreen = function guardedShowScreen(screenId, ...args) {  
    const targetScreenId = String(screenId || "");  
    const activeScreen = document.querySelector(".screen.active");  
    const activeScreenId = activeScreen ? String(activeScreen.id || "") : "";  
  
    const leavingProgress = isAdminProgressScreenId(activeScreenId) &&  
      !isAdminProgressScreenId(targetScreenId) &&  
      hasProgressPendingUpdates();  
  
    if (!leavingProgress) {  
      const screenChanged = originalShowScreen.call(this, screenId, ...args);  
      setAdminProgressSectionBodyState(targetScreenId);  
      return screenChanged;  
    }  
  
    const shouldSave = window.confirm(  
      "You have unsaved progress changes. Press OK to save in the background and continue, or Cancel to stay."  
    );  
  
    if (!shouldSave) {  
      return false;  
    }  
  
    const saveStarted = startAdminProgressBackgroundSave({ confirm: false });

    if (saveStarted === false) {
      return false;
    }

    const screenChanged = originalShowScreen.call(this, screenId, ...args);
    setAdminProgressSectionBodyState(targetScreenId);
    return screenChanged;  
  };  
  
  guardedShowScreen.__m4lAdminProgressGuard = true;  
  window.showScreen = guardedShowScreen;  
  return true;  
}  
  
async function showProgressReport() {  
  setAdminProgressSectionBodyState("progress-report");  
  setProgressScreensForAdmin();  
  prepareAdminProgressMonitor();  
  
  const selectedClassGroup = "ALL";  
  
  progressState.contextType = selectedClassGroup === "ALL" ? "class" : "group";  
  progressState.classgroup = selectedClassGroup;  
  progressState.studentid = "ALL";  
  progressState.studentName = "";  
  progressState.subjectid = "ALL";  
  progressState.subjectname = "";  
  progressState.taskid = "ALL";  
  progressState.taskname = "";  
  progressState.fromAdminDashboard = true;  
  progressState.activePopoutStudentId = "";  
  progressState.activePopoutStudentName = "";  
  progressPendingUpdates = {};  
  adminIndividualProgressEditMode = false;  
  currentProgressRows = [];  
  adminProgressDashboardRows = [];  
  adminProgressIndividualRows = [];  
  adminProgressActiveTaskRows = [];  
  adminProgressPopoutRows = [];  
  
  setDomHtml("admin-progress-dashboard", "");  
  showScreen("progress-report");  
  await loadAdminProgressDashboard();  
}  
  

function prepareAdminProgressMonitor() {  
  const screen = document.getElementById("progress-report");  
  if (!screen) return;  
  
  bindAdminProgressLeaveGuard();  
  screen.classList.add("progress-selector-screen", "admin-progress-screen");  
  
  const header = screen.querySelector(".nav-header");  
  if (header) {  
    header.classList.add("admin-progress-landing-header");  
    header.innerHTML = `<h2>Progress</h2>`;  
  }  
  
  // V71.1 keeps the landing page clean: no Home icon and no instruction text.  
  // V71 replaces the old selector cards with native Netflix-style module shelves.  
  // Keep the old selector markup harmless if an older admin index is deployed.  
  screen.querySelectorAll(".dashboard-section").forEach(section => {  
    section.classList.add("hidden");  
  });  
  
  if (!document.getElementById("admin-progress-dashboard")) {  
    screen.insertAdjacentHTML("beforeend", `  
      <div id="admin-progress-dashboard" class="admin-progress-dashboard"></div>  
    `);  
  }  
}  
  

async function fetchAdminProgressDashboardData() {  
  const overview = await apiPost("/api/progress/task-detail", {  
    studentid: "ALL",  
    classgroup: "ALL",  
    subjectid: "ALL",  
    taskid: "ALL"  
  }, state.token);  
  
  if (!overview.success) {  
    throw new Error(overview.error || "Could not load class progress.");  
  }  
  
  const overviewRows = Array.isArray(overview.students)  
    ? overview.students.map(normalizeProgressStudentRow)  
    : [];  
  
  let tasks = Array.isArray(overview.tasks)  
    ? overview.tasks.map(normalizeProgressTask)  
    : [];  
  
  const subjects = Array.isArray(overview.subjects)  
    ? overview.subjects.map(normalizeProgressSubject).sort(sortProgressSubjects)  
    : [];  
  
  if (tasks.length === 0 && subjects.length > 0) {  
    const taskResults = await Promise.all(subjects.map(subject => {  
      return apiPost("/api/progress/task-detail", {  
        studentid: "ALL",  
        classgroup: "ALL",  
        subjectid: subject.subjectid || "ALL",  
        taskid: "ALL"  
      }, state.token).catch(err => ({ success: false, error: err.message, tasks: [] }));  
    }));  
  
    tasks = taskResults  
      .filter(result => result && result.success && Array.isArray(result.tasks))  
      .flatMap(result => result.tasks.map(normalizeProgressTask));  
  }  
  
  if (tasks.length === 0 && overviewRows.length > 0) {  
    tasks = buildAdminTaskSummariesFromRows(overviewRows);  
  }  
  
  return {  
    rows: overviewRows,  
    modules: buildAdminProgressModules(tasks, overviewRows)  
  };  
}  
  
async function refreshAdminProgressDashboardCacheInBackground(options = {}) {  
  try {  
    const fresh = await fetchAdminProgressDashboardData();  
    adminProgressDashboardRows = fresh.rows;  
    adminProgressDashboardModules = fresh.modules;  
    writeAdminProgressDashboardCache(fresh.modules, fresh.rows);  
  
    if (options.render === true) {  
      renderAdminProgressDashboard(fresh.modules);  
    }  
  
    return fresh;  
  } catch (err) {  
    console.warn("Could not refresh admin progress dashboard cache:", err);  
    return null;  
  }  
}  
  
  
function getAdminProgressRowsForScope(group, rows = adminProgressDashboardRows) {  
  const groupKey = String(group || "ALL");  
  
  return (Array.isArray(rows) ? rows : [])  
    .map(normalizeProgressStudentRow)  
    .filter(row => {  
      if (String(row.classgroup || "").trim() === "0") return false;  
      if (groupKey === "ALL") return true;  
      return String(row.classgroup || "") === groupKey;  
    });  
}  
  
function buildAdminProgressModulesForScope(group, rows = adminProgressDashboardRows) {  
  const groupKey = String(group || "ALL");  
  const scopedRows = getAdminProgressRowsForScope(groupKey, rows);  
  const scopedTasks = buildAdminTaskSummariesFromRows(scopedRows);  
  
  return buildAdminProgressModules(scopedTasks, scopedRows).map(module => ({  
    ...module,  
    tasks: (module.tasks || []).map(task => ({  
      ...task,  
      classgroup: groupKey  
    }))  
  }));  
}  
  
function renderAdminProgressDashboardForScope(group) {  
  // V90.8.7.2: legacy Group Progress pages/screens are no longer an active
  // Progress destination. Any scoped render request is normalized to the clean
  // All/Class landing while preserving the completed Class/Group data model.
  const groupKey = "ALL";  
  const modules = adminProgressDashboardRows.length > 0  
    ? buildAdminProgressModulesForScope(groupKey, adminProgressDashboardRows)  
    : adminProgressDashboardModules.map(module => ({  
        ...module,  
        tasks: (module.tasks || []).map(task => ({ ...task, classgroup: "ALL" }))  
      }));  
  
  adminProgressDashboardModules = modules;  
  renderAdminProgressDashboard(modules);  
  return modules.length > 0;  
}  
  
async function loadAdminProgressDashboard() {  
  const dashboard = getDomElement("admin-progress-dashboard");  
  if (!dashboard) {  
    console.warn("Missing admin-progress-dashboard container.");  
    return;  
  }  
  
  const cached = readAdminProgressDashboardCache();  
  
  if (cached && Array.isArray(cached.modules) && cached.modules.length > 0) {  
    adminProgressDashboardRows = cached.rows.map(normalizeProgressStudentRow);  
    adminProgressDashboardModules = cached.modules;  
    renderAdminProgressDashboardForScope("ALL");  
    refreshAdminProgressDashboardCacheInBackground({ render: true });  
    return;  
  }  
  
  setDomHtml(dashboard, "");  
  const statusToken = beginProgressLoadStatus("Loading progress...");

  try {  
    const fresh = await fetchAdminProgressDashboardData();  
    adminProgressDashboardRows = fresh.rows;  
    adminProgressDashboardModules = fresh.modules;  
    writeAdminProgressDashboardCache(fresh.modules, fresh.rows);  
    renderAdminProgressDashboardForScope("ALL");  
    endProgressLoadStatus(statusToken, "Progress loaded");
  } catch (err) {  
    failProgressLoadStatus(statusToken, "Progress load failed");
    console.error("Could not load admin progress dashboard:", err);  
    setDomHtml(dashboard, `<p class="error-message">${escapeHtml(err.message || "Could not load class progress.")}</p>`);  
  }  
}  
  

function getAdminTaskKey(row) {  
  return String(row.taskid || row.taskname || "");  
}  
  
function getAdminModuleKey(row) {  
  return String(row.moduleid || row.subjectid || row.modulename || row.subjectname || "General");  
}  
  
function getAdminModuleName(row) {  
  return String(row.modulename || row.subjectname || "General");  
}  
  
function getAdminProgressRowCount(rows) {  
  return Array.isArray(rows) ? rows.length : 0;  
}  
  
function buildAdminTaskSummariesFromRows(rows) {  
  const taskMap = {};  
  
  (Array.isArray(rows) ? rows : [])  
    .map(normalizeProgressStudentRow)  
    .filter(row => String(row.classgroup || "").trim() !== "0")  
    .forEach(row => {  
      const taskKey = getAdminTaskKey(row);  
      if (!taskKey) return;  
  
      if (!taskMap[taskKey]) {  
        taskMap[taskKey] = {  
          taskid: row.taskid,  
          taskname: row.taskname || "Untitled Task",  
          subjectid: row.subjectid || row.moduleid || "ALL",  
          subjectname: row.subjectname || row.modulename || "General",  
          moduleid: row.moduleid || row.subjectid || "",  
          modulename: row.modulename || row.subjectname || "General",  
          rows: []  
        };  
      }  
  
      taskMap[taskKey].rows.push(row);  
    });  
  
  return Object.values(taskMap).map(task => ({  
    ...task,  
    studentCount: getAdminProgressRowCount(task.rows)  
  }));  
}  
  
function findAdminDashboardTask(subjectid, taskid, taskname) {  
  const targetSubject = String(subjectid || "");  
  const targetTaskId = String(taskid || "");  
  const targetTaskName = String(taskname || "");  
  
  for (const module of adminProgressDashboardModules || []) {  
    const moduleMatches = !targetSubject || targetSubject === "ALL" ||  
      String(module.subjectid || "") === targetSubject ||  
      String(module.moduleid || "") === targetSubject ||  
      String(module.subjectname || "") === targetSubject ||  
      String(module.modulename || "") === targetSubject;  
  
    const task = (module.tasks || []).find(item => {  
      const taskMatches = (targetTaskId && String(item.taskid || "") === targetTaskId) ||  
        (targetTaskName && String(item.taskname || "") === targetTaskName);  
      return taskMatches && (moduleMatches || !targetSubject || targetSubject === "ALL");  
    });  
  
    if (task) return task;  
  }  
  
  return null;  
}  
  
function getAdminCachedRowsForTask(taskid, taskname, subjectid) {  
  const targetTaskId = String(taskid || "");  
  const targetTaskName = String(taskname || "");  
  const targetSubject = String(subjectid || "");  
  
  return (adminProgressDashboardRows || [])  
    .map(normalizeProgressStudentRow)  
    .filter(row => {  
      const rowTaskId = String(row.taskid || "");  
      const rowTaskName = String(row.taskname || "");  
      const rowSubjectId = String(row.subjectid || "");  
      const rowSubjectName = String(row.subjectname || "");  
      const rowModuleId = String(row.moduleid || "");  
      const rowModuleName = String(row.modulename || "");  
  
      const taskMatches = (targetTaskId && rowTaskId === targetTaskId) ||  
        (targetTaskName && rowTaskName === targetTaskName);  
  
      if (!taskMatches) return false;  
  
      if (!targetSubject || targetSubject === "ALL") return true;  
  
      return rowSubjectId === targetSubject ||  
        rowSubjectName === targetSubject ||  
        rowModuleId === targetSubject ||  
        rowModuleName === targetSubject;  
    });  
}  
  
function getAdminFallbackRowsForActiveTask() {  
  const activeRows = Array.isArray(adminProgressActiveTaskRows)  
    ? adminProgressActiveTaskRows.map(normalizeProgressStudentRow)  
    : [];  
  
  if (activeRows.length > 0) {  
    return activeRows;  
  }  
  
  return getAdminCachedRowsForTask(  
    progressState.taskid,  
    progressState.taskname,  
    progressState.subjectid  
  );  
}  
  
function buildAdminProgressModules(tasks, rows) {  
  const rowsByTask = {};  
  
  (Array.isArray(rows) ? rows : [])  
    .map(normalizeProgressStudentRow)  
    .filter(row => String(row.classgroup || "").trim() !== "0")  
    .forEach(row => {  
      const taskKey = getAdminTaskKey(row);  
      if (!taskKey) return;  
      if (!rowsByTask[taskKey]) rowsByTask[taskKey] = [];  
      rowsByTask[taskKey].push(row);  
    });  
  
  const moduleMap = {};  
  
  (Array.isArray(tasks) ? tasks : [])  
    .map(normalizeProgressTask)  
    .filter(task => task.taskid || task.taskname)  
    .forEach(task => {  
      const taskKey = getAdminTaskKey(task);  
      const summaryRows = rowsByTask[taskKey] || task.rows || [];  
      const studentTaskCount = getAdminProgressRowCount(summaryRows);  
      const moduleKey = getAdminModuleKey(task);  
      const moduleName = getAdminModuleName(task);  
      const subjectid = task.subjectid || task.moduleid || moduleKey;  
      const subjectname = task.subjectname || task.modulename || moduleName;  
  
      if (!moduleMap[moduleKey]) {  
        moduleMap[moduleKey] = {  
          moduleid: task.moduleid || task.subjectid || moduleKey,  
          modulename: moduleName,  
          subjectid,  
          subjectname,  
          tasks: []  
        };  
      }  
  
      moduleMap[moduleKey].tasks.push({  
        ...task,  
        subjectid,  
        subjectname,  
        moduleid: task.moduleid || moduleKey,  
        modulename: moduleName,  
        rows: Array.isArray(summaryRows) ? summaryRows.map(normalizeProgressStudentRow) : [],  
        studentCount: task.studentCount || studentTaskCount  
      });  
    });  
  
  return Object.values(moduleMap)  
    .map(module => {  
      const moduleKey = getAdminModuleKey(module);  
      const moduleRows = (Array.isArray(rows) ? rows : [])  
        .map(normalizeProgressStudentRow)  
        .filter(row => getAdminModuleKey(row) === moduleKey && String(row.classgroup || "").trim() !== "0");  
      return {  
        ...module,  
        moduleStudentTaskCount: getAdminProgressRowCount(moduleRows),  
        tasks: module.tasks.sort(sortProgressTasks)  
      };  
    })  
    .sort(sortModuleGroupsByModuleId);  
}  
  
  
function shouldRenderAdminProgressClassOverview() {  
  // V90.9.5: AIG view switching is removed; Admin Progress always renders the Class grid.  
  return true;  
}  
  
function getAdminProgressRowsFromModules(modules) {  
  const rows = [];  
  
  (Array.isArray(modules) ? modules : []).forEach(module => {  
    (Array.isArray(module.tasks) ? module.tasks : []).forEach(task => {  
      if (Array.isArray(task.rows)) {  
        rows.push(...task.rows.map(normalizeProgressStudentRow));  
      }  
    });  
  });  
  
  return rows;  
}  
  
function buildAdminProgressClassOverviewModel(modules, rows) {  
  const sourceRows = (Array.isArray(rows) && rows.length > 0)  
    ? rows.map(normalizeProgressStudentRow)  
    : getAdminProgressRowsFromModules(modules);  
  
  const activeRows = sourceRows.filter(row => String(row.classgroup || "").trim() !== "0");  
  const moduleMap = {};  
  
  (Array.isArray(modules) ? modules : []).forEach(module => {  
    const moduleKey = getAdminModuleKey(module);  
    if (!moduleKey) return;  
  
    const tasksByKey = {};  
    (Array.isArray(module.tasks) ? module.tasks : []).forEach(task => {  
      const normalizedTask = normalizeProgressTask(task);  
      const taskKey = getAdminTaskKey(normalizedTask);  
      if (!taskKey || tasksByKey[taskKey]) return;  
      tasksByKey[taskKey] = normalizedTask;  
    });  
  
    moduleMap[moduleKey] = {  
      moduleid: module.moduleid || module.subjectid || moduleKey,  
      modulename: module.modulename || module.subjectname || getAdminModuleName(module),  
      subjectid: module.subjectid || module.moduleid || moduleKey,  
      subjectname: module.subjectname || module.modulename || getAdminModuleName(module),  
      tasksByKey  
    };  
  });  
  
  activeRows.forEach(row => {  
    const moduleKey = getAdminModuleKey(row);  
    const taskKey = getAdminTaskKey(row);  
    if (!moduleKey) return;  
  
    if (!moduleMap[moduleKey]) {  
      moduleMap[moduleKey] = {  
        moduleid: row.moduleid || row.subjectid || moduleKey,  
        modulename: row.modulename || row.subjectname || getAdminModuleName(row),  
        subjectid: row.subjectid || row.moduleid || moduleKey,  
        subjectname: row.subjectname || row.modulename || getAdminModuleName(row),  
        tasksByKey: {}  
      };  
    }  
  
    if (taskKey && !moduleMap[moduleKey].tasksByKey[taskKey]) {  
      moduleMap[moduleKey].tasksByKey[taskKey] = normalizeProgressTask({  
        ...row,  
        rows: activeRows.filter(sourceRow => getAdminTaskKey(sourceRow) === taskKey)  
      });  
    }  
  });  
  
  const moduleList = Object.values(moduleMap)  
    .map(module => {  
      const moduleRows = activeRows.filter(row => getAdminModuleKey(row) === getAdminModuleKey(module));  
      const tasks = Object.values(module.tasksByKey || {}).sort(sortProgressTasks);  
  
      return {  
        ...module,  
        moduleStudentTaskCount: getAdminProgressRowCount(moduleRows),  
        tasks  
      };  
    })  
    .filter(module => Array.isArray(module.tasks) && module.tasks.length > 0)  
    .sort(sortModuleGroupsByModuleId);  
  
  const studentMap = {};  
  
  activeRows.forEach(row => {  
    const studentKey = String(row.studentid || row.username || "").trim();  
    if (!studentKey) return;  
  
    if (!studentMap[studentKey]) {  
      studentMap[studentKey] = {  
        studentid: row.studentid || studentKey,  
        username: row.username || "Student",  
        classgroup: row.classgroup || "",  
        rowsByModule: {}  
      };  
    }  
  
    const moduleKey = getAdminModuleKey(row);  
    if (!studentMap[studentKey].rowsByModule[moduleKey]) {  
      studentMap[studentKey].rowsByModule[moduleKey] = [];  
    }  
  
    studentMap[studentKey].rowsByModule[moduleKey].push(row);  
  });  
  
  const students = Object.values(studentMap).sort((a, b) => {  
    const groupCompare = naturalCompare(a.classgroup, b.classgroup);  
    if (groupCompare !== 0) return groupCompare;  
    return naturalCompare(a.username, b.username);  
  });  
  
  return {  
    rows: activeRows,  
    modules: moduleList,  
    students  
  };  
}  
  
let adminProgressClassMatrixSaveTimer = 0;  
let adminProgressClassMatrixSaveInFlight = null;  
let adminProgressMatrixEditMode = false;
let adminProgressClassActiveModuleIndex = 0;  
  
function getAdminProgressMatrixPendingCount() {  
  return Object.keys(progressPendingUpdates || {}).length;  
}  
  
function renderAdminProgressMatrixEditKeyBlock() {  
  return `  
    <div class="admin-progress-matrix-corner-content">  
      <button  
        type="button"  
        class="admin-progress-matrix-edit-toggle"  
        data-progress-action="toggle-admin-progress-grid-edit"  
        aria-label="Turn edit mode on"  
        aria-pressed="false"  
        title="Edit progress"  
      >  
        <span class="app-icon app-icon-small edit-mode-icon" aria-hidden="true"></span>  
        <span class="admin-progress-matrix-edit-label">Edit</span>  
      </button>  
      <span class="admin-progress-matrix-key-line">  
        <span class="admin-progress-matrix-key-tick admin-progress-matrix-key-tick--student" aria-hidden="true">${M4L_PROGRESS_TICK}</span>  
        <span>STUDENT</span>  
      </span>  
      <span class="admin-progress-matrix-key-line">  
        <span class="admin-progress-matrix-key-tick admin-progress-matrix-key-tick--teacher" aria-hidden="true">${M4L_PROGRESS_TICK}</span>  
        <span>TEACHER</span>  
      </span>  
      <span class="admin-progress-matrix-save-status" data-admin-progress-matrix-save-status aria-live="polite"></span>  
    </div>  
  `;  
}  
  
function updateAdminProgressMatrixSaveStatus(message = "") {  
  document.querySelectorAll("[data-admin-progress-matrix-save-status]").forEach(status => {  
    status.textContent = message;  
  });  
}  
  
function updateAdminProgressMatrixEditControls() {  
  const isEditing = adminProgressMatrixEditMode === true;  
  
  document.querySelectorAll(".admin-progress-class-overview, .admin-progress-group-overview").forEach(view => {  
    view.classList.toggle("is-editing", isEditing);  
    view.classList.toggle("is-viewing", !isEditing);  
  });  
  
  document.querySelectorAll(".admin-progress-matrix-edit-toggle").forEach(button => {  
    button.classList.toggle("is-editing", isEditing);  
    button.setAttribute("aria-pressed", isEditing ? "true" : "false");  
    button.setAttribute("aria-label", isEditing ? "Save changes and finish editing" : "Click to edit progress");  
    button.setAttribute("title", isEditing ? "Save changes" : "Click to edit");  
    button.innerHTML = `  
      <span class="app-icon app-icon-small ${isEditing ? "save-mode-icon" : "edit-mode-icon"}" aria-hidden="true"></span>  
      <span class="admin-progress-matrix-edit-label">${isEditing ? "Save" : "Click to edit"}</span>  
    `;  
  });  
  
  if (isEditing) {  
    const pendingCount = getAdminProgressMatrixPendingCount();  
    updateAdminProgressMatrixSaveStatus(pendingCount ? `${pendingCount} pending` : "");  
  } else {  
    updateAdminProgressMatrixSaveStatus("");  
  }  
  
  return true;  
}  
  
function resetAdminProgressMatrixEditMode() {  
  adminProgressMatrixEditMode = false;  
  if (adminProgressClassMatrixSaveTimer && typeof window !== "undefined") {  
    window.clearTimeout(adminProgressClassMatrixSaveTimer);  
    adminProgressClassMatrixSaveTimer = 0;  
  }  
  return true;  
}  
  
async function setAdminProgressMatrixEditMode(isEditing, button) {  
  const nextEditing = !!isEditing;  
  
  if (nextEditing) {  
    adminProgressMatrixEditMode = true;  
    updateAdminProgressMatrixEditControls();  
    return true;  
  }  
  
  if (!adminProgressMatrixEditMode) {  
    updateAdminProgressMatrixEditControls();  
    return true;  
  }  
  
  adminProgressMatrixEditMode = false;
  updateAdminProgressMatrixEditControls();
  
  if (!hasProgressPendingUpdates()) {  
    updateAdminProgressMatrixSaveStatus("");
    return true;  
  }  

  updateAdminProgressMatrixSaveStatus("Saving...");  

  const saveStarted = startAdminProgressBackgroundSave({ confirm: false });

  if (saveStarted === false) {
    adminProgressMatrixEditMode = true;
    updateAdminProgressMatrixEditControls();
    updateAdminProgressMatrixSaveStatus("Save cancelled");
    return false;
  }

  if (saveStarted && typeof saveStarted.then === "function") {
    saveStarted.then(saved => {
      if (saved) {
        updateAdminProgressMatrixSaveStatus("Saved");
        window.setTimeout(() => {
          if (!adminProgressMatrixEditMode) updateAdminProgressMatrixSaveStatus("");
        }, 1400);
      } else {
        updateAdminProgressMatrixSaveStatus("Save failed");
      }
    }).catch(err => {
      console.error("Could not save progress matrix changes in the background:", err);
      updateAdminProgressMatrixSaveStatus("Save failed");
    });
  } else {
    updateAdminProgressMatrixSaveStatus("Saved");
    window.setTimeout(() => {
      if (!adminProgressMatrixEditMode) updateAdminProgressMatrixSaveStatus("");
    }, 1400);
  }

  return true;
}  

function getAdminProgressClassMatrixCellState(row) {  
  if (!row) return "blank";  
  
  const pending = progressPendingUpdates[row.studenttaskid] || {};  
  const completeStatus = pending.completeStatus !== undefined  
    ? pending.completeStatus  
    : row.completestatus;  
  const verifyStatus = pending.verifyStatus !== undefined  
    ? pending.verifyStatus  
    : row.verifystatus;  
  
  if (isStatusOn(verifyStatus)) return "verified";  
  if (isStatusOn(completeStatus)) return "complete";  
  return "blank";  
}  
  
function getNextAdminProgressClassMatrixCellState(currentState) {  
  switch (String(currentState || "blank")) {  
    case "blank":  
      return "complete";  
    case "complete":  
      return "verified";  
    case "verified":  
    default:  
      return "blank";  
  }  
}  
  
function getAdminProgressClassMatrixStateUpdate(nextState) {  
  if (nextState === "verified") {  
    return { completeStatus: "YES", verifyStatus: "YES" };  
  }  
  
  if (nextState === "complete") {  
    return { completeStatus: "YES", verifyStatus: "" };  
  }  
  
  return { completeStatus: "", verifyStatus: "" };  
}  
  
function getAdminProgressClassMatrixStateLabel(state) {  
  switch (String(state || "blank")) {  
    case "verified":  
      return "Verified";  
    case "complete":  
      return "Complete";  
    default:  
      return "Blank";  
  }  
}  
  
function getAdminProgressClassMatrixModuleTheme(moduleIndex) {  
  const index = Number(moduleIndex || 0);  
  const moduleNumber = Number.isFinite(index) ? index + 1 : 1;  
  // V90.7.1: human even-numbered modules (2, 4, 6...) use the
  // disabled/light-grey surface for visual banding.
  return moduleNumber % 2 === 0 ? "disabled" : "app";  
}  
  
function getAdminProgressClassMatrixModuleThemeClass(moduleIndex) {  
  return `admin-progress-class-grid-module-theme--${getAdminProgressClassMatrixModuleTheme(moduleIndex)}`;  
}  
  
function getAdminProgressClassGroupPrefix(classgroup) {  
  const raw = String(classgroup || "").trim();  
  if (!raw || raw.toUpperCase() === "ALL") return "";  
  return raw.replace(/^group\s*/i, "").trim();  
}  
  
function getAdminProgressClassMatrixNameTheme(classgroup) {  
  const prefix = getAdminProgressClassGroupPrefix(classgroup);  
  const groupNumber = Number(prefix);  
  
  if (Number.isFinite(groupNumber) && groupNumber > 0) {  
    return Math.floor(groupNumber) % 2 === 1 ? "app" : "disabled";  
  }  
  
  if (!prefix) return "app";  
  
  const hash = prefix.split("").reduce((total, char) => total + char.charCodeAt(0), 0);  
  return hash % 2 === 0 ? "app" : "disabled";  
}  
  
function getAdminProgressClassMatrixNameThemeClass(classgroup) {  
  return `admin-progress-class-grid-name-theme--${getAdminProgressClassMatrixNameTheme(classgroup)}`;  
}  
  
function findAdminProgressDashboardRowByStudentTaskId(studenttaskid) {  
  const targetId = String(studenttaskid || "");  
  if (!targetId) return null;  
  
  return (Array.isArray(adminProgressDashboardRows) ? adminProgressDashboardRows : [])  
    .find(row => String(row.studenttaskid || row.StudentTaskID || row.StudentTaskId || "") === targetId) || null;  
}  
  
function applyAdminProgressClassMatrixStateToRow(studenttaskid, nextState) {  
  const update = getAdminProgressClassMatrixStateUpdate(nextState);  
  const row = findAdminProgressDashboardRowByStudentTaskId(studenttaskid);  
  
  if (row) {  
    row.completestatus = update.completeStatus;  
    row.completeStatus = update.completeStatus;  
    row.CompleteStatus = update.completeStatus;  
    row.verifystatus = update.verifyStatus;  
    row.verifyStatus = update.verifyStatus;  
    row.VerifyStatus = update.verifyStatus;  
  }  
  
  if (!progressPendingUpdates[studenttaskid]) {  
    progressPendingUpdates[studenttaskid] = { studenttaskid };  
  }  
  
  progressPendingUpdates[studenttaskid].completeStatus = update.completeStatus;  
  progressPendingUpdates[studenttaskid].verifyStatus = update.verifyStatus;  
  
  return row;  
}  
  

function getAdminProgressClassAccordionGroupKey(classgroup) {
  const raw = String(classgroup || "").trim();
  return raw || "UNGROUPED";
}

function getAdminProgressClassAccordionGroupLabel(groupKey) {
  const key = String(groupKey || "").trim();
  if (!key || key === "UNGROUPED") {
    return "Group";
  }

  return `Group ${key}`;
}

function getAdminProgressClassAccordionGroups(students) {
  const map = Object.create(null);

  (Array.isArray(students) ? students : []).forEach(student => {
    const groupKey = getAdminProgressClassAccordionGroupKey(student && student.classgroup);
    const label = getAdminProgressClassAccordionGroupLabel(groupKey);

    if (!map[groupKey]) {
      map[groupKey] = {
        key: groupKey,
        label,
        students: []
      };
    }

    map[groupKey].students.push(student);
  });

  return Object.values(map).sort((a, b) => {
    if (a.key === "UNGROUPED" && b.key !== "UNGROUPED") return 1;
    if (b.key === "UNGROUPED" && a.key !== "UNGROUPED") return -1;
    return naturalCompare(a.key, b.key);
  });
}

function isAdminProgressClassGroupExpanded(groupKey) {
  return adminProgressClassExpandedGroups[String(groupKey || "").trim()] === true;
}

function isAdminProgressClassModuleExpanded(moduleKey) {
  return adminProgressClassExpandedModules[String(moduleKey || "").trim()] === true;
}

function getAdminProgressClassAccordionChevron(isExpanded) {
  return isExpanded ? "\u25B2" : "\u25BC";
}

function toggleAdminProgressClassAccordionGroup(groupKey) {
  const key = String(groupKey || "").trim();
  if (!key) return false;

  adminProgressClassExpandedGroups[key] = !isAdminProgressClassGroupExpanded(key);
  rerenderAdminProgressClassAccordion();
  return true;
}

function toggleAdminProgressClassAccordionModule(moduleKey) {
  const key = String(moduleKey || "").trim();
  if (!key) return false;

  adminProgressClassExpandedModules[key] = !isAdminProgressClassModuleExpanded(key);
  rerenderAdminProgressClassAccordion();
  return true;
}

function rerenderAdminProgressClassAccordion() {
  const dashboard = getDomElement("admin-progress-dashboard");

  if (!dashboard) {
    return false;
  }

  setDomHtml(dashboard, renderAdminProgressClassOverview(adminProgressDashboardModules || []));
  bindProgressUiHandlers(dashboard);
  bindAdminProgressClassPaneResize();

  const classOverview = dashboard.querySelector("[data-admin-class-progress-overview]");

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => updateAdminProgressClassModuleStepper(classOverview));
  } else {
    updateAdminProgressClassModuleStepper(classOverview);
  }

  return true;
}

function getAdminProgressClassAccordionColumnItems(modules) {
  const items = [];

  ensureAdminProgressClassDefaultExpandedModules(modules);

  (Array.isArray(modules) ? modules : []).forEach((module, moduleIndex) => {
    const moduleKey = getAdminModuleKey(module);
    const tasks = Array.isArray(module && module.tasks) ? module.tasks : [];
    const isExpanded = isAdminProgressClassModuleExpanded(moduleKey);

    if (isExpanded && tasks.length > 0) {
      tasks.forEach(task => {
        items.push({
          type: "task",
          module,
          moduleIndex,
          moduleKey,
          task
        });
      });
      return;
    }

    items.push({
      type: "module",
      module,
      moduleIndex,
      moduleKey,
      task: null
    });
  });

  return items;
}

function renderAdminProgressClassAccordionColumnHeader(item) {
  if (!item) return "";

  const themeClass = getAdminProgressClassMatrixModuleThemeClass(item.moduleIndex || 0);

  if (item.type === "task") {
    return renderAdminProgressClassGridTaskHeader(item.task, item.module, item.moduleIndex);
  }

  const moduleName = getAdminModuleName(item.module) || "Module";

  return `
    <div
      class="admin-progress-class-grid-task-header admin-progress-class-accordion-task-placeholder ${themeClass}"
      role="columnheader"
      aria-label="${escapeForAttribute(moduleName)} collapsed module column"
    ></div>
  `;
}

function renderAdminProgressClassAccordionBlankCell(item, label = "Blank progress cell") {
  if (!item) return "";
  const themeClass = getAdminProgressClassMatrixModuleThemeClass(item.moduleIndex || 0);

  return `
    <div
      class="admin-progress-class-grid-task-cell admin-progress-class-accordion-blank-cell ${themeClass}"
      role="gridcell"
      aria-label="${escapeForAttribute(label)}"
    ></div>
  `;
}

function renderAdminProgressClassAccordionGroupGridRow(group, items, totalColumnCount = 1) {
  const safeColumnCount = Math.max(1, Number(totalColumnCount || 1));
  const label = group && group.label ? group.label : "Group";

  return `
    <div
      class="admin-progress-class-module-task-row admin-progress-class-continuous-task-row admin-progress-class-accordion-group-grid-row"
      role="row"
      style="--admin-progress-class-task-count: ${safeColumnCount}; --admin-progress-class-total-task-count: ${safeColumnCount};"
    >
      ${(Array.isArray(items) ? items : []).map(item => renderAdminProgressClassAccordionBlankCell(item, `${label} summary cell`)).join("")}
    </div>
  `;
}

function renderAdminProgressClassAccordionStudentGridRow(student, items, totalColumnCount = 1) {
  const safeColumnCount = Math.max(1, Number(totalColumnCount || 1));

  return `
    <div
      class="admin-progress-class-module-task-row admin-progress-class-continuous-task-row admin-progress-class-accordion-student-grid-row"
      role="row"
      style="--admin-progress-class-task-count: ${safeColumnCount}; --admin-progress-class-total-task-count: ${safeColumnCount};"
    >
      ${(Array.isArray(items) ? items : []).map(item => {
        if (item && item.type === "task") {
          return renderAdminProgressClassModuleTaskCell(student, item.module, item.task, item.moduleIndex);
        }

        return renderAdminProgressClassAccordionBlankCell(item, `${student && student.username ? student.username : "Student"} collapsed module cell`);
      }).join("")}
    </div>
  `;
}

function renderAdminProgressClassOverview(modules) {
  resetAdminProgressMatrixEditMode();
  const model = buildAdminProgressClassOverviewModel(modules, adminProgressDashboardRows);

  if (!model.students.length || !model.modules.length) {
    return `<p class="helper-text">No class progress grid data found.</p>`;
  }

  const safeActiveIndex = Math.max(0, Math.min(
    model.modules.length - 1,
    Number.isFinite(Number(adminProgressClassActiveModuleIndex)) ? Number(adminProgressClassActiveModuleIndex) : 0
  ));
  adminProgressClassActiveModuleIndex = safeActiveIndex;

  ensureAdminProgressClassDefaultExpandedModules(model.modules);

  const groups = getAdminProgressClassAccordionGroups(model.students);

  return `
    <section
      class="admin-progress-class-overview admin-progress-class-overview--module-panes admin-progress-class-overview--attached admin-progress-class-overview--continuous-ready admin-progress-class-overview--accordion is-viewing"
      aria-label="Class progress overview"
      data-admin-class-progress-overview
      data-active-module-index="${safeActiveIndex}"
      style="--admin-progress-class-active-index: ${safeActiveIndex};"
    >
      <section class="admin-progress-class-view-panel" aria-label="All students by module">
        <section class="admin-progress-class-attached-shell" data-admin-class-progress-attached-shell aria-label="Attached class progress module grid">
          ${renderAdminProgressClassStudentColumn(model.students, groups)}
          <div class="admin-progress-class-pane-viewport" data-admin-class-progress-pane-viewport>
            <div class="admin-progress-class-pane-stack" data-admin-class-progress-pane-stack>
              ${model.modules.map((module, moduleIndex) => renderAdminProgressClassModulePane(module, model.students, moduleIndex, safeActiveIndex, model.modules.length)).join("")}
            </div>
            ${renderAdminProgressClassContinuousPane(model.modules, model.students, groups)}
          </div>
        </section>
      </section>
    </section>
  `;
}

function renderAdminProgressClassModuleStepper(modules, activeIndex = 0) {
  // V90.6 trial: Class Progress uses the native module-header/pane swipe.
  // Keep this legacy function name as a compatibility wrapper, but render no
  // visible arrows or numbered stepper controls.
  return "";
}

function renderAdminProgressClassStudentColumn(students, groups) {
  const groupList = Array.isArray(groups)
    ? groups
    : getAdminProgressClassAccordionGroups(students);

  return `
    <aside class="admin-progress-class-student-column" aria-label="Students">
      <div class="admin-progress-class-student-column-key" aria-label="Progress key">
        ${renderAdminProgressClassMatrixKeyOnlyBlock()}
      </div>
      <div class="admin-progress-class-student-column-action" aria-label="Progress edit control">
        ${renderAdminProgressClassMatrixActionBlock()}
      </div>
      <div class="admin-progress-class-student-list" data-admin-class-progress-student-list>
        ${groupList.map(group => renderAdminProgressClassStudentGroupSection(group)).join("")}
        <p class="admin-progress-class-student-column-hint">Click on student name to see individual progress</p>
      </div>
    </aside>
  `;
}

function renderAdminProgressClassStudentGroupSection(group) {
  if (!group) return "";

  const groupKey = String(group.key || "").trim();
  const label = group.label || getAdminProgressClassAccordionGroupLabel(groupKey);
  const isExpanded = isAdminProgressClassGroupExpanded(groupKey);
  const chevron = getAdminProgressClassAccordionChevron(isExpanded);

  return `
    <div
      class="admin-progress-class-student-group-section${isExpanded ? " is-expanded" : " is-collapsed"}"
      data-admin-progress-class-group-section="${escapeForAttribute(groupKey)}"
    >
      <button
        type="button"
        class="admin-progress-class-student-row admin-progress-class-group-heading-row"
        data-progress-action="toggle-admin-progress-class-group"
        data-progress-class-group-key="${escapeForAttribute(groupKey)}"
        aria-expanded="${isExpanded ? "true" : "false"}"
        aria-label="${escapeForAttribute(label)} ${isExpanded ? "expanded" : "collapsed"}"
      >
        <span class="admin-progress-class-group-heading-label">${escapeHtml(label)}</span>
        <span class="admin-progress-class-accordion-chevron" aria-hidden="true">${chevron}</span>
      </button>
      ${isExpanded ? (group.students || []).map(student => renderAdminProgressClassStudentColumnRow(student)).join("") : ""}
    </div>
  `;
}

function renderAdminProgressClassStudentColumnRow(student) {
  const name = student.username || "Student";
  const groupPrefix = getAdminProgressClassGroupPrefix(student.classgroup);
  const accessibleName = groupPrefix ? `${groupPrefix} ${name}` : name;
  const nameThemeClass = getAdminProgressClassMatrixNameThemeClass(student.classgroup);

  return `
    <button
      type="button"
      class="admin-progress-class-student-row admin-progress-class-grid-student-button ${nameThemeClass}"
      data-progress-action="open-admin-individual-student-card"
      data-studentid="${escapeForAttribute(student.studentid || "")}" 
      data-username="${escapeForAttribute(name)}"
      aria-label="Open Individual Progress for ${escapeForAttribute(accessibleName)}"
    >
      ${groupPrefix ? `<span class="admin-progress-class-grid-student-prefix" aria-hidden="true">${escapeHtml(groupPrefix)}</span>` : ""}
      <span class="admin-progress-class-grid-student-name">${escapeHtml(name)}</span>
    </button>
  `;
}

function renderAdminProgressClassModulePane(module, students, moduleIndex = 0, activeIndex = 0, moduleCount = 1) {
  const moduleName = getAdminModuleName(module) || "Module";
  const tasks = Array.isArray(module && module.tasks) ? module.tasks : [];
  const isActive = moduleIndex === activeIndex;
  const safeTaskCount = Math.max(1, tasks.length);

  return `
    <section
      class="admin-progress-class-module-pane${isActive ? " is-active" : ""}"
      data-admin-class-progress-module-pane
      data-progress-class-module-index="${moduleIndex}"
      aria-label="${escapeForAttribute(moduleName)} class progress"
      style="--admin-progress-class-task-count: ${safeTaskCount};"
    >
      ${renderAdminProgressClassModulePaneHeader(module, moduleIndex, moduleCount)}
      <section class="admin-progress-class-module-task-shell" aria-label="${escapeForAttribute(moduleName)} task columns">
        <div class="admin-progress-class-module-task-scroll" data-admin-class-progress-module-task-scroll tabindex="0" role="region" aria-label="Scrollable ${escapeForAttribute(moduleName)} task columns">
          <div class="admin-progress-class-module-task-header-row" role="row">
            ${tasks.map(task => renderAdminProgressClassGridTaskHeader(task, module, moduleIndex)).join("")}
          </div>
          <div class="admin-progress-class-module-body" data-admin-class-progress-module-body>
            ${(Array.isArray(students) ? students : []).map(student => renderAdminProgressClassModuleTaskRow(student, module, moduleIndex)).join("")}
          </div>
        </div>
      </section>
    </section>
  `;
}

function getAdminProgressClassContinuousItems(modules) {
  const items = [];

  (Array.isArray(modules) ? modules : []).forEach((module, moduleIndex) => {
    const tasks = Array.isArray(module && module.tasks) ? module.tasks : [];

    tasks.forEach(task => {
      items.push({
        module,
        moduleIndex,
        task
      });
    });
  });

  return items;
}

function renderAdminProgressClassContinuousPane(modules, students, groups) {
  const list = Array.isArray(modules) ? modules : [];
  const groupList = Array.isArray(groups)
    ? groups
    : getAdminProgressClassAccordionGroups(students);
  const items = getAdminProgressClassAccordionColumnItems(list);
  const totalColumnCount = Math.max(1, items.length);

  return `
    <section
      class="admin-progress-class-continuous-pane admin-progress-class-accordion-pane"
      data-admin-class-progress-continuous-pane
      aria-label="Continuous class progress grid"
      style="--admin-progress-class-total-task-count: ${totalColumnCount}; --admin-progress-class-task-count: ${totalColumnCount};"
    >
      <div class="admin-progress-class-continuous-task-scroll" data-admin-class-progress-continuous-task-scroll tabindex="0" role="region" aria-label="Scrollable continuous class progress task grid">
        <div class="admin-progress-class-continuous-module-header-row" role="row">
          ${list.map((module, moduleIndex) => renderAdminProgressClassContinuousModuleHeader(module, moduleIndex)).join("")}
        </div>
        <div class="admin-progress-class-module-task-header-row admin-progress-class-continuous-task-header-row" role="row">
          ${items.map(item => renderAdminProgressClassAccordionColumnHeader(item)).join("")}
        </div>
        <div class="admin-progress-class-module-body admin-progress-class-continuous-body" data-admin-class-progress-module-body data-admin-class-progress-continuous-body>
          ${groupList.map(group => {
            const groupRows = [renderAdminProgressClassAccordionGroupGridRow(group, items, totalColumnCount)];

            if (isAdminProgressClassGroupExpanded(group.key)) {
              (group.students || []).forEach(student => {
                groupRows.push(renderAdminProgressClassAccordionStudentGridRow(student, items, totalColumnCount));
              });
            }

            return groupRows.join("");
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderAdminProgressClassContinuousModuleHeader(module, moduleIndex = 0) {
  const moduleName = getAdminModuleName(module) || "Module";
  const moduleKey = getAdminModuleKey(module);
  const moduleNumber = Number(moduleIndex || 0) + 1;
  const tasks = Array.isArray(module && module.tasks) ? module.tasks : [];
  const isExpanded = isAdminProgressClassModuleExpanded(moduleKey);
  const span = isExpanded ? Math.max(1, tasks.length) : 1;
  const themeClass = getAdminProgressClassMatrixModuleThemeClass(moduleIndex);
  const chevron = getAdminProgressClassAccordionChevron(isExpanded);
  const visibleLabel = isExpanded ? moduleName : String(moduleNumber);
  const stateClass = isExpanded ? "is-expanded" : "is-collapsed";

  return `
    <button
      type="button"
      class="admin-progress-class-merged-module-header admin-progress-class-accordion-module-heading ${themeClass} ${stateClass}"
      data-progress-action="toggle-admin-progress-class-module"
      data-progress-class-module-key="${escapeForAttribute(moduleKey)}"
      role="columnheader"
      aria-expanded="${isExpanded ? "true" : "false"}"
      aria-label="${escapeForAttribute(moduleName)} module ${isExpanded ? "expanded" : "collapsed"}"
      title="${escapeForAttribute(moduleName)}"
      style="grid-column: span ${span};"
    >
      <span class="admin-progress-class-module-title admin-progress-class-merged-module-title">
        <span class="admin-progress-class-module-heading-label">${escapeHtml(visibleLabel)}</span>
        <span class="admin-progress-class-accordion-chevron" aria-hidden="true">${chevron}</span>
      </span>
    </button>
  `;
}

function renderAdminProgressClassContinuousTaskRow(student, items, totalTaskCount = 1) {
  const safeTaskCount = Math.max(1, Number(totalTaskCount || 1));

  return `
    <div class="admin-progress-class-module-task-row admin-progress-class-continuous-task-row" role="row" style="--admin-progress-class-task-count: ${safeTaskCount}; --admin-progress-class-total-task-count: ${safeTaskCount};">
      ${(Array.isArray(items) ? items : []).map(item => renderAdminProgressClassModuleTaskCell(student, item.module, item.task, item.moduleIndex)).join("")}
    </div>
  `;
}


function renderAdminProgressClassModulePaneHeader(module, moduleIndex = 0, moduleCount = 1) {
  const moduleName = getAdminModuleName(module) || "Module";
  const moduleNumber = Number(moduleIndex || 0) + 1;
  const requestedModuleCount = Number(moduleCount);
  const safeModuleCount = Number.isFinite(requestedModuleCount)
    ? Math.max(1, requestedModuleCount)
    : 1;
  const hasPreviousModule = moduleIndex > 0;
  const hasNextModule = moduleIndex < safeModuleCount - 1;

  return `
    <header class="admin-progress-class-module-header" data-admin-class-progress-module-header>
      <div class="admin-progress-class-module-header-text">
        ${renderAdminProgressClassModuleHeaderArrow("left", moduleIndex - 1, hasPreviousModule, `Previous module before ${moduleName}`)}
        <h3 class="admin-progress-class-module-title">${escapeHtml(moduleName)}</h3>
        ${renderAdminProgressClassModuleHeaderArrow("right", moduleIndex + 1, hasNextModule, `Next module after ${moduleName}`)}
      </div>
      <span class="admin-progress-class-module-index-badge" aria-label="Module ${moduleNumber}">${moduleNumber}</span>
    </header>
  `;
}

function renderAdminProgressClassModuleHeaderArrow(direction, targetIndex, isVisible, label) {
  const directionClass = direction === "left" ? "left" : "right";
  const iconClass = direction === "left" ? "app-icon-left" : "app-icon-right";
  const visibilityClass = isVisible ? "" : " is-hidden";
  const disabledAttrs = isVisible
    ? ""
    : ` disabled tabindex="-1" aria-hidden="true"`;

  return `
    <button
      type="button"
      class="admin-progress-class-module-nav admin-progress-class-module-nav--${directionClass}${visibilityClass}"
      data-progress-action="scroll-admin-class-progress-module"
      data-progress-class-module-index="${Number(targetIndex || 0)}"
      aria-label="${escapeForAttribute(label || "Move module")}"
      title="${escapeForAttribute(label || "Move module")}"
      ${disabledAttrs}
    >
      <span class="app-icon app-icon-small ${iconClass}" aria-hidden="true"></span>
    </button>
  `;
}

function renderAdminProgressClassMatrixActionBlock() {
  return `
    <div class="admin-progress-matrix-action-block admin-progress-matrix-action-block--a2" aria-label="Progress edit control">
      <button
        type="button"
        class="admin-progress-matrix-edit-toggle admin-progress-class-global-edit-toggle"
        data-progress-action="toggle-admin-progress-grid-edit"
        aria-label="Click to edit progress"
        aria-pressed="false"
        title="Click to edit"
      >
        <span class="app-icon app-icon-small edit-mode-icon" aria-hidden="true"></span>
        <span class="admin-progress-matrix-edit-label">Click to edit</span>
      </button>
      <span class="admin-progress-matrix-save-status" data-admin-progress-matrix-save-status aria-live="polite"></span>
    </div>
  `;
}

function renderAdminProgressClassMatrixKeyOnlyBlock() {
  return `
    <div class="admin-progress-matrix-key-block admin-progress-matrix-key-block--a1" aria-label="Progress key">
      <span class="admin-progress-matrix-key-line">
        <span class="admin-progress-matrix-key-tick admin-progress-matrix-key-tick--student" aria-hidden="true">${M4L_PROGRESS_TICK}</span>
        <span>STUDENT</span>
      </span>
      <span class="admin-progress-matrix-key-line">
        <span class="admin-progress-matrix-key-tick admin-progress-matrix-key-tick--teacher" aria-hidden="true">${M4L_PROGRESS_TICK}</span>
        <span>TEACHER</span>
      </span>
    </div>
  `;
}

function renderAdminProgressClassModuleTaskRow(student, module, moduleIndex = 0) {
  const tasks = Array.isArray(module && module.tasks) ? module.tasks : [];
  const safeTaskCount = Math.max(1, tasks.length);

  return `
    <div class="admin-progress-class-module-task-row" role="row" style="--admin-progress-class-task-count: ${safeTaskCount};">
      ${tasks.map(task => renderAdminProgressClassModuleTaskCell(student, module, task, moduleIndex)).join("")}
    </div>
  `;
}

function renderAdminProgressClassModuleTaskCell(student, module, task, moduleIndex = 0) {
  const row = findAdminProgressClassGridTaskRow(student, module, task);
  const studentName = student.username || "Student";
  const moduleName = module.modulename || module.subjectname || "Module";
  const taskName = task.taskname || "Untitled Task";
  const state = getAdminProgressClassMatrixCellState(row);
  const stateLabel = getAdminProgressClassMatrixStateLabel(state);
  const label = `${studentName}, ${moduleName}, ${taskName}: ${stateLabel}`;
  const studentTaskId = row ? String(row.studenttaskid || "") : "";
  const themeClass = getAdminProgressClassMatrixModuleThemeClass(moduleIndex);

  return `
    <div class="admin-progress-class-grid-task-cell ${themeClass}" role="gridcell">
      <button
        type="button"
        class="admin-progress-class-grid-status-button admin-progress-class-grid-status-button--${escapeForAttribute(state)}"
        data-progress-action="cycle-admin-progress-class-cell"
        data-studenttaskid="${escapeForAttribute(studentTaskId)}"
        data-status="${escapeForAttribute(state)}"
        data-state="${escapeForAttribute(state === "blank" ? "empty" : state)}"
        aria-label="${escapeForAttribute(label)}"
        ${studentTaskId ? "" : "disabled"}
      >
        ${renderAdminProgressClassGridStatusSymbol(state)}
      </button>
    </div>
  `;
}


function getAdminProgressClassOverviewElement() {
  return document.querySelector("[data-admin-class-progress-overview], .admin-progress-class-overview");
}

function getAdminProgressClassVisibleSlots() {
  // V90.7: Class Progress no longer uses the old 1/3/5 pane-slot model.
  // Each layout fills one single view pane. Mobile still swipes one module at
  // a time; medium/large use the continuous merged-header grid.
  return 1;
}

function getAdminProgressClassPaneElements(overview) {
  const root = overview || getAdminProgressClassOverviewElement();
  if (!root) {
    return { root: null, viewport: null, track: null, panels: [] };
  }

  return {
    root,
    viewport: root.querySelector("[data-admin-class-progress-pane-viewport]"),
    track: root.querySelector("[data-admin-class-progress-pane-stack]"),
    panels: Array.from(root.querySelectorAll("[data-admin-class-progress-module-pane]"))
  };
}

function getAdminProgressClassSafeModuleIndex(root, index) {
  const panels = root ? Array.from(root.querySelectorAll("[data-admin-class-progress-module-pane]")) : [];
  const maxIndex = Math.max(0, panels.length - 1);
  const requestedIndex = Number(index);
  return Math.max(0, Math.min(maxIndex, Number.isFinite(requestedIndex) ? requestedIndex : 0));
}

function getAdminProgressClassPaneStep(root) {
  const { viewport, panels } = getAdminProgressClassPaneElements(root);

  if (!viewport || !panels.length) {
    return 1;
  }

  if (panels.length > 1) {
    const measuredStep = Math.abs((panels[1].offsetLeft || 0) - (panels[0].offsetLeft || 0));
    if (measuredStep > 1) {
      return measuredStep;
    }
  }

  const cssStep = Number.parseFloat(
    typeof window !== "undefined" && typeof window.getComputedStyle === "function"
      ? window.getComputedStyle(root).getPropertyValue("--admin-progress-class-pane-step")
      : ""
  );

  return Number.isFinite(cssStep) && cssStep > 1
    ? cssStep
    : Math.max(1, viewport.clientWidth || 1);
}

function getAdminProgressClassNativeSwipeIndex(root) {
  const { viewport, panels } = getAdminProgressClassPaneElements(root);

  if (!viewport || !panels.length) {
    return 0;
  }

  const step = getAdminProgressClassPaneStep(root);
  const requestedIndex = Math.round((viewport.scrollLeft || 0) / Math.max(1, step));
  return Math.max(0, Math.min(panels.length - 1, Number.isFinite(requestedIndex) ? requestedIndex : 0));
}

function setAdminProgressClassActiveModuleIndex(rootOrIndex, maybeIndex, options = {}) {
  const root = typeof rootOrIndex === "number"
    ? getAdminProgressClassOverviewElement()
    : (rootOrIndex || getAdminProgressClassOverviewElement());
  const index = typeof rootOrIndex === "number" ? rootOrIndex : maybeIndex;

  if (!root) return false;

  const panels = Array.from(root.querySelectorAll("[data-admin-class-progress-module-pane]"));
  if (!panels.length) return false;

  const activeIndex = getAdminProgressClassSafeModuleIndex(root, index);
  adminProgressClassActiveModuleIndex = activeIndex;
  root.dataset.activeModuleIndex = String(activeIndex);
  root.style.setProperty("--admin-progress-class-active-index", String(activeIndex));

  panels.forEach((panel, panelIndex) => {
    const distance = Math.abs(panelIndex - activeIndex);
    const isActive = panelIndex === activeIndex;
    panel.hidden = false;
    panel.classList.toggle("is-active", isActive);
    panel.classList.toggle("is-adjacent", distance > 0 && distance < getAdminProgressClassVisibleSlots());
    panel.classList.toggle("is-far", distance >= getAdminProgressClassVisibleSlots());
    panel.setAttribute("aria-current", isActive ? "true" : "false");
  });

  if (options.resetGridScroll === true) {
    resetAdminProgressClassPaneGridScroll(root, activeIndex);
  }

  return true;
}

function scrollAdminProgressClassNativeViewportToIndex(overview, index, behavior = "auto") {
  const { root, viewport, panels } = getAdminProgressClassPaneElements(overview);

  if (!root || !viewport || !panels.length) {
    return false;
  }

  const activeIndex = getAdminProgressClassSafeModuleIndex(root, index);
  const activePane = panels[activeIndex];
  const maxLeft = Math.max(0, (viewport.scrollWidth || 0) - (viewport.clientWidth || 0));
  const targetLeft = Math.max(0, Math.min(maxLeft, activePane ? (activePane.offsetLeft || 0) : 0));

  if (typeof viewport.scrollTo === "function") {
    viewport.scrollTo({ left: targetLeft, top: 0, behavior });
  } else {
    viewport.scrollLeft = targetLeft;
  }

  return true;
}

function syncAdminProgressClassPaneLayout(overview, options = {}) {
  const { root, viewport, track, panels } = getAdminProgressClassPaneElements(overview);

  if (!root || !viewport || !track || !panels.length) {
    return false;
  }

  const requestedIndex = Number(root.dataset.activeModuleIndex || adminProgressClassActiveModuleIndex || 0);
  const activeIndex = getAdminProgressClassSafeModuleIndex(root, requestedIndex);
  const viewportWidth = Math.max(1, viewport.clientWidth || root.clientWidth || 1);
  const slots = Math.min(getAdminProgressClassVisibleSlots(), panels.length);
  const gap = slots >= 5 ? 14 : (slots >= 3 ? 12 : 0);
  const paneWidth = Math.max(1, Math.floor((viewportWidth - ((slots - 1) * gap)) / slots));
  const paneStep = paneWidth + gap;
  const edgeSpace = 0;

  root.style.setProperty("--admin-progress-class-visible-slots", String(slots));
  root.style.setProperty("--admin-progress-class-pane-gap", `${gap}px`);
  root.style.setProperty("--admin-progress-class-pane-width", `${paneWidth}px`);
  root.style.setProperty("--admin-progress-class-pane-step", `${paneStep}px`);
  root.style.setProperty("--admin-progress-class-edge-space", `${edgeSpace}px`);
  root.style.setProperty("--admin-progress-class-track-offset", "0px");
  root.style.setProperty("--admin-progress-class-active-index", String(activeIndex));
  track.style.setProperty("--admin-progress-class-track-offset", "0px");
  track.style.transform = "";

  setAdminProgressClassActiveModuleIndex(root, activeIndex, { resetGridScroll: false });

  if (options.scrollToActive !== false) {
    scrollAdminProgressClassNativeViewportToIndex(root, activeIndex, options.behavior || "auto");
  }

  return true;
}

function resetAdminProgressClassPaneGridScroll(overview, index) {
  const root = overview || getAdminProgressClassOverviewElement();

  if (!root) return false;

  const panels = Array.from(root.querySelectorAll("[data-admin-class-progress-module-pane]"));
  const requestedIndex = Number(index !== undefined ? index : root.dataset.activeModuleIndex || adminProgressClassActiveModuleIndex || 0);
  const safeIndex = Math.max(0, Math.min(panels.length - 1, Number.isFinite(requestedIndex) ? requestedIndex : 0));
  const activePane = panels[safeIndex];
  const taskScroll = activePane ? activePane.querySelector("[data-admin-class-progress-module-task-scroll]") : null;
  const activeBody = activePane ? activePane.querySelector("[data-admin-class-progress-module-body]") : null;
  const studentList = root.querySelector("[data-admin-class-progress-student-list]");

  if (taskScroll) {
    if (typeof taskScroll.scrollTo === "function") {
      taskScroll.scrollTo({ left: 0, top: 0, behavior: "auto" });
    } else {
      taskScroll.scrollLeft = 0;
    }
  }

  if (activeBody && studentList) {
    activeBody.scrollTop = studentList.scrollTop || 0;
  }

  return !!taskScroll || !!activeBody;
}

function bindAdminProgressClassNativeSwipe(overview) {
  const { root, viewport } = getAdminProgressClassPaneElements(overview);

  if (!root || !viewport || viewport.__m4lAdminClassNativeSwipeBound === true) {
    return !!viewport;
  }

  let frame = 0;
  const syncFromScroll = () => {
    frame = 0;
    const nextIndex = getAdminProgressClassNativeSwipeIndex(root);
    const previousIndex = Number(root.dataset.activeModuleIndex || adminProgressClassActiveModuleIndex || 0);

    if (nextIndex !== previousIndex) {
      setAdminProgressClassActiveModuleIndex(root, nextIndex, { resetGridScroll: true });
    }
  };

  viewport.__m4lAdminClassNativeSwipeBound = true;
  viewport.addEventListener("scroll", () => {
    if (frame) return;

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      frame = window.requestAnimationFrame(syncFromScroll);
    } else {
      syncFromScroll();
    }
  }, { passive: true });

  return true;
}

function bindAdminProgressClassAttachedScrollSync(overview) {
  const root = overview || getAdminProgressClassOverviewElement();

  if (!root || root.__m4lAdminClassAttachedScrollBound === true) {
    return !!root;
  }

  const getSyncScrollers = () => {
    return [
      root.querySelector("[data-admin-class-progress-student-list]"),
      ...Array.from(root.querySelectorAll("[data-admin-class-progress-module-body]"))
    ].filter(Boolean);
  };

  let isSyncing = false;

  const syncTo = source => {
    if (!source || isSyncing) return;
    isSyncing = true;
    const top = source.scrollTop || 0;
    getSyncScrollers().forEach(target => {
      if (target && target !== source && Math.abs((target.scrollTop || 0) - top) > 1) {
        target.scrollTop = top;
      }
    });
    isSyncing = false;
  };

  getSyncScrollers().forEach(scroller => {
    if (scroller.__m4lAdminClassAttachedScrollListenerBound === true) return;
    scroller.__m4lAdminClassAttachedScrollListenerBound = true;
    scroller.addEventListener("scroll", () => syncTo(scroller), { passive: true });
  });

  root.__m4lAdminClassAttachedScrollBound = true;
  return true;
}

function bindAdminProgressClassPaneResize() {
  if (typeof window === "undefined" || window.__m4lAdminProgressClassPaneResizeBound === true) {
    return false;
  }

  window.__m4lAdminProgressClassPaneResizeBound = true;
  window.addEventListener("resize", () => {
    const root = getAdminProgressClassOverviewElement();
    if (!root) return;

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => syncAdminProgressClassPaneLayout(root, { behavior: "auto" }));
    } else {
      syncAdminProgressClassPaneLayout(root, { behavior: "auto" });
    }
  }, { passive: true });

  return true;
}

function updateAdminProgressClassModuleStepper(overview) {
  // V90.6 trial compatibility wrapper: this now updates native module-header
  // swipe state instead of a visible stepper.
  const root = overview || getAdminProgressClassOverviewElement();

  if (!root) return false;

  const panels = Array.from(root.querySelectorAll("[data-admin-class-progress-module-pane]"));
  if (!panels.length) return false;

  const requestedIndex = Number(root.dataset.activeModuleIndex || adminProgressClassActiveModuleIndex || 0);
  const activeIndex = getAdminProgressClassSafeModuleIndex(root, requestedIndex);

  syncAdminProgressClassPaneLayout(root, { scrollToActive: false });
  setAdminProgressClassActiveModuleIndex(root, activeIndex, { resetGridScroll: false });
  bindAdminProgressClassNativeSwipe(root);
  bindAdminProgressClassAttachedScrollSync(root);
  scrollAdminProgressClassNativeViewportToIndex(root, activeIndex, "auto");

  return true;
}

function scrollAdminProgressClassModuleToIndex(index) {
  const root = getAdminProgressClassOverviewElement();

  if (!root) return false;

  const panels = Array.from(root.querySelectorAll("[data-admin-class-progress-module-pane]"));
  if (!panels.length) return false;

  const activeIndex = getAdminProgressClassSafeModuleIndex(root, index);
  setAdminProgressClassActiveModuleIndex(root, activeIndex, { resetGridScroll: true });
  syncAdminProgressClassPaneLayout(root, { scrollToActive: false });
  scrollAdminProgressClassNativeViewportToIndex(root, activeIndex, "smooth");

  return true;
}



function renderAdminProgressClassGridTaskHeader(task, module, moduleIndex = 0) {  
  const taskName = task.taskname || "Untitled Task";  
  const moduleName = module.modulename || module.subjectname || "Module";  
  const themeClass = getAdminProgressClassMatrixModuleThemeClass(moduleIndex);  
  
  return `  
    <th class="admin-progress-class-grid-task-header ${themeClass}" scope="col" aria-label="${escapeForAttribute(moduleName)}: ${escapeForAttribute(taskName)}">  
      <span class="admin-progress-class-grid-task-title-wrap">  
        <span class="admin-progress-class-grid-task-title">${escapeHtml(taskName)}</span>  
      </span>  
    </th>  
  `;  
}  
  

function findAdminProgressClassGridTaskRow(student, module, task) {  
  const moduleKey = getAdminModuleKey(module);  
  const taskKey = getAdminTaskKey(task);  
  const rows = student && student.rowsByModule ? (student.rowsByModule[moduleKey] || []) : [];  
  
  return rows.find(row => getAdminTaskKey(row) === taskKey) || null;  
}  
  
function renderAdminProgressClassGridTaskCell(student, module, task, moduleIndex = 0) {  
  const row = findAdminProgressClassGridTaskRow(student, module, task);  
  const studentName = student.username || "Student";  
  const moduleName = module.modulename || module.subjectname || "Module";  
  const taskName = task.taskname || "Untitled Task";  
  const state = getAdminProgressClassMatrixCellState(row);  
  const stateLabel = getAdminProgressClassMatrixStateLabel(state);  
  const label = `${studentName}, ${moduleName}, ${taskName}: ${stateLabel}`;  
  const studentTaskId = row ? String(row.studenttaskid || "") : "";  
  const themeClass = getAdminProgressClassMatrixModuleThemeClass(moduleIndex);  
  
  return `  
    <td class="admin-progress-class-grid-task-cell ${themeClass}">  
      <div class="admin-progress-class-grid-task-status">  
        <button  
          type="button"  
          class="admin-progress-class-grid-status-button admin-progress-class-grid-status-button--${escapeForAttribute(state)}"  
          data-progress-action="cycle-admin-progress-class-cell"  
          data-studenttaskid="${escapeForAttribute(studentTaskId)}"  
          data-status="${escapeForAttribute(state)}"  
          aria-label="${escapeForAttribute(label)}"  
          ${studentTaskId ? "" : "disabled"}  
        >  
          ${renderAdminProgressClassGridStatusSymbol(state)}  
        </button>  
      </div>  
    </td>  
  `;  
}  
  
function renderAdminProgressClassGridStatusSymbol(state) {  
  const normalizedState = String(state || "blank");  
  
  if (normalizedState === "verified") {  
    return `  
      <span class="admin-progress-class-grid-status-symbol status-tick status-tick-verified" aria-hidden="true">${M4L_PROGRESS_TICK}</span>  
      <span class="visually-hidden">Verified</span>  
    `;  
  }  
  
  if (normalizedState === "complete") {  
    return `  
      <span class="admin-progress-class-grid-status-symbol status-tick status-tick-complete" aria-hidden="true">${M4L_PROGRESS_TICK}</span>  
      <span class="visually-hidden">Complete</span>  
    `;  
  }  
  
  return `  
    <span class="admin-progress-class-grid-status-symbol admin-progress-class-grid-status-symbol--empty-edit-text" aria-hidden="true">✎</span>  
    <span class="visually-hidden">Empty / editable</span>  
  `;  
}  
  
function updateAdminProgressClassMatrixCellButton(button, nextState) {  
  if (!button) return false;  
  
  ["blank", "complete", "verified"].forEach(state => {  
    button.classList.remove(`admin-progress-class-grid-status-button--${state}`);  
  });  
  
  button.classList.add(`admin-progress-class-grid-status-button--${nextState}`);  
  button.dataset.status = nextState;
  button.dataset.state = nextState === "blank" ? "empty" : nextState;  
  button.innerHTML = renderAdminProgressClassGridStatusSymbol(nextState);  
  
  const existingLabel = button.getAttribute("aria-label") || "Progress cell";  
  const baseLabel = existingLabel.replace(/: (Blank|Complete|Verified)$/i, "");  
  button.setAttribute("aria-label", `${baseLabel}: ${getAdminProgressClassMatrixStateLabel(nextState)}`);  
  
  return true;  
}  
  

async function saveAdminProgressClassMatrixPendingChanges(button) {  
  if (adminProgressClassMatrixSaveInFlight) {  
    return adminProgressClassMatrixSaveInFlight;  
  }  
  
  if (!progressPendingUpdates || Object.keys(progressPendingUpdates).length === 0) {  
    return false;  
  }  
  
  if (button) {  
    button.classList.add("is-saving");  
  }  
  if (button) {  
    const label = button.querySelector(".admin-progress-matrix-edit-label");  
    if (label) label.textContent = "Saving";  
  }  
  updateAdminProgressMatrixSaveStatus("Saving...");  
  
  adminProgressClassMatrixSaveInFlight = Promise.resolve()  
    .then(() => saveProgressPendingChanges({ reload: false, alert: false }))  
    .then(saved => {  
      if (saved) {  
        if (typeof clearAdminProgressDashboardCache === "function") {  
          clearAdminProgressDashboardCache();  
        }  
        if (typeof refreshAdminProgressDashboardCacheInBackground === "function") {  
          refreshAdminProgressDashboardCacheInBackground({ render: false });  
        }  
        updateAdminProgressMatrixSaveStatus("Saved");  
      }  
      return saved;  
    })  
    .catch(error => {  
      console.error("Failed to save progress matrix update:", error);  
      updateAdminProgressMatrixSaveStatus("Save failed");  
      return false;  
    })  
    .finally(() => {  
      if (button) {  
        button.classList.remove("is-saving");  
      }  
      if (!adminProgressMatrixEditMode) {  
        updateAdminProgressMatrixEditControls();  
      }  
      adminProgressClassMatrixSaveInFlight = null;  
    });  
  
  return adminProgressClassMatrixSaveInFlight;  
}  
  
function cycleAdminProgressClassMatrixCell(button) {  
  if (!button || button.disabled) return false;  
  
  if (!adminProgressMatrixEditMode) {  
    return false;  
  }  
  
  const studentTaskId = String(button.dataset.studenttaskid || "");  
  if (!studentTaskId) return false;  
  
  const currentState = String(button.dataset.status || "blank");  
  const nextState = getNextAdminProgressClassMatrixCellState(currentState);  
  
  applyAdminProgressClassMatrixStateToRow(studentTaskId, nextState);  
  updateAdminProgressClassMatrixCellButton(button, nextState);  
  const cell = button.closest(".admin-progress-class-grid-task-cell");
  if (cell) cell.classList.add("is-pending");  
  updateAdminProgressMatrixSaveStatus(`${getAdminProgressMatrixPendingCount()} pending`);  
  
  return true;  
}  
  
function bindAdminProgressClassMatrixLiveCells() {  
  if (typeof document === "undefined" || document.__m4lAdminProgressClassMatrixLiveBound === true) {  
    return false;  
  }  
  
  document.__m4lAdminProgressClassMatrixLiveBound = true;  
  
  document.addEventListener("click", event => {  
    const target = event.target;  
    const button = target && typeof target.closest === "function"  
      ? target.closest('[data-progress-action="cycle-admin-progress-class-cell"]')  
      : null;  
  
    if (!button) return;  
  
    event.preventDefault();  
    event.stopImmediatePropagation();  

    cycleAdminProgressClassMatrixCell(button);  
  }, true);  
  
  document.addEventListener("keydown", event => {  
    if (!event || (event.key !== "Enter" && event.key !== " ")) return;  
  
    const target = event.target;  
    const button = target && typeof target.closest === "function"  
      ? target.closest('[data-progress-action="cycle-admin-progress-class-cell"]')  
      : null;  
  
    if (!button) return;  
  
    event.preventDefault();  
    event.stopImmediatePropagation();  

    cycleAdminProgressClassMatrixCell(button);  
  }, true);  
  
  return true;  
}  
  
  







function escapeCssAttributeValue(value) {  
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {  
    return CSS.escape(String(value || ""));  
  }  
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');  
}  
  


function renderAdminProgressDashboard(modules) {  
  const dashboard = getDomElement("admin-progress-dashboard");  
  if (!dashboard) return;  
  
  const list = Array.isArray(modules) ? modules : [];  
  if (shouldRenderAdminProgressClassOverview() && (list.length > 0 || (adminProgressDashboardRows || []).length > 0)) {  
    setDomHtml(dashboard, renderAdminProgressClassOverview(list));  
    bindProgressUiHandlers(dashboard);
    bindAdminProgressClassPaneResize();
    const classOverview = dashboard.querySelector("[data-admin-class-progress-overview]");
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => updateAdminProgressClassModuleStepper(classOverview));
    } else {
      updateAdminProgressClassModuleStepper(classOverview);
    }
    return;  
  }  
  
  if (list.length === 0) {  
    setDomHtml(dashboard, "");  
    bindProgressUiHandlers(dashboard);
    return;  
  }  
  
  // V90.8.7.2: remove the temporary Progress cleanup placeholder. Keep the
  // landing quiet if no active Class/All grid can be rendered.
  setDomHtml(dashboard, "");
  bindProgressUiHandlers(dashboard);  
}  
  










function buildAdminIndividualStudentModules(rows) {  
  const moduleMap = {};  
  
  (Array.isArray(rows) ? rows : [])  
    .map(normalizeProgressStudentRow)  
    .filter(row => String(row.classgroup || "").trim() !== "0")  
    .sort(sortByModuleThenTask)  
    .forEach(row => {  
      const moduleKey = getAdminModuleKey(row);  
  
      if (!moduleMap[moduleKey]) {  
        moduleMap[moduleKey] = {  
          moduleid: row.moduleid || row.subjectid || moduleKey,  
          modulename: getAdminModuleName(row),  
          rows: []  
        };  
      }  
  
      moduleMap[moduleKey].rows.push(row);  
    });  
  
  return Object.values(moduleMap).sort(sortModuleGroupsByModuleId);  
}  
  
async function requestCloseAdminIndividualStudentView() {  
  if (hasProgressPendingUpdates()) {  
    const saveStarted = startAdminProgressBackgroundSave({ confirm: true });  
  
    if (saveStarted === false) {  
      return false;  
    }  
  
    clearAdminProgressDashboardCache();  
  }  
  
  // V90.8.7.2: close.svg returns to the clean Progress landing, not the old
  // grouped student-card Individual landing.
  await showProgressReport();  
  return true;  
}  
  
function getAdminIndividualProgressModuleKey(module, index = 0) {
  return String(
    (module && (module.moduleid || module.subjectid || module.modulename || module.subjectname)) ||
    `module-${index + 1}`
  );
}

function getAdminIndividualProgressModuleTitle(module, index = 0) {
  return String((module && (module.modulename || module.subjectname)) || `Module ${index + 1}`);
}

function getAdminIndividualProgressModules(rows) {
  return buildAdminIndividualStudentModules(rows).map((module, index) => ({
    ...module,
    subjectid: getAdminIndividualProgressModuleKey(module, index),
    subjectname: getAdminIndividualProgressModuleTitle(module, index),
    tasks: Array.isArray(module && module.rows) ? module.rows : []
  }));
}

function clampAdminIndividualProgressModuleIndex(index, modules) {
  const list = Array.isArray(modules) ? modules : getAdminIndividualProgressModules(currentProgressRows);
  const maxIndex = Math.max(0, list.length - 1);
  const numberIndex = Number(index);
  return Math.max(0, Math.min(maxIndex, Number.isFinite(numberIndex) ? numberIndex : 0));
}

function renderAdminIndividualProgressStepperArrow(direction, isDisabled) {
  const normalizedDirection = Number(direction || 0) < 0 ? -1 : 1;
  const isPrevious = normalizedDirection < 0;
  const label = isPrevious ? "Previous module" : "Next module";
  const iconClass = isPrevious ? "app-icon-left" : "app-icon-right";

  return `
    <button
      type="button"
      class="student-progress-stepper-arrow admin-individual-progress-stepper-arrow admin-individual-progress-stepper-arrow--${isPrevious ? "previous" : "next"}"
      data-progress-action="step-admin-individual-progress-module"
      data-progress-step="${normalizedDirection}"
      data-progress-step-direction="${isPrevious ? "previous" : "next"}"
      aria-label="${label}"
      title="${label}"
      ${isDisabled ? 'disabled aria-disabled="true"' : 'aria-disabled="false"'}
    >
      <span class="app-icon ${iconClass}" aria-hidden="true"></span>
      <span class="visually-hidden">${label}</span>
    </button>
  `;
}

function renderAdminIndividualProgressSwipeDots(modules, activeIndex) {
  const list = Array.isArray(modules) ? modules : [];
  if (list.length < 1) return "";

  const safeIndex = clampAdminIndividualProgressModuleIndex(activeIndex, list);

  return `
    <div class="m4l-progress-swipe-dots student-progress-swipe-dots student-progress-module-numbers admin-individual-progress-module-numbers" data-admin-individual-progress-dots aria-label="Individual Progress modules">
      ${list.map((module, index) => {
        const isActive = index === safeIndex;
        const numberLabel = String(index + 1);
        const title = getAdminIndividualProgressModuleTitle(module, index);
        return `
          <button
            type="button"
            class="m4l-progress-swipe-dot student-progress-swipe-dot student-progress-module-number admin-individual-progress-module-number${isActive ? " is-active" : ""}"
            data-progress-action="scroll-admin-individual-progress-module"
            data-progress-panel-index="${index}"
            aria-label="Show module ${numberLabel}: ${escapeForAttribute(title)}"
            aria-current="${isActive ? "true" : "false"}"
          >${escapeHtml(numberLabel)}</button>
        `;
      }).join("")}
    </div>
  `;
}

function renderAdminIndividualProgressGlobalPane(studentName, modules, activeIndex) {
  const list = Array.isArray(modules) ? modules : [];
  const safeIndex = clampAdminIndividualProgressModuleIndex(activeIndex, list);
  const hasMultipleModules = list.length > 1;
  const safeStudentName = studentName || progressState.studentName || "Student";

  return `
    <section class="admin-individual-progress-global-pane" aria-label="${escapeForAttribute(safeStudentName)} Individual Progress controls">
      <div class="admin-individual-progress-student-row">
        <button
          type="button"
          class="admin-progress-close-btn admin-individual-progress-close-btn"
          data-progress-action="close-admin-individual-student-view"
          aria-label="Return to Individual Progress student list"
          title="Close"
        >
          <span class="app-icon app-icon-close" aria-hidden="true"></span>
          <span class="visually-hidden">Close</span>
        </button>
        <h3 class="admin-individual-progress-student-name">${escapeHtml(safeStudentName)}</h3>
        <span class="admin-individual-progress-student-row-spacer" aria-hidden="true"></span>
      </div>
      <div class="student-progress-top-control-row student-progress-stepper-row admin-individual-progress-stepper-row">
        ${renderAdminIndividualProgressStepperArrow(-1, !hasMultipleModules || safeIndex <= 0)}
        <div class="student-progress-top-control-dots student-progress-stepper-number-strip admin-individual-progress-stepper-number-strip" data-admin-individual-progress-number-nav>
          ${renderAdminIndividualProgressSwipeDots(list, safeIndex)}
        </div>
        ${renderAdminIndividualProgressStepperArrow(1, !hasMultipleModules || safeIndex >= list.length - 1)}
      </div>
    </section>
  `;
}

function renderAdminIndividualProgressTaskTableHeader() {
  return `
    <div class="student-progress-grid-row student-progress-grid-heading-row admin-individual-progress-grid-heading-row" role="row" aria-hidden="true">
      <div class="student-progress-grid-task-heading" role="columnheader" aria-label="Task"></div>
      <div class="student-progress-grid-status-heading" role="columnheader"><span class="visually-hidden">Progress status</span></div>
    </div>
  `;
}

function renderAdminIndividualProgressStatusSymbol(state) {
  const normalizedState = String(state || "blank");

  if (normalizedState === "verified") {
    return `
      <span class="admin-progress-class-grid-status-symbol status-tick status-tick-verified" aria-hidden="true">${M4L_PROGRESS_TICK}</span>
      <span class="visually-hidden">Verified</span>
    `;
  }

  if (normalizedState === "complete") {
    return `
      <span class="admin-progress-class-grid-status-symbol status-tick status-tick-complete" aria-hidden="true">${M4L_PROGRESS_TICK}</span>
      <span class="visually-hidden">Complete</span>
    `;
  }

  return `
    <span class="admin-progress-class-grid-status-symbol admin-progress-class-grid-status-symbol--empty-edit-text admin-individual-progress-empty-edit-icon" aria-hidden="true">✎</span>
    <span class="visually-hidden">Empty / editable</span>
  `;
}

function updateAdminIndividualProgressCellButton(button, nextState) {
  if (!button) return false;

  ["blank", "complete", "verified"].forEach(state => {
    button.classList.remove(`admin-progress-class-grid-status-button--${state}`);
  });

  button.classList.add(`admin-progress-class-grid-status-button--${nextState}`);
  button.dataset.status = nextState;
  button.dataset.state = nextState === "blank" ? "empty" : nextState;
  button.innerHTML = renderAdminIndividualProgressStatusSymbol(nextState);

  const existingLabel = button.getAttribute("aria-label") || "Progress cell";
  const baseLabel = existingLabel.replace(/: (Blank|Complete|Verified)$/i, "");
  button.setAttribute("aria-label", `${baseLabel}: ${getAdminProgressClassMatrixStateLabel(nextState)}`);
  return true;
}

function renderAdminIndividualProgressStatusButton(row) {
  const normalizedRow = normalizeProgressStudentRow(row || {});
  const studentTaskId = String(normalizedRow.studenttaskid || "");
  const taskName = normalizedRow.taskname || "Untitled Task";
  const state = getAdminProgressClassMatrixCellState(normalizedRow);
  const stateLabel = getAdminProgressClassMatrixStateLabel(state);

  return `
    <button
      type="button"
      class="student-progress-grid-status-cell admin-individual-progress-status-cell admin-progress-class-grid-status-button admin-progress-class-grid-status-button--${escapeForAttribute(state)}"
      data-progress-action="cycle-admin-individual-progress-cell"
      data-studenttaskid="${escapeForAttribute(studentTaskId)}"
      data-status="${escapeForAttribute(state)}"
      data-state="${escapeForAttribute(state === "blank" ? "empty" : state)}"
      aria-label="${escapeForAttribute(taskName)}: ${escapeForAttribute(stateLabel)}"
      ${studentTaskId ? "" : "disabled"}
    >
      ${renderAdminIndividualProgressStatusSymbol(state)}
    </button>
  `;
}

function renderAdminIndividualProgressTaskTableRow(row) {
  const normalizedRow = normalizeProgressStudentRow(row || {});
  const taskName = normalizedRow.taskname || "Untitled Task";

  return `
    <div class="student-progress-grid-row admin-individual-progress-grid-row" role="row">
      <div class="student-progress-grid-task-name admin-individual-progress-task-name" role="cell">${escapeHtml(taskName)}</div>
      ${renderAdminIndividualProgressStatusButton(normalizedRow)}
    </div>
  `;
}

function renderAdminIndividualProgressTaskTable(module) {
  const title = getAdminIndividualProgressModuleTitle(module, 0);
  const taskRowsHtml = [...(Array.isArray(module && module.tasks) ? module.tasks : [])]
    .sort(sortByModuleThenTask)
    .map(row => renderAdminIndividualProgressTaskTableRow(row))
    .join("");

  return `
    <section class="admin-progress-task-card admin-individual-progress-module-task-card student-progress-module-task-card student-progress-module-grid-card student-progress-task-list-panel" aria-label="${escapeForAttribute(title)} progress tasks">
      <div class="student-progress-module-grid admin-individual-progress-module-grid" role="table" aria-label="${escapeForAttribute(title)} progress tasks">
        ${renderAdminIndividualProgressTaskTableHeader()}
        ${taskRowsHtml}
      </div>
    </section>
  `;
}

function renderAdminIndividualProgressModulePanel(module, index, moduleCount) {
  const moduleKey = getAdminIndividualProgressModuleKey(module, index);
  const title = getAdminIndividualProgressModuleTitle(module, index);
  const isEditing = isAdminIndividualProgressModuleEditing(moduleKey);

  return `
    <section
      class="m4l-progress-swipe-panel m4l-progress-swipe-panel--full m4l-responsive-swipe-panel student-progress-module-panel admin-individual-progress-module-panel${index === adminIndividualProgressActiveModuleIndex ? " is-active" : ""}${isEditing ? " is-editing" : " is-viewing"}"
      data-admin-individual-progress-panel
      data-progress-panel-index="${index}"
      data-progress-module-key="${escapeForAttribute(moduleKey)}"
      aria-label="${escapeForAttribute(title)}"
    >
      <div class="admin-individual-progress-module-card-shell">
        <div
          class="student-progress-panel-module-header student-progress-header-panel admin-individual-progress-module-header"
          data-admin-individual-progress-panel-module-header="${escapeForAttribute(moduleKey)}"
          aria-label="${escapeForAttribute(title)} module progress"
        >
          <div class="student-progress-panel-module-title-block">
            <h2 class="student-progress-panel-module-title admin-individual-progress-module-title">${escapeHtml(title)}</h2>
          </div>
          ${renderAdminIndividualProgressEditToggle(moduleKey)}
        </div>
        ${renderAdminIndividualProgressTaskTable(module)}
      </div>
    </section>
  `;
}

function getAdminIndividualProgressViewport() {
  return document.querySelector("#admin-progress-dashboard [data-admin-individual-progress-viewport]");
}

function getAdminIndividualProgressTrack() {
  return document.querySelector("#admin-progress-dashboard [data-admin-individual-progress-track]");
}

function getAdminIndividualProgressPanels() {
  const track = getAdminIndividualProgressTrack();
  if (!track || !track.children) return [];
  return Array.from(track.children).filter(child => child && child.matches && child.matches("[data-admin-individual-progress-panel]"));
}

function getAdminIndividualProgressActiveIndexFromViewport() {
  const viewport = getAdminIndividualProgressViewport();
  const panels = getAdminIndividualProgressPanels();
  if (!viewport || !panels.length) return 0;

  const viewportCenter = (viewport.scrollLeft || 0) + ((viewport.clientWidth || 0) / 2);
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  panels.forEach((panel, index) => {
    const panelCenter = (panel.offsetLeft || 0) + ((panel.offsetWidth || panel.clientWidth || 0) / 2);
    const distance = Math.abs(panelCenter - viewportCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function updateAdminIndividualProgressModuleStepper(index = adminIndividualProgressActiveModuleIndex) {
  const panels = getAdminIndividualProgressPanels();
  const safeIndex = clampAdminIndividualProgressModuleIndex(index, panels);
  adminIndividualProgressActiveModuleIndex = safeIndex;

  panels.forEach((panel, panelIndex) => {
    panel.classList.toggle("is-active", panelIndex === safeIndex);
    panel.classList.toggle("is-adjacent", Math.abs(panelIndex - safeIndex) === 1);
    panel.classList.toggle("is-far", Math.abs(panelIndex - safeIndex) > 1);
  });

  document.querySelectorAll("#admin-progress-dashboard .admin-individual-progress-module-number").forEach((button, buttonIndex) => {
    const isActive = buttonIndex === safeIndex;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "true" : "false");
  });

  document.querySelectorAll("#admin-progress-dashboard .admin-individual-progress-stepper-arrow").forEach(button => {
    const direction = Number(button.dataset.progressStep || 0);
    const disabled = panels.length <= 1 || (direction < 0 && safeIndex <= 0) || (direction > 0 && safeIndex >= panels.length - 1);
    button.disabled = disabled;
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
  });

  const nav = document.querySelector("#admin-progress-dashboard [data-admin-individual-progress-number-nav]");
  const activeButton = document.querySelector("#admin-progress-dashboard .admin-individual-progress-module-number.is-active");
  if (nav && activeButton && typeof nav.scrollTo === "function") {
    const targetLeft = Math.max(0, (activeButton.offsetLeft || 0) - ((nav.clientWidth || 0) / 2) + ((activeButton.clientWidth || 0) / 2));
    nav.scrollTo({ left: targetLeft, behavior: "smooth" });
  }

  return true;
}

function scrollAdminIndividualProgressModuleToIndex(index, options = {}) {
  const viewport = getAdminIndividualProgressViewport();
  const panels = getAdminIndividualProgressPanels();
  if (!viewport || !panels.length) return false;

  const safeIndex = clampAdminIndividualProgressModuleIndex(index, panels);
  const panel = panels[safeIndex];
  if (!panel) return false;

  adminIndividualProgressActiveModuleIndex = safeIndex;
  updateAdminIndividualProgressModuleStepper(safeIndex);

  const targetLeft = Math.max(0, Math.min(
    Math.max(0, (viewport.scrollWidth || 0) - (viewport.clientWidth || 0)),
    (panel.offsetLeft || 0) - (((viewport.clientWidth || 0) - (panel.clientWidth || panel.offsetWidth || 0)) / 2)
  ));

  if (typeof viewport.scrollTo === "function") {
    viewport.scrollTo({
      left: targetLeft,
      top: 0,
      behavior: options.behavior || "smooth"
    });
  } else {
    viewport.scrollLeft = targetLeft;
  }

  return true;
}

function stepAdminIndividualProgressModuleBy(step) {
  const panels = getAdminIndividualProgressPanels();
  const nextIndex = clampAdminIndividualProgressModuleIndex(adminIndividualProgressActiveModuleIndex + Number(step || 0), panels);
  return scrollAdminIndividualProgressModuleToIndex(nextIndex);
}

function bindAdminIndividualProgressSwipeControls() {
  const viewport = getAdminIndividualProgressViewport();
  if (!viewport || viewport.dataset.adminIndividualProgressSwipeBound === "true") {
    updateAdminIndividualProgressModuleStepper(adminIndividualProgressActiveModuleIndex);
    return !!viewport;
  }

  viewport.dataset.adminIndividualProgressSwipeBound = "true";
  let pendingFrame = 0;

  viewport.addEventListener("scroll", () => {
    if (pendingFrame || typeof window === "undefined") return;
    pendingFrame = window.requestAnimationFrame(() => {
      pendingFrame = 0;
      updateAdminIndividualProgressModuleStepper(getAdminIndividualProgressActiveIndexFromViewport());
    });
  }, { passive: true });

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => scrollAdminIndividualProgressModuleToIndex(adminIndividualProgressActiveModuleIndex, { behavior: "auto" }));
  } else {
    scrollAdminIndividualProgressModuleToIndex(adminIndividualProgressActiveModuleIndex, { behavior: "auto" });
  }

  return true;
}

function updateAdminIndividualProgressRowsInMemory(studenttaskid, nextState) {
  const update = getAdminProgressClassMatrixStateUpdate(nextState);
  const targetId = String(studenttaskid || "");
  if (!targetId) return false;

  const updateRow = row => {
    if (!row) return false;
    const rowId = String(row.studenttaskid || row.StudentTaskID || row.StudentTaskId || "");
    if (rowId !== targetId) return false;
    row.completestatus = update.completeStatus;
    row.completeStatus = update.completeStatus;
    row.CompleteStatus = update.completeStatus;
    row.verifystatus = update.verifyStatus;
    row.verifyStatus = update.verifyStatus;
    row.VerifyStatus = update.verifyStatus;
    return true;
  };

  [currentProgressRows, adminProgressIndividualRows, adminProgressDashboardRows, adminProgressActiveTaskRows, adminProgressPopoutRows].forEach(collection => {
    if (Array.isArray(collection)) {
      collection.forEach(updateRow);
    }
  });

  if (!progressPendingUpdates[targetId]) {
    progressPendingUpdates[targetId] = { studenttaskid: targetId };
  }

  progressPendingUpdates[targetId].completeStatus = update.completeStatus;
  progressPendingUpdates[targetId].verifyStatus = update.verifyStatus;
  return true;
}

function cycleAdminIndividualProgressCell(button) {
  if (!button || button.disabled) return false;

  if (!canToggleAdminIndividualProgressCell(button)) {
    return false;
  }

  const studentTaskId = String(button.dataset.studenttaskid || "");
  if (!studentTaskId) return false;

  const currentState = String(button.dataset.status || "blank");
  const nextState = getNextAdminProgressClassMatrixCellState(currentState);

  updateAdminIndividualProgressRowsInMemory(studentTaskId, nextState);
  updateAdminIndividualProgressCellButton(button, nextState);
  const cell = button.closest(".admin-individual-progress-status-cell, .student-progress-grid-status-cell");
  if (cell) cell.classList.add("is-pending");

  return true;
}

function renderAdminIndividualSelectedStudentModules(rows, studentName) {
  const dashboard = getDomElement("admin-progress-dashboard");
  if (!dashboard) return false;

  const safeStudentName = studentName || progressState.studentName || "Student";
  const normalizedRows = (Array.isArray(rows) ? rows : []).map(normalizeProgressStudentRow);
  const modules = getAdminIndividualProgressModules(normalizedRows);

  if (modules.length === 0) {
    // V90.8.7.3: keep the selected-student transition quiet. Avoid flashing a
    // temporary no-progress message while a newly selected student's rows settle.
    setDomHtml(dashboard, `
      <section class="admin-individual-progress-shell is-viewing" aria-label="${escapeForAttribute(safeStudentName)} Individual Progress">
        ${renderAdminIndividualProgressGlobalPane(safeStudentName, [], 0)}
      </section>
    `);
    bindProgressUiHandlers(dashboard);
    return true;
  }

  adminIndividualProgressActiveModuleIndex = clampAdminIndividualProgressModuleIndex(adminIndividualProgressActiveModuleIndex, modules);

  setDomHtml(dashboard, `
    <section class="admin-individual-progress-shell ${hasAdminIndividualProgressEditingModule() ? "is-editing has-editing-module" : "is-viewing"}" data-admin-individual-progress-shell aria-label="${escapeForAttribute(safeStudentName)} Individual Progress">
      <div class="m4l-progress-swipe-shell student-progress-swipe-shell admin-individual-progress-swipe-shell" data-admin-individual-progress-swipe>
        ${renderAdminIndividualProgressGlobalPane(safeStudentName, modules, adminIndividualProgressActiveModuleIndex)}
        <div class="student-progress-pane-viewport admin-individual-progress-pane-viewport" data-admin-individual-progress-viewport>
          <div
            id="admin-individual-progress-swipe-track"
            class="m4l-progress-swipe-track m4l-progress-swipe-track--full m4l-responsive-swipe-track student-progress-swipe-track admin-individual-progress-swipe-track"
            data-admin-individual-progress-track
            data-progress-active-index="${adminIndividualProgressActiveModuleIndex}"
            aria-label="${escapeForAttribute(safeStudentName)} progress modules"
          >
            ${modules.map((module, index) => renderAdminIndividualProgressModulePanel(module, index, modules.length)).join("")}
          </div>
        </div>
      </div>
    </section>
  `);

  bindProgressUiHandlers(dashboard);
  bindAdminIndividualProgressSwipeControls();
  syncAdminIndividualProgressModuleEditDom();
  updateAdminIndividualProgressModuleStepper(adminIndividualProgressActiveModuleIndex);
  return true;
}

function getAdminCachedRowsForStudent(studentid, username) {  
  const targetStudentId = String(studentid || "");  
  const targetUsername = String(username || "");  
  
  return (adminProgressIndividualRows.length ? adminProgressIndividualRows : adminProgressDashboardRows)  
    .map(normalizeProgressStudentRow)  
    .filter(row => {  
      if (String(row.classgroup || "").trim() === "0") return false;  
      const rowStudentId = String(row.studentid || "");  
      const rowUsername = String(row.username || "");  
      return (targetStudentId && rowStudentId === targetStudentId) ||  
        (targetUsername && rowUsername === targetUsername);  
    });  
}  
  
async function loadAdminIndividualSelectedStudentProgress(studentid, username) {
  const dashboard = getDomElement("admin-progress-dashboard");
  if (!dashboard) return false;

  const safeStudentName = username || "Student";
  // V90.8.7.2: do not flash the old cleanup/loading placeholder before the
  // rebuilt Individual view renders. The global app status strip owns loading.
  setDomHtml(dashboard, "");
  bindProgressUiHandlers(dashboard);

  const statusToken = beginProgressLoadStatus("Loading student modules...");

  try {
    const result = await apiPost("/api/progress/task-detail", {
      studentid,
      classgroup: "ALL",
      subjectid: "ALL",
      taskid: "ALL"
    }, state.token);

    if (!result.success) {
      const fallbackRows = getAdminCachedRowsForStudent(studentid, username);

      if (fallbackRows.length > 0) {
        currentProgressRows = fallbackRows;
        renderAdminIndividualSelectedStudentModules(fallbackRows, username);
        endProgressLoadStatus(statusToken, "Progress loaded");
        return true;
      }

      failProgressLoadStatus(statusToken, "Progress load failed");
      setDomHtml(dashboard, `<p class="error-message">${escapeHtml(result.error || "Could not load student progress.")}</p>`);
      return false;
    }

    const apiRows = Array.isArray(result.students)
      ? result.students.map(normalizeProgressStudentRow)
      : [];

    const rows = apiRows.length > 0
      ? apiRows
      : getAdminCachedRowsForStudent(studentid, username);

    currentProgressRows = rows;
    renderAdminIndividualSelectedStudentModules(rows, username);
    endProgressLoadStatus(statusToken, "Progress loaded");
    return true;
  } catch (err) {
    const fallbackRows = getAdminCachedRowsForStudent(studentid, username);

    if (fallbackRows.length > 0) {
      currentProgressRows = fallbackRows;
      renderAdminIndividualSelectedStudentModules(fallbackRows, username);
      endProgressLoadStatus(statusToken, "Progress loaded");
      return true;
    }

    failProgressLoadStatus(statusToken, "Progress load failed");
    console.error("Could not load selected student progress:", err);
    setDomHtml(dashboard, `<p class="error-message">${escapeHtml(err.message || "Could not load student progress.")}</p>`);
    return false;
  }
}

async function openAdminIndividualStudentCard(studentid, username) {  
  if (!studentid) {  
    alert("Student details are missing.");  
    return false;  
  }  
  
  if (hasProgressPendingUpdates()) {  
    startAdminProgressBackgroundSave({ confirm: true });  
  }  
  
  setAdminProgressSectionBodyState("progress-report");  
  setProgressScreensForAdmin();  
  closeAdminProgressStudentPopout({ silent: true });  
  prepareAdminProgressMonitor();  
  showScreen("progress-report");  
  
  progressState.contextType = "student";  
  progressState.classgroup = "ALL";  
  progressState.studentid = studentid;  
  progressState.studentName = username || "Student";  
  progressState.subjectid = "ALL";  
  progressState.subjectname = "";  
  progressState.taskid = "ALL";  
  progressState.taskname = "";  
  progressState.fromAdminDashboard = true;  
  progressPendingUpdates = {};  
  adminIndividualProgressEditMode = false;  
  adminIndividualProgressModuleEditState = Object.create(null);
  adminIndividualProgressActiveModuleIndex = 0;  
  
  return loadAdminIndividualSelectedStudentProgress(studentid, progressState.studentName);  
}  
  
async function openAdminProgressTaskCard(subjectid, subjectname, taskid, taskname, classgroup = "ALL") {  
  if (!taskid) {  
    alert("Task details are missing.");  
    return;  
  }  
  
  setProgressScreensForAdmin();  
  closeAdminProgressStudentPopout({ silent: true });  
  
  const selectedClassGroup = String(classgroup || "ALL");  
  
  progressState.contextType = selectedClassGroup === "ALL" ? "class" : "group";  
  progressState.classgroup = selectedClassGroup;  
  progressState.studentid = "ALL";  
  progressState.studentName = "";  
  progressState.subjectid = subjectid || "ALL";  
  progressState.subjectname = subjectname || "Module";  
  progressState.taskid = taskid;  
  progressState.taskname = taskname || "Task";  
  progressState.fromAdminDashboard = true;  
  
  const dashboardTask = findAdminDashboardTask(  
    progressState.subjectid,  
    progressState.taskid,  
    progressState.taskname  
  );  
  
  adminProgressActiveTaskRows = dashboardTask && Array.isArray(dashboardTask.rows)  
    ? dashboardTask.rows.map(normalizeProgressStudentRow)  
    : getAdminCachedRowsForTask(  
        progressState.taskid,  
        progressState.taskname,  
        progressState.subjectid  
      ).filter(row => {  
        return progressState.classgroup === "ALL" || String(row.classgroup || "") === String(progressState.classgroup || "");  
      });  
  
  setDomText("progress-task-students-title", progressState.taskname);  
  await loadProgressTaskStudents();  
}  
  
async function loadProgressSelectors() {  
  const groupSelect = getDomElement("progress-group-select");  
  const studentSelect = getDomElement("progress-student-select");  
  
  if (!groupSelect && !studentSelect) {  
    console.warn("Progress selector controls are missing.");  
    return;  
  }  
  
  const result = await apiPost("/api/progress/task-detail", {  
    studentid: "ALL",  
    classgroup: "ALL",  
    subjectid: "ALL",  
    taskid: "ALL"  
  }, state.token);  
  
  if (!result.success) {  
    alert(result.error || "Could not load progress data.");  
    return;  
  }  
  
  const studentRows = Array.isArray(result.students) ? result.students : [];  
  
  if (groupSelect) {  
    const groups = [...new Set(studentRows.map(s => s.classgroup))]  
      .filter(group => group && String(group).trim() !== "0")  
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));  
  
    groupSelect.innerHTML = `<option value="">Select a Group...</option>`;  
  
    groups.forEach(group => {  
      const option = document.createElement("option");  
      option.value = group;  
      option.textContent = group;  
      groupSelect.appendChild(option);  
    });  
  }  
  
  if (!studentSelect) return;  
  
  const studentsMap = {};  
  
  studentRows.forEach(row => {  
    if (String(row.classgroup || "").trim() === "0") return;  
    if (!studentsMap[row.studentid]) {  
      studentsMap[row.studentid] = {  
        studentid: row.studentid,  
        username: row.username,  
        classgroup: row.classgroup  
      };  
    }  
  });  
  
  const students = Object.values(studentsMap).sort((a, b) => {  
    const groupCompare = String(a.classgroup).localeCompare(  
      String(b.classgroup),  
      undefined,  
      { numeric: true }  
    );  
  
    if (groupCompare !== 0) return groupCompare;  
  
    return String(a.username).localeCompare(String(b.username));  
  });  
  
  studentSelect.innerHTML = `<option value="">Select a Student...</option>`;  
  
  let currentGroup = "";  
  let optgroup = null;  
  
  students.forEach(student => {  
    if (student.classgroup !== currentGroup) {  
      currentGroup = student.classgroup;  
      optgroup = document.createElement("optgroup");  
      optgroup.label = currentGroup;  
      studentSelect.appendChild(optgroup);  
    }  
  
    const option = document.createElement("option");  
    option.value = student.studentid;  
    option.textContent = student.username;  
    optgroup.appendChild(option);  
  });  
}  
  
function openSelectedGroupProgress() {  
  const groupSelect = getDomElement("progress-group-select");  
  const group = groupSelect ? groupSelect.value : "";  
  
  if (!group) {  
    alert("Select a group first.");  
    return;  
  }  
  
  openProgressContext("group", group);  
}  
  
function openSelectedStudentProgress() {  
  const studentSelect = getDomElement("progress-student-select");  
  const studentid = studentSelect ? studentSelect.value : "";  
  
  if (!studentid) {  
    alert("Select a student first.");  
    return;  
  }  
  
  openProgressContext("student", studentid);  
}  
  
async function openProgressContext(type, value) {  
  setProgressScreensForAdmin();  
  progressState.fromAdminDashboard = false;  
  progressState.contextType = type;  
  progressState.subjectid = "ALL";  
  progressState.taskid = "ALL";  
  progressPendingUpdates = {};  
  currentProgressRows = [];  
  
  if (type === "class") {  
    progressState.classgroup = "ALL";  
    progressState.studentid = "ALL";  
    setDomText("progress-subjects-title", "Class Modules");  
    await loadProgressSubjects();  
    return;  
  }  
  
  if (type === "group") {  
    progressState.classgroup = value;  
    progressState.studentid = "ALL";  
    setDomText("progress-subjects-title", `${value} Modules`);  
    await loadProgressSubjects();  
    return;  
  }  
  
  if (type === "student") {  
    progressState.classgroup = "ALL";  
    progressState.studentid = value;  
    progressState.subjectid = "ALL";  
    progressState.taskid = "ALL";  
  
    const studentSelect = getDomElement("progress-student-select");  
    const selectedOption = studentSelect  
      ? Array.from(studentSelect.options || []).find(option => String(option.value) === String(value))  
      : null;  
  
    const name = selectedOption ? selectedOption.textContent : "Student";  
  
    progressState.studentName = name;  
    setDomText("progress-subjects-title", `${name}'s Subjects`);  
  
    await loadProgressSubjects();  
    return;  
  }  
  
  console.warn("Unknown progress context:", type);  
}  
  
async function loadProgressSubjects() {  
  setAdminProgressSectionBodyState("progress-subjects-screen");  
  setManualRefreshButton("progress-subjects-screen", "refreshProgressSubjects(this)");  
  
  if (!showScreen("progress-subjects-screen")) {  
    console.warn("Progress subjects screen is missing.");  
    return;  
  }  
  
  if (!setDomHtml("progress-subjects-list", "")) {  
    console.warn("Missing progress-subjects-list container.");  
    return;  
  }  
  
  const statusToken = beginProgressLoadStatus("Loading progress...");

  try {  
    const result = await apiPost("/api/progress/task-detail", {  
      studentid: progressState.studentid,  
      classgroup: progressState.classgroup,  
      subjectid: "ALL",  
      taskid: "ALL"  
    }, state.token);  
  
    if (!result.success) {  
      failProgressLoadStatus(statusToken, "Progress load failed");
      setDomHtml("progress-subjects-list", `<p class="error-message">${escapeHtml(result.error || "Could not load modules.")}</p>`);  
      return;  
    }  
  
    if (!result.subjects || result.subjects.length === 0) {  
      endProgressLoadStatus(statusToken, "Progress loaded");
      setDomHtml("progress-subjects-list", `<p class="helper-text">No assigned modules found.</p>`);  
      return;  
    }  
  
    const subjects = result.subjects.map(normalizeProgressSubject).sort(sortProgressSubjects);  
  
    const subjectsList = getDomElement("progress-subjects-list");  
    setDomHtml(subjectsList, subjects.map(subject => `  
      <button  
        type="button"  
        class="progress-list-button"  
        data-progress-action="open-progress-subject"  
        data-subjectid="${escapeForAttribute(subject.subjectid)}"  
        data-subjectname="${escapeForAttribute(subject.subjectname)}"  
      >  
        <span class="progress-list-title">${escapeHtml(subject.subjectname)}</span>  
      </button>  
    `).join(""));  
    bindProgressUiHandlers(subjectsList);  
    endProgressLoadStatus(statusToken, "Progress loaded");
  } catch (err) {  
    failProgressLoadStatus(statusToken, "Progress load failed");
    console.error("Could not load progress modules:", err);  
    setDomHtml("progress-subjects-list", `<p class="error-message">${escapeHtml(err.message || "Could not load modules.")}</p>`);  
  }  
}  
  

async function openProgressSubject(subjectid, subjectname) {  
  progressState.subjectid = subjectid;  
  progressState.subjectname = subjectname;  
  progressState.taskid = "ALL";  
  
  if (progressState.contextType === "student") {  
    setDomText("progress-task-students-title", subjectname);  
    await loadIndividualStudentTaskList();  
    return;  
  }  
  
  setDomText("progress-tasks-title", subjectname);  
  
  await loadProgressTasks();  
}  
  
async function loadProgressTasks() {  
  setAdminProgressSectionBodyState("progress-tasks-screen");  
  setManualRefreshButton("progress-tasks-screen", "refreshProgressTasks(this)");  
  
  if (!showScreen("progress-tasks-screen")) {  
    console.warn("Progress tasks screen is missing.");  
    return;  
  }  
  
  if (!setDomHtml("progress-tasks-list", "")) {  
    console.warn("Missing progress-tasks-list container.");  
    return;  
  }  
  
  const statusToken = beginProgressLoadStatus("Loading progress...");

  try {  
    const result = await apiPost("/api/progress/task-detail", {  
      studentid: progressState.studentid,  
      classgroup: progressState.classgroup,  
      subjectid: progressState.subjectid,  
      taskid: "ALL"  
    }, state.token);  
  
    if (!result.success) {  
      failProgressLoadStatus(statusToken, "Progress load failed");
      setDomHtml("progress-tasks-list", `<p class="error-message">${escapeHtml(result.error || "Could not load tasks.")}</p>`);  
      return;  
    }  
  
    if (!result.tasks || result.tasks.length === 0) {  
      setDomHtml("progress-tasks-list", `<p class="helper-text">No tasks found.</p>`);  
      return;  
    }  
  
    const sortedTasks = result.tasks.map(normalizeProgressTask).sort(sortProgressTasks);  
  
    const tasksList = getDomElement("progress-tasks-list");  
    setDomHtml(tasksList, sortedTasks.map(task => `  
      <button  
        type="button"  
        class="progress-list-button"  
        data-progress-action="open-progress-task"  
        data-taskid="${escapeForAttribute(task.taskid)}"  
        data-taskname="${escapeForAttribute(task.taskname)}"  
      >  
        <span class="progress-list-title">${escapeHtml(task.taskname)}</span>  
      </button>  
    `).join(""));  
    bindProgressUiHandlers(tasksList);  
    endProgressLoadStatus(statusToken, "Progress loaded");
  } catch (err) {  
    failProgressLoadStatus(statusToken, "Progress load failed");
    console.error("Could not load progress tasks:", err);  
    setDomHtml("progress-tasks-list", `<p class="error-message">${escapeHtml(err.message || "Could not load tasks.")}</p>`);  
  }  
}  
  
async function openProgressTask(taskid, taskname) {  
  progressState.taskid = taskid;  
  progressState.taskname = taskname;  
  
  const title = progressState.contextType === "group"  
    ? `${taskname} ${progressState.classgroup}`  
    : taskname;  
  
  setDomText("progress-task-students-title", title);  
  
  await loadProgressTaskStudents();  
}  
  
async function loadProgressTaskStudents() {  
  setAdminProgressSectionBodyState("progress-task-students-screen");  
  setManualRefreshButton("progress-task-students-screen", "refreshProgressTaskStudents(this)");  
  
  if (!showScreen("progress-task-students-screen")) {  
    console.warn("Progress task-students screen is missing.");  
    return;  
  }  
  
  progressPendingUpdates = {};  
  
  if (!setDomHtml("progress-task-students-list", "")) {  
    console.warn("Missing progress-task-students-list container.");  
    return;  
  }  
  
  const statusToken = beginProgressLoadStatus("Loading progress...");

  try {  
    const result = await apiPost("/api/progress/task-detail", {  
      studentid: progressState.studentid,  
      classgroup: progressState.classgroup,  
      subjectid: progressState.subjectid,  
      taskid: progressState.taskid  
    }, state.token);  
  
    if (!result.success) {  
      const fallbackRows = getAdminFallbackRowsForActiveTask();  
  
      if (fallbackRows.length > 0) {  
        currentProgressRows = fallbackRows;  
        renderProgressTaskStudents(currentProgressRows);  
        endProgressLoadStatus(statusToken, "Progress loaded");
        return;  
      }  
  
      failProgressLoadStatus(statusToken, "Progress load failed");
      setDomHtml("progress-task-students-list", `<p class="error-message">${escapeHtml(result.error || "Could not load students.")}</p>`);  
      return;  
    }  
  
    const apiRows = Array.isArray(result.students)  
      ? result.students.map(normalizeProgressStudentRow)  
      : [];  
  
    let allSubjectRows = [];  
  
    if (  
      apiRows.length === 0 &&  
      progressState.taskid &&  
      progressState.taskid !== "ALL" &&  
      progressState.subjectid &&  
      progressState.subjectid !== "ALL"  
    ) {  
      const allSubjectResult = await apiPost("/api/progress/task-detail", {  
        studentid: progressState.studentid,  
        classgroup: progressState.classgroup,  
        subjectid: "ALL",  
        taskid: progressState.taskid  
      }, state.token).catch(err => ({ success: false, error: err.message, students: [] }));  
  
      allSubjectRows = allSubjectResult && allSubjectResult.success && Array.isArray(allSubjectResult.students)  
        ? allSubjectResult.students.map(normalizeProgressStudentRow)  
        : [];  
    }  
  
    const rows = apiRows.length > 0  
      ? apiRows  
      : (allSubjectRows.length > 0 ? allSubjectRows : getAdminFallbackRowsForActiveTask());  
  
    if (rows.length === 0) {  
      endProgressLoadStatus(statusToken, "Progress loaded");
      setDomHtml("progress-task-students-list", `<p class="helper-text">No student tasks found.</p>`);  
      return;  
    }  
  
    currentProgressRows = rows;  
    renderProgressTaskStudents(currentProgressRows);
    endProgressLoadStatus(statusToken, "Progress loaded");  
  } catch (err) {  
    const fallbackRows = getAdminFallbackRowsForActiveTask();  
  
    if (fallbackRows.length > 0) {  
      currentProgressRows = fallbackRows;  
      renderProgressTaskStudents(currentProgressRows);  
      endProgressLoadStatus(statusToken, "Progress loaded");
      return;  
    }  
  
    failProgressLoadStatus(statusToken, "Progress load failed");
    console.error("Could not load student progress rows:", err);  
    setDomHtml("progress-task-students-list", `<p class="error-message">${escapeHtml(err.message || "Could not load students.")}</p>`);  
  }  
}  
  
function renderAdminProgressTaskDetailStudentRow(row) {  
  const pending = progressPendingUpdates[row.studenttaskid] || {};  
  
  const completeStatus = pending.completeStatus !== undefined  
    ? pending.completeStatus  
    : row.completestatus;  
  
  const verifyStatus = pending.verifyStatus !== undefined  
    ? pending.verifyStatus  
    : row.verifystatus;  
  
  const isComplete = isStatusOn(completeStatus);  
  const isVerified = isStatusOn(verifyStatus);  
  const studentName = row.username || "Student";  
  
  return `  
    <div class="admin-progress-task-detail-row" role="row">  
      <div class="admin-progress-task-detail-student-name" role="cell">${escapeHtml(studentName)}</div>  
  
      <button  
        type="button"  
        class="admin-progress-status-control admin-progress-complete-control is-admin-complete-override${isComplete ? " is-on" : ""}"  
        data-progress-action="toggle-progress-pending"  
        data-studenttaskid="${escapeForAttribute(row.studenttaskid)}"  
        data-field="completeStatus"  
        data-value="${isComplete ? "false" : "true"}"  
        aria-label="${isComplete ? "Mark incomplete" : "Mark complete"}: ${escapeForAttribute(studentName)}"  
      >  
        ${renderAdminProgressStatusIndicator("complete", isComplete)}  
      </button>  
  
      <button  
        type="button"  
        class="admin-progress-status-control admin-progress-verify-control${isVerified ? " is-on" : ""}"  
        data-progress-action="toggle-progress-pending"  
        data-studenttaskid="${escapeForAttribute(row.studenttaskid)}"  
        data-field="verifyStatus"  
        data-value="${isVerified ? "false" : "true"}"  
        aria-label="${isVerified ? "Mark unverified" : "Mark verified"}: ${escapeForAttribute(studentName)}"  
      >  
        ${renderAdminProgressStatusIndicator("verify", isVerified)}  
      </button>  
    </div>  
  `;  
}  
  
function renderProgressTaskStudents(rows) {  
  const container = getDomElement("progress-task-students-list");  
  if (!container) {  
    console.warn("Missing progress-task-students-list container.");  
    return;  
  }  
  
  container.classList.add("admin-progress-task-class-list", "admin-progress-task-detail-list");  
  
  const byGroup = {};  
  
  (Array.isArray(rows) ? rows : [])  
    .map(normalizeProgressStudentRow)  
    .filter(row => String(row.classgroup || "").trim() !== "0")  
    .forEach(row => {  
      const groupKey = String(row.classgroup || "Group");  
      if (!byGroup[groupKey]) byGroup[groupKey] = [];  
      byGroup[groupKey].push(row);  
    });  
  
  const groups = Object.keys(byGroup).sort((a, b) => {  
    return String(a).localeCompare(String(b), undefined, { numeric: true });  
  });  
  
  if (groups.length === 0) {  
    setDomHtml(container, `<p class="helper-text">No student tasks found.</p>`);  
    return;  
  }  
  
  const groupsHtml = groups.map(group => {  
    const sortedRows = byGroup[group].sort((a, b) => {  
      return String(a.username || "").localeCompare(String(b.username || ""), undefined, { numeric: true });  
    });  
  
    return `  
      <section class="admin-progress-task-detail-group" aria-label="Group ${escapeForAttribute(group)}">  
        <div class="admin-progress-task-detail-group-title">Group ${escapeHtml(group)}</div>  
        <div class="admin-progress-task-detail-rows" role="table" aria-label="Group ${escapeForAttribute(group)} student task status">  
          ${sortedRows.map(renderAdminProgressTaskDetailStudentRow).join("")}  
        </div>  
      </section>  
    `;  
  }).join("");  
  
  setDomHtml(container, `  
    <div class="admin-progress-task-detail-stack">  
      ${groupsHtml}  
    </div>  
  `);  
  
  bindProgressUiHandlers(container);  
}  
  
  
async function saveAdminProgressTaskChanges(button) {  
  const saveButton = button || document.querySelector("#progress-task-students-screen .admin-progress-task-save");  
  const originalText = saveButton ? saveButton.innerText : "Save";  
  const pendingCount = Object.keys(progressPendingUpdates || {}).length;  
  
  if (pendingCount === 0) {  
    if (saveButton) {  
      saveButton.innerText = "Saved";  
      window.setTimeout(() => {  
        saveButton.innerText = originalText;  
      }, 900);  
    }  
    return false;  
  }  
  
  if (saveButton) {  
    saveButton.disabled = true;  
    saveButton.innerText = "Saving...";  
  }  
  
  const saved = await saveProgressPendingChanges({ reload: false, alert: false });  
  
  if (saved) {  
    clearAdminProgressDashboardCache();  
    await loadProgressTaskStudents();  
    refreshAdminProgressDashboardCacheInBackground({ render: false });  
  }  
  
  if (saveButton) {  
    saveButton.disabled = false;  
    saveButton.innerText = saved ? "Saved" : originalText;  
  
    if (saved) {  
      window.setTimeout(() => {  
        saveButton.innerText = originalText;  
      }, 900);  
    }  
  }  
  
  return saved;  
}  
  
function getAdminProgressGroupSwipeTrack() {  
  return document.querySelector("#progress-task-students-screen [data-admin-progress-group-swipe-track]");  
}  
  
function getAdminProgressGroupSwipePanels(track) {  
  const targetTrack = track || getAdminProgressGroupSwipeTrack();  
  
  if (!targetTrack || !targetTrack.children) {  
    return [];  
  }  
  
  return Array.from(targetTrack.children).filter(child => {  
    return child &&  
      child.matches &&  
      child.matches("[data-admin-progress-group-panel], .admin-progress-group-container");  
  });  
}  
  
function getAdminProgressGroupActiveIndex(track) {  
  const targetTrack = track || getAdminProgressGroupSwipeTrack();  
  
  if (!targetTrack) {  
    return 0;  
  }  
  
  const panels = getAdminProgressGroupSwipePanels(targetTrack);  
  
  if (panels.length <= 1) {  
    return 0;  
  }  
  
  if ((targetTrack.scrollWidth || 0) <= (targetTrack.clientWidth || 0) + 2) {  
    return 0;  
  }  
  
  const firstPanel = panels[0];  
  const secondPanel = panels[1];  
  let step = targetTrack.clientWidth || 1;  
  
  if (firstPanel && secondPanel) {  
    const firstRect = firstPanel.getBoundingClientRect();  
    const secondRect = secondPanel.getBoundingClientRect();  
    const measuredStep = Math.abs(secondRect.left - firstRect.left);  
  
    if (measuredStep > 1) {  
      step = measuredStep;  
    }  
  }  
  
  const index = Math.round((targetTrack.scrollLeft || 0) / step);  
  return Math.max(0, Math.min(panels.length - 1, index));  
}  
  
function updateAdminProgressGroupSwipeDots() {  
  const screen = document.getElementById("progress-task-students-screen");  
  const track = getAdminProgressGroupSwipeTrack();  
  
  if (!screen || !track) {  
    return false;  
  }  
  
  const dots = Array.from(screen.querySelectorAll("[data-admin-progress-group-swipe-dots] [data-progress-group-index]"));  
  
  if (!dots.length) {  
    return false;  
  }  
  
  const activeIndex = getAdminProgressGroupActiveIndex(track);  
  
  dots.forEach((dot, fallbackIndex) => {  
    const dotIndex = Number(dot.dataset.progressGroupIndex || fallbackIndex || 0);  
    const isActive = dotIndex === activeIndex;  
    dot.classList.toggle("is-active", isActive);  
    dot.setAttribute("aria-current", isActive ? "true" : "false");  
  });  
  
  return true;  
}  
  
function scrollAdminProgressGroupToIndex(groupIndex, options = {}) {  
  const track = getAdminProgressGroupSwipeTrack();  
  const panels = getAdminProgressGroupSwipePanels(track);  
  const index = Number(groupIndex || 0);  
  
  if (!track || !panels[index]) {  
    return false;  
  }  
  
  panels[index].scrollIntoView({  
    behavior: options.behavior || "smooth",  
    block: "nearest",  
    inline: "start"  
  });  
  
  updateAdminProgressGroupSwipeDots();  
  
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {  
    window.requestAnimationFrame(updateAdminProgressGroupSwipeDots);  
  } else {  
    window.setTimeout(updateAdminProgressGroupSwipeDots, 0);  
  }  
  
  return true;  
}  
  
function renderAdminProgressGroupSwipeDots(groups) {  
  const list = Array.isArray(groups) ? groups : [];  
  
  if (list.length <= 1) {  
    return "";  
  }  
  
  return `  
    <div class="m4l-progress-swipe-dots admin-progress-group-swipe-dots" data-admin-progress-group-swipe-dots aria-label="Class groups">  
      ${list.map((group, index) => `  
        <button  
          type="button"  
          class="m4l-progress-swipe-dot admin-progress-group-swipe-dot${index === 0 ? " is-active" : ""}"  
          data-progress-action="scroll-admin-progress-group"  
          data-progress-group-index="${index}"  
          aria-label="Show Group ${escapeForAttribute(group)}"  
          aria-current="${index === 0 ? "true" : "false"}"  
        ></button>  
      `).join("")}  
    </div>  
  `;  
}  
  
function bindAdminProgressGroupSwipeControls() {  
  const track = getAdminProgressGroupSwipeTrack();  
  
  if (!track) {  
    return false;  
  }  
  
  if (track.dataset.adminProgressGroupSwipeBound !== "true") {  
    track.dataset.adminProgressGroupSwipeBound = "true";  
    let pendingFrame = 0;  
  
    track.addEventListener("scroll", () => {  
      if (pendingFrame) return;  
  
      pendingFrame = window.requestAnimationFrame(() => {  
        pendingFrame = 0;  
        updateAdminProgressGroupSwipeDots();  
      });  
    }, { passive: true });  
  }  
  
  window.setTimeout(updateAdminProgressGroupSwipeDots, 0);  
  return true;  
}  
  
function updateProgressRowsStatusInMemory(studenttaskid, field, value) {  
  const id = String(studenttaskid || "");  
  if (!id || !field) return false;  
  
  let updated = false;  
  [currentProgressRows, adminProgressActiveTaskRows, adminProgressDashboardRows, adminProgressIndividualRows, adminProgressPopoutRows].forEach(collection => {  
    if (!Array.isArray(collection)) return;  
    collection.forEach(row => {  
      if (String(row.studenttaskid || "") === id) {  
        row[field.toLowerCase ? field.toLowerCase() : field] = value ? "YES" : "";  
        row[field] = value ? "YES" : "";  
        updated = true;  
      }  
    });  
  });  
  
  return updated;  
}  
  
function updateAdminProgressStatusControls(studenttaskid, field, value, actionName) {
  const type = field === "verifyStatus" ? "verify" : "complete";
  const controls = Array.from(document.querySelectorAll(`[data-progress-action="${actionName}"][data-field="${field}"]`))
    .filter(control => String(control.dataset.studenttaskid || "") === String(studenttaskid || ""));

  controls.forEach(control => {
    const currentLabel = control.getAttribute("aria-label") || "";
    const labelSuffix = currentLabel.includes(":")
      ? `: ${currentLabel.split(":").slice(1).join(":").trim()}`
      : "";

    control.dataset.value = value ? "false" : "true";
    control.classList.toggle("is-on", !!value);
    control.innerHTML = renderAdminProgressStatusIndicator(type, !!value);

    if (field === "verifyStatus") {
      control.setAttribute("aria-label", `${value ? "Verified" : "Click to mark verified"}${labelSuffix}`);
    } else {
      control.setAttribute("aria-label", `${value ? "Completed" : "Click to mark complete"}${labelSuffix}`);
    }
  });

  return controls.length > 0;
}  
  
  
function renderAdminProgressStudentTaskRow(row) {  
  const pending = progressPendingUpdates[row.studenttaskid] || {};  
  
  const completeStatus = pending.completeStatus !== undefined  
    ? pending.completeStatus  
    : row.completestatus;  
  
  const verifyStatus = pending.verifyStatus !== undefined  
    ? pending.verifyStatus  
    : row.verifystatus;  
  
  const isComplete = isStatusOn(completeStatus);  
  const isVerified = isStatusOn(verifyStatus);  
  
  return `  
    <div class="student-status-row admin-progress-student-row">  
      <button  
        type="button"  
        class="admin-progress-student-name-button"  
        data-progress-action="open-admin-progress-student-popout"  
        data-studentid="${escapeForAttribute(row.studentid)}"  
        data-username="${escapeForAttribute(row.username || "Student")}">  
        ${escapeHtml(row.username || "Student")}  
      </button>  
  
      <div  
        class="status-action task-status-control admin-progress-status-control admin-progress-complete-control is-admin-complete-override${isComplete ? " is-on" : ""}"  
        role="button"  
        tabindex="0"  
        data-progress-action="toggle-progress-pending"  
        data-studenttaskid="${escapeForAttribute(row.studenttaskid)}"  
        data-field="completeStatus"  
        data-value="${isComplete ? "false" : "true"}"  
        aria-label="${isComplete ? "Mark incomplete" : "Mark complete"}: ${escapeForAttribute(row.username || "Student")}">  
        ${renderAdminProgressStatusIndicator("complete", isComplete)}  
      </div>  
  
      <div  
        class="status-action task-status-control admin-progress-status-control admin-progress-verify-control${isVerified ? " is-on" : ""}"  
        role="button"  
        tabindex="0"  
        data-progress-action="toggle-progress-pending"  
        data-studenttaskid="${escapeForAttribute(row.studenttaskid)}"  
        data-field="verifyStatus"  
        data-value="${isVerified ? "false" : "true"}"  
        aria-label="${isVerified ? "Mark unverified" : "Mark verified"}: ${escapeForAttribute(row.username || "Student")}">  
        ${renderAdminProgressStatusIndicator("verify", isVerified)}  
      </div>  
    </div>  
  `;  
}  
  

function ensureAdminProgressStudentPopout() {
  console.warn("V79.4 legacy admin student popout is quarantined.");
  return null;
}


async function openAdminProgressStudentPopout(studentid, username) {
  console.warn("V79.4 legacy admin student popout route is quarantined; opening full student view instead.", studentid, username);
  if (!studentid) {
    alert("Student details are missing.");
    return false;
  }

  if (typeof openAdminIndividualStudentCard === "function") {
    return openAdminIndividualStudentCard(studentid, username || "Student");
  }

  return false;
}


async function loadAdminStudentProgressPopout(studentid, username) {
  console.warn("V79.4 legacy admin popout loader is quarantined.", studentid, username);
  return false;
}


function renderAdminStudentProgressPopout(rows, username) {
  console.warn("V79.4 legacy admin popout renderer is quarantined.", username, rows);
  return false;
}


function getAdminProgressPopoutModuleSwipeTrack() {
  return null;
}


function getAdminProgressPopoutModulePanels(track) {
  return [];
}


function getAdminProgressPopoutModuleActiveIndex(track) {
  return 0;
}


function updateAdminProgressPopoutModuleSwipeDots(track) {
  return false;
}


function scrollAdminProgressPopoutModuleToIndex(moduleIndex, options = {}) {
  console.warn("V79.4 legacy admin popout swipe route is quarantined.", moduleIndex, options);
  return false;
}


function renderAdminProgressPopoutModuleSwipeDots(modules) {
  return "";
}


function bindAdminProgressPopoutModuleSwipeControls() {
  return false;
}


function renderAdminStudentProgressPopoutRow(row) {
  console.warn("V79.4 legacy admin popout row renderer is quarantined.", row);
  return "";
}


function toggleProgressPendingForAdminPopout(studenttaskid, field, value) {
  console.warn("V79.4 legacy admin popout toggle route is quarantined.", studenttaskid, field, value);
  return false;
}


function closeAdminProgressStudentPopout(options = {}) {
  const popout = document.getElementById("admin-progress-student-popout");
  if (popout) {
    popout.classList.add("hidden");
    popout.setAttribute("aria-hidden", "true");
  }

  if (document && document.body) {
    document.body.classList.remove("admin-progress-popout-open");
  }

  progressState.activePopoutStudentId = "";
  progressState.activePopoutStudentName = "";
  adminProgressPopoutRows = [];
  return true;
}


async function saveAdminProgressPopoutChanges(button) {
  console.warn("V79.4 legacy admin popout save route is quarantined.");
  return saveProgressPendingChanges({ reload: false, alert: true });
}

async function loadIndividualStudentTaskList() {  
  setManualRefreshButton("progress-task-students-screen", "refreshIndividualStudentTaskList(this)");  
  
  if (!showScreen("progress-task-students-screen")) {  
    console.warn("Progress task-students screen is missing.");  
    return;  
  }  
  
  progressPendingUpdates = {};  
  
  if (!setDomHtml("progress-task-students-list", "")) {  
    console.warn("Missing progress-task-students-list container.");  
    return;  
  }  
  
  const statusToken = beginProgressLoadStatus("Loading progress...");

  try {  
    const result = await apiPost("/api/progress/task-detail", {  
      studentid: progressState.studentid,  
      classgroup: "ALL",  
      subjectid: progressState.subjectid || "ALL",  
      taskid: "ALL"  
    }, state.token);  
  
    if (!result.success) {  
      failProgressLoadStatus(statusToken, "Progress load failed");
      setDomHtml("progress-task-students-list", `<p class="error-message">${escapeHtml(result.error || "Could not load student tasks.")}</p>`);  
      return;  
    }  
  
    if (!result.students || result.students.length === 0) {  
      endProgressLoadStatus(statusToken, "Progress loaded");
      setDomHtml("progress-task-students-list", `<p class="helper-text">No tasks assigned to this student.</p>`);  
      return;  
    }  
  
    currentProgressRows = result.students.map(normalizeProgressStudentRow);  
    renderIndividualStudentTaskList(currentProgressRows);  
    endProgressLoadStatus(statusToken, "Progress loaded");
  } catch (err) {  
    failProgressLoadStatus(statusToken, "Progress load failed");
    console.error("Could not load individual student task list:", err);  
    setDomHtml("progress-task-students-list", `<p class="error-message">${escapeHtml(err.message || "Could not load student tasks.")}</p>`);  
  }  
}  
  
function renderIndividualStudentTaskList(rows) {  
  const container = getDomElement("progress-task-students-list");  
  if (!container) {  
    console.warn("Missing progress-task-students-list container.");  
    return;  
  }  
  
  const bySubject = {};  
  
  (Array.isArray(rows) ? rows : [])  
    .map(normalizeProgressStudentRow)  
    .filter(row => String(row.classgroup || "").trim() !== "0")  
    .sort(sortBySubjectIdThenTask)  
    .forEach(row => {  
      const subjectKey = row.subjectid || row.subjectname || "Other";  
      const moduleKey = row.moduleid || row.modulename || "General";  
  
      if (!bySubject[subjectKey]) {  
        bySubject[subjectKey] = {  
          subjectid: row.subjectid || subjectKey,  
          subjectname: row.subjectname || "Other",  
          modules: {}  
        };  
      }  
  
      if (!bySubject[subjectKey].modules[moduleKey]) {  
        bySubject[subjectKey].modules[moduleKey] = {  
          moduleid: row.moduleid || moduleKey,  
          modulename: row.modulename || "General",  
          rows: []  
        };  
      }  
  
      bySubject[subjectKey].modules[moduleKey].rows.push(row);  
    });  
  
  let html = "";  
  const subjects = Object.values(bySubject).sort(sortSubjectGroupsBySubjectId);  
  
  if (subjects.length === 0) {  
    setDomHtml(container, `<p class="helper-text">No tasks assigned to this student.</p>`);  
    return;  
  }  
  
  subjects.forEach((subject, subjectIndex) => {  
    if (progressState.subjectid === "ALL") {  
      if (subjectIndex > 0) {  
        html += `<div class="group-separator-line" aria-hidden="true"></div>`;  
      }  
      html += `<div class="subject-heading-thin">${escapeHtml(subject.subjectname)}</div>`;  
    }  
  
    Object.values(subject.modules).sort(sortModuleGroupsByModuleId).forEach(moduleGroup => {  
      html += `<div class="task-resource-heading">${escapeHtml(moduleGroup.modulename || "General")}</div>`;  
      html += renderTaskStatusHeader("Student", "Muallimah", { firstMuted: true });  
  
      moduleGroup.rows.sort(sortBySubjectIdThenTask).forEach(row => {  
        const pending = progressPendingUpdates[row.studenttaskid] || {};  
  
        const completeStatus = pending.completeStatus !== undefined  
          ? pending.completeStatus  
          : row.completestatus;  
  
        const verifyStatus = pending.verifyStatus !== undefined  
          ? pending.verifyStatus  
          : row.verifystatus;  
  
        const isComplete = isStatusOn(completeStatus);  
        const isVerified = isStatusOn(verifyStatus);  
  
        html += `  
          <div class="student-status-row">  
            <div class="student-status-name">${escapeHtml(row.taskname)}</div>  
  
            <div  
            class="status-action task-status-control admin-progress-complete-control is-admin-complete-override"  
            role="button"  
            tabindex="0"  
            data-progress-action="toggle-progress-pending"  
            data-studenttaskid="${escapeForAttribute(row.studenttaskid)}"  
            data-field="completeStatus"  
            data-value="${isComplete ? "false" : "true"}"  
          >  
              ${renderAdminProgressStatusIndicator("complete", isComplete, { muted: !isComplete })}  
            </div>  
  
            <div  
            class="status-action task-status-control"  
            role="button"  
            tabindex="0"  
            data-progress-action="toggle-progress-pending"  
            data-studenttaskid="${escapeForAttribute(row.studenttaskid)}"  
            data-field="verifyStatus"  
            data-value="${isVerified ? "false" : "true"}"  
          >  
              ${renderAdminProgressStatusIndicator("verify", isVerified)}  
            </div>  
          </div>  
        `;  
      });  
    });  
  });  
  
  setDomHtml(container, html);  
  bindProgressUiHandlers(container);  
}  
  
function toggleProgressPending(studenttaskid, field, value) {  
  if (!studenttaskid) return;  
  
  if (!progressPendingUpdates[studenttaskid]) {  
    progressPendingUpdates[studenttaskid] = {  
      studenttaskid  
    };  
  }  
  
  progressPendingUpdates[studenttaskid][field] = value ? "YES" : "";  
  updateProgressRowsStatusInMemory(studenttaskid, field, value);  
  
  const updatedInPlace = updateAdminProgressStatusControls(  
    studenttaskid,  
    field,  
    value,  
    "toggle-progress-pending"  
  );  
  
  if (!updatedInPlace) {  
    if (progressState.contextType === "student" && progressState.fromAdminDashboard === true) {  
      renderAdminIndividualSelectedStudentModules(currentProgressRows, progressState.studentName);  
    } else if (progressState.contextType === "student") {  
      renderIndividualStudentTaskList(currentProgressRows);  
    } else {  
      renderProgressTaskStudents(currentProgressRows);  
    }  
  }  
}  
  
function beginProgressGlobalStatus(message, options = {}) {
  const kind = String(options.kind || "saving").trim() || "saving";
  const fallbackMessage = kind === "loading" ? "Loading progress..." : "Saving progress...";

  if (window.M4LShell && typeof window.M4LShell.beginAppStatus === "function") {
    return window.M4LShell.beginAppStatus(message || fallbackMessage, { kind });
  }

  return null;
}

function endProgressGlobalStatus(token, message) {
  if (token && window.M4LShell && typeof window.M4LShell.endAppStatus === "function") {
    window.M4LShell.endAppStatus(token, message || "Progress saved");
    return true;
  }

  return false;
}

function failProgressGlobalStatus(token, message) {
  if (token && window.M4LShell && typeof window.M4LShell.failAppStatus === "function") {
    window.M4LShell.failAppStatus(token, message || "Progress save failed");
    return true;
  }

  return false;
}

function beginProgressLoadStatus(message) {
  return beginProgressGlobalStatus(message || "Loading progress...", { kind: "loading" });
}

function endProgressLoadStatus(token, message) {
  if (token && window.M4LShell && typeof window.M4LShell.endAppStatus === "function") {
    window.M4LShell.endAppStatus(token, message || "Progress loaded");
    return true;
  }

  return false;
}

function failProgressLoadStatus(token, message) {
  if (token && window.M4LShell && typeof window.M4LShell.failAppStatus === "function") {
    window.M4LShell.failAppStatus(token, message || "Progress load failed");
    return true;
  }

  return false;
}

function cloneProgressPendingUpdatesSnapshot() {
  const snapshot = {};

  Object.keys(progressPendingUpdates || {}).forEach(studentTaskId => {
    snapshot[studentTaskId] = { ...(progressPendingUpdates[studentTaskId] || {}) };
  });

  return snapshot;
}

function clearProgressPendingUpdatesSnapshot(snapshot) {
  Object.keys(snapshot || {}).forEach(studentTaskId => {
    const current = progressPendingUpdates && progressPendingUpdates[studentTaskId];
    const saved = snapshot[studentTaskId] || {};

    if (!current) {
      return;
    }

    const sameComplete = current.completeStatus === saved.completeStatus;
    const sameVerify = current.verifyStatus === saved.verifyStatus;

    if (sameComplete && sameVerify) {
      delete progressPendingUpdates[studentTaskId];
    }
  });

  return true;
}

function getProgressBatchEndpointSupport(endpoint) {
  const key = String(endpoint || "").trim();

  if (!key) {
    return "disabled";
  }

  return progressBatchEndpointSupport[key] || "unknown";
}

function setProgressBatchEndpointSupport(endpoint, supportState) {
  const key = String(endpoint || "").trim();

  if (!key) {
    return false;
  }

  progressBatchEndpointSupport[key] = supportState === "supported" ? "supported" : "disabled";
  return true;
}

function shouldDisableProgressBatchForError(errorText) {
  const text = String(errorText || "").toLowerCase();

  return text.includes("400") ||
    text.includes("404") ||
    text.includes("not found") ||
    text.includes("missing studenttaskid") ||
    text.includes("missing student task") ||
    text.includes("invalid updates") ||
    text.includes("updates must be") ||
    text.includes("studenttaskid");
}

async function postProgressUpdatesWithBatchFallback(endpoint, batchUpdates, singlePayloads, label = "progress") {
  const updates = Array.isArray(batchUpdates) ? batchUpdates.filter(update => update && update.studenttaskid) : [];
  const singles = Array.isArray(singlePayloads) ? singlePayloads.filter(update => update && update.studenttaskid) : [];

  if (updates.length === 0 && singles.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  let batchError = "";
  const batchSupport = getProgressBatchEndpointSupport(endpoint);

  if (updates.length > 0 && batchSupport !== "disabled") {
    try {
      const batchResult = await apiPost(endpoint, { updates }, state.token);

      if (batchResult && batchResult.success) {
        setProgressBatchEndpointSupport(endpoint, "supported");
        return batchResult;
      }

      batchError = batchResult && batchResult.error
        ? String(batchResult.error)
        : `Could not save ${label} updates as a batch.`;
    } catch (err) {
      batchError = err && err.message ? err.message : String(err || "Batch save failed");
    }

    if (shouldDisableProgressBatchForError(batchError)) {
      setProgressBatchEndpointSupport(endpoint, "disabled");
      console.warn(`Progress ${label} batch endpoint is not available; using single-update fallback for this session.`, batchError);
    } else {
      console.warn(`Progress ${label} batch save failed; retrying individual saves.`, batchError);
    }
  }

  for (const payload of singles) {
    try {
      const singleResult = await apiPost(endpoint, payload, state.token);

      if (!singleResult || !singleResult.success) {
        return {
          success: false,
          error: singleResult && singleResult.error
            ? singleResult.error
            : batchError || `Could not save ${label} update.`,
          batchError,
          fallback: true
        };
      }
    } catch (err) {
      return {
        success: false,
        error: err && err.message ? err.message : batchError || `Could not save ${label} update.`,
        batchError,
        fallback: true
      };
    }
  }

  return {
    success: true,
    updatedCount: singles.length,
    fallback: updates.length > 0
  };
}

async function saveProgressPendingChanges(options = {}) {
  const shouldReload = options.reload !== false;
  const shouldAlert = options.alert !== false;
  const shouldUseGlobalStatus = options.globalStatus !== false;

  const pendingSnapshot = cloneProgressPendingUpdatesSnapshot();
  const updates = Object.values(pendingSnapshot);

  if (updates.length === 0) {
    if (shouldAlert) {
      alert("No changes to save.");
    }
    return false;
  }

  const statusToken = shouldUseGlobalStatus
    ? beginProgressGlobalStatus("Saving progress...")
    : null;

  const completeUpdates = [];
  const verifyUpdates = [];

  updates.forEach(update => {
    if (!update || !update.studenttaskid) {
      return;
    }

    if (update.completeStatus !== undefined) {
      completeUpdates.push({
        studenttaskid: update.studenttaskid,
        complete: update.completeStatus !== ""
      });
    }

    if (update.verifyStatus !== undefined) {
      verifyUpdates.push({
        studenttaskid: update.studenttaskid,
        verified: update.verifyStatus !== ""
      });
    }
  });

  try {
    if (completeUpdates.length > 0) {
      const completeResult = await postProgressUpdatesWithBatchFallback(
        "/api/tasks/update-complete",
        completeUpdates,
        completeUpdates,
        "completion"
      );

      if (!completeResult.success) {
        failProgressGlobalStatus(statusToken, "Progress save failed");
        if (shouldAlert) {
          alert(completeResult.error || "Could not save completion updates.");
        }
        return false;
      }
    }

    if (verifyUpdates.length > 0) {
      const verifyResult = await postProgressUpdatesWithBatchFallback(
        "/api/admin/tasks/verify",
        verifyUpdates,
        verifyUpdates,
        "verification"
      );

      if (!verifyResult.success) {
        failProgressGlobalStatus(statusToken, "Progress save failed");
        if (shouldAlert) {
          alert(verifyResult.error || "Could not save verification updates.");
        }
        return false;
      }
    }

    clearProgressPendingUpdatesSnapshot(pendingSnapshot);

    if (shouldAlert) {
      alert("Changes saved.");
    }

    if (shouldReload) {
      if (progressState.fromAdminDashboard === true) {
        await showAdminIndividualSelectedStudent(progressState.studentid, progressState.studentName);
      } else if (progressState.contextType === "student") {
        await loadIndividualStudentTaskList();
      } else {
        await loadProgressTaskStudents();
      }
    }

    endProgressGlobalStatus(statusToken, "Progress saved");
    return true;
  } catch (error) {
    failProgressGlobalStatus(statusToken, "Progress save failed");
    throw error;
  }
}  
  
async function saveProgressPendingChangesAndReturn() {  
  const button = document.querySelector("#progress-task-students-screen .small-btn");  
  const originalText = button ? button.innerText : "Save and Exit";  
  
  if (button) {  
    button.disabled = true;  
    button.innerText = "Saving...";  
  }  
  
  const saved = await saveProgressPendingChanges({ reload: false, alert: false });  
  
  if (button) {  
    button.disabled = false;  
    button.innerText = originalText;  
  }  
  
  if (!saved && Object.keys(progressPendingUpdates).length > 0) {  
    return;  
  }  
  
  if (progressState.contextType === "student") {  
    showScreen("progress-subjects-screen");  
  } else if (progressState.fromAdminDashboard === true) {  
    await showProgressReport();  
  } else {  
    showScreen("progress-tasks-screen");  
  }  
}  
  
async function saveStudentProgressSwipeChanges(button) {
  const pendingCount = Object.keys(progressPendingUpdates || {}).length;

  // V90.9.1: keep the learner-facing save button as good-practice guidance,
  // but treat it as "done editing". The save queue continues in the background.
  finishStudentProgressAllModuleEditStates();

  if (pendingCount === 0 && !studentProgressAutoSaveInFlight) {
    return false;
  }

  try {
    return await flushStudentProgressAutoSave();
  } catch (err) {
    console.error("Could not save student progress:", err);
    return false;
  }
}  
  
async function saveStudentTaskChangesAndReturn() {  
  const button = document.querySelector("#progress-tasks-screen .student-progress-save-btn, #progress-tasks-screen .small-btn");  
  const originalText = button ? button.innerText : "Save and Exit";  
  
  if (button) {  
    button.disabled = true;  
    button.innerText = "Saving...";  
  }  
  
  const saved = await saveProgressPendingChanges({ reload: false, alert: false });  
  
  if (button) {  
    button.disabled = false;  
    button.innerText = originalText;  
  }  
  
  if (!saved && Object.keys(progressPendingUpdates).length > 0) {  
    return;  
  }  
  
  progressPendingUpdates = {};  
  showStudentTasks();  
}  
  
  
  
/* =========================  
   HELPERS  
========================= */  
/* setAuthTheme now lives in app.js with the shared startup helpers. */  
  
function groupTasksBySubject(tasks) {  
  const grouped = {};  
  
  tasks.forEach(task => {  
    const subjectName = task.subjectname || "Other";  
  
    if (!grouped[subjectName]) {  
      grouped[subjectName] = [];  
    }  
  
    grouped[subjectName].push(task);  
  });  
  
  Object.keys(grouped).forEach(subjectName => {  
    grouped[subjectName].sort(sortByTaskId);  
  });  
  
  return grouped;  
}  
  
function naturalCompare(a, b) {  
  return String(a || "").localeCompare(String(b || ""), undefined, {  
    numeric: true,  
    sensitivity: "base"  
  });  
}  
  
function getTaskSubjectId(task) {  
  return task.subjectid || task.subjectID || task.SubjectID || task.SubjectId || "";  
}  
  
function getTaskModuleId(task) {  
  return task.moduleid || task.moduleID || task.ModuleID || task.ModuleId || "";  
}  
  
function sortSubjectGroupsBySubjectId(a, b) {  
  const subjectCompare = naturalCompare(a.subjectid || a.subjectname, b.subjectid || b.subjectname);  
  if (subjectCompare !== 0) return subjectCompare;  
  return naturalCompare(a.subjectname, b.subjectname);  
}  
  
function sortModuleGroupsByModuleId(a, b) {  
  const moduleCompare = naturalCompare(a.moduleid || a.modulename, b.moduleid || b.modulename);  
  if (moduleCompare !== 0) return moduleCompare;  
  return naturalCompare(a.modulename, b.modulename);  
}  
  
function sortBySubjectIdThenTask(a, b) {  
  const subjectCompare = naturalCompare(getTaskSubjectId(a), getTaskSubjectId(b));  
  if (subjectCompare !== 0) return subjectCompare;  
  return sortByTaskId(a, b);  
}  
  
function sortByModuleThenTask(a, b) {  
  const moduleCompare = naturalCompare(getTaskModuleId(a), getTaskModuleId(b));  
  if (moduleCompare !== 0) return moduleCompare;  
  return sortByTaskId(a, b);  
}  
  
function sortByTaskId(a, b) {  
  const aRaw = a.taskid || a.taskID || a.TaskID || a.TaskId || "";  
  const bRaw = b.taskid || b.taskID || b.TaskID || b.TaskId || "";  
  
  const idCompare = naturalCompare(aRaw, bRaw);  
  if (idCompare !== 0) return idCompare;  
  
  return naturalCompare(a.taskname || a.TaskName || "", b.taskname || b.TaskName || "");  
}  
  
function isStatusOn(value) {  
  if (value === true) return true;  
  const text = String(value || "").trim().toLowerCase();  
  return text === "yes" || text === "true" || text === "complete" || text === "verified" || text === "1";  
}  
  
function renderTaskLinks(task) {  
  const links = [];  
  
  if (task.pdflink) {  
    links.push(`<a href="${escapeHtml(task.pdflink)}" target="_blank">PDF</a>`);  
  }  
  
  if (task.audiolink) {  
    links.push(`<a href="${escapeHtml(task.audiolink)}" target="_blank">Audio</a>`);  
  }  
  
  if (task.videolink) {  
    links.push(`<a href="${escapeHtml(task.videolink)}" target="_blank">Video</a>`);  
  }  
  
  if (task.visuallink) {  
    links.push(`<a href="${escapeHtml(task.visuallink)}" target="_blank">Visual</a>`);  
  }  
  
  if (links.length === 0) {  
    return "";  
  }  
  
  return `  
    <div class="task-meta" style="margin-top:10px;">  
      Resources: ${links.join(" · ")}  
    </div>  
  `;  
}  
  
function normalizeClientText(value) {  
  return String(value || "")  
    .trim()  
    .toLowerCase()  
    .normalize("NFD")  
    .replace(/[\u0300-\u036f]/g, "")  
    .replace(/[^a-z0-9]/g, "");  
}  
  
function escapeForAttribute(value) {  
  return String(value || "")  
    .replaceAll("\\", "\\\\")  
    .replaceAll("'", "\\'")  
    .replaceAll('"', "&quot;");  
}  
  
/* escapeHtml is provided by app.js. */  
  
  
/* =========================  
   MANUAL REFRESH BUTTONS  
========================= */  
  
function getRefreshIconMarkup() {  
  return `  
    <span class="app-icon app-icon-large manual-refresh-btn__icon" style="--app-icon-url: url('/icons/refresh.svg')" aria-hidden="true"></span>  
    <span class="visually-hidden">Refresh</span>  
  `;  
}  
  
function getManualRefreshButtonMarkup(onclickValue) {  
  return "";  
}  
  
function setManualRefreshButton(screenId, handlerName) {  
  const screen = document.getElementById(screenId);  
  if (!screen) return;  
  
  screen.querySelectorAll(".manual-refresh-btn").forEach(button => button.remove());  
}  
  
function hasUnsavedProgressChanges() {  
  return !!(typeof progressPendingUpdates !== "undefined" && Object.keys(progressPendingUpdates || {}).length > 0);  
}  
  
function confirmRefreshIfUnsaved() {  
  if (!hasUnsavedProgressChanges()) {  
    return true;  
  }  
  
  return confirm("You have unsaved changes. Refreshing will discard them. Continue?");  
}  
  
async function runManualRefresh(button, callback) {  
  const refreshButton = button?.closest  
    ? button.closest(".manual-refresh-btn")  
    : button || event?.target?.closest?.(".manual-refresh-btn") || event?.target;  
  
  if (refreshButton) {  
    refreshButton.disabled = true;  
    refreshButton.classList.add("is-refreshing");  
  }  
  
  try {  
    await callback();  
  } finally {  
    if (refreshButton) {  
      refreshButton.disabled = false;  
      refreshButton.classList.remove("is-refreshing");  
    }  
  }  
}  
  
async function refreshStudentTaskProgress(button) {  
  const previousModuleKey = getStudentProgressSwipeActiveModuleKey() || currentStudentSubjectKey;  
  
  await runManualRefresh(button, async () => {  
    await flushStudentProgressAutoSave();  
    await showStudentTasks({  
      moduleKey: previousModuleKey,  
      scrollBehavior: "auto"  
    });  
  });  
}  
  
async function refreshStudentModuleTaskList(button) {  
  const previousModuleKey = currentStudentSubjectKey;  
  
  await runManualRefresh(button, async () => {  
    await flushStudentProgressAutoSave();  
    await showStudentTasks({  
      moduleKey: previousModuleKey,  
      scrollBehavior: "auto"  
    });  
  
    if (previousModuleKey && studentSubjectTaskGroups && studentSubjectTaskGroups[previousModuleKey]) {  
      openStudentSubjectTasks(previousModuleKey);  
    }  
  });  
}  
  
async function refreshAdminProgressDashboard(button) {  
  if (!confirmRefreshIfUnsaved()) return;  
  
  const preserveSelectedStudent = progressState.contextType === "student" &&
    progressState.fromAdminDashboard === true &&
    String(progressState.studentid || "").trim() &&
    String(progressState.studentid || "") !== "ALL";
  const preservedStudentId = preserveSelectedStudent ? progressState.studentid : "";
  const preservedStudentName = preserveSelectedStudent ? progressState.studentName : "";
  
  await runManualRefresh(button, async () => {  
    progressPendingUpdates = {};  
    clearAdminProgressDashboardCache();  
  
    if (preserveSelectedStudent) {  
      await openAdminIndividualStudentCard(preservedStudentId, preservedStudentName || "Student");  
      return;  
    }  
  
    await showProgressReport();  
  });  
}  
  
async function refreshProgressSubjects(button) {  
  if (!confirmRefreshIfUnsaved()) return;  
  
  await runManualRefresh(button, async () => {  
    progressPendingUpdates = {};  
    await loadProgressSubjects();  
  });  
}  
  
async function refreshProgressTasks(button) {  
  if (!confirmRefreshIfUnsaved()) return;  
  
  await runManualRefresh(button, async () => {  
    progressPendingUpdates = {};  
    await loadProgressTasks();  
  });  
}  
  
async function refreshProgressTaskStudents(button) {  
  if (!confirmRefreshIfUnsaved()) return;  
  
  await runManualRefresh(button, async () => {  
    progressPendingUpdates = {};  
    await loadProgressTaskStudents();  
  });  
}  
  
async function refreshIndividualStudentTaskList(button) {  
  if (!confirmRefreshIfUnsaved()) return;  
  
  await runManualRefresh(button, async () => {  
    progressPendingUpdates = {};  
    await loadIndividualStudentTaskList();  
  });  
}  
  
bindAdminProgressClassMatrixLiveCells();  
  
  
  
window.M4LProgress = {  
  bindProgressUiHandlers: typeof bindProgressUiHandlers === "function" ? bindProgressUiHandlers : undefined,  
  showStudentTasks: typeof showStudentTasks === "function" ? showStudentTasks : undefined,  
  refreshStudentTaskProgress: typeof refreshStudentTaskProgress === "function" ? refreshStudentTaskProgress : undefined,  
  refreshStudentModuleTaskList: typeof refreshStudentModuleTaskList === "function" ? refreshStudentModuleTaskList : undefined,  
  refreshStudentTaskList: typeof refreshStudentTaskList === "function" ? refreshStudentTaskList : undefined,  
  saveStudentTaskChangesAndReturn: typeof saveStudentTaskChangesAndReturn === "function" ? saveStudentTaskChangesAndReturn : undefined,  
  saveStudentProgressSwipeChanges: typeof saveStudentProgressSwipeChanges === "function" ? saveStudentProgressSwipeChanges : undefined,  
  bindStudentProgressSwipeControls: typeof bindStudentProgressSwipeControls === "function" ? bindStudentProgressSwipeControls : undefined,  
  showProgressReport: typeof showProgressReport === "function" ? showProgressReport : undefined,  
  loadAdminProgressDashboard: typeof loadAdminProgressDashboard === "function" ? loadAdminProgressDashboard : undefined,  
  openAdminProgressTaskCard: typeof openAdminProgressTaskCard === "function" ? openAdminProgressTaskCard : undefined,  
  openAdminProgressStudentPopout: typeof openAdminProgressStudentPopout === "function" ? openAdminProgressStudentPopout : undefined,  
  openAdminIndividualStudentCard: typeof openAdminIndividualStudentCard === "function" ? openAdminIndividualStudentCard : undefined,  
  closeAdminProgressStudentPopout: typeof closeAdminProgressStudentPopout === "function" ? closeAdminProgressStudentPopout : undefined,  
  saveAdminProgressPopoutChanges: typeof saveAdminProgressPopoutChanges === "function" ? saveAdminProgressPopoutChanges : undefined,  
  refreshAdminProgressDashboard: typeof refreshAdminProgressDashboard === "function" ? refreshAdminProgressDashboard : undefined,  
  openProgressContext: typeof openProgressContext === "function" ? openProgressContext : undefined,  
  openSelectedGroupProgress: typeof openSelectedGroupProgress === "function" ? openSelectedGroupProgress : undefined,  
  openSelectedStudentProgress: typeof openSelectedStudentProgress === "function" ? openSelectedStudentProgress : undefined,  
  loadProgressSubjects: typeof loadProgressSubjects === "function" ? loadProgressSubjects : undefined,  
  loadProgressTasks: typeof loadProgressTasks === "function" ? loadProgressTasks : undefined,  
  loadProgressTaskStudents: typeof loadProgressTaskStudents === "function" ? loadProgressTaskStudents : undefined,  
  openProgressSubject: typeof openProgressSubject === "function" ? openProgressSubject : undefined,  
  openProgressTask: typeof openProgressTask === "function" ? openProgressTask : undefined,  
  toggleProgressPending: typeof toggleProgressPending === "function" ? toggleProgressPending : undefined,  
  saveProgressPendingChanges: typeof saveProgressPendingChanges === "function" ? saveProgressPendingChanges : undefined,  
  saveProgressPendingChangesAndReturn: typeof saveProgressPendingChangesAndReturn === "function" ? saveProgressPendingChangesAndReturn : undefined,  
  refreshProgressSubjects: typeof refreshProgressSubjects === "function" ? refreshProgressSubjects : undefined,  
  refreshProgressTasks: typeof refreshProgressTasks === "function" ? refreshProgressTasks : undefined,  
  refreshProgressTaskStudents: typeof refreshProgressTaskStudents === "function" ? refreshProgressTaskStudents : undefined,  
  refreshIndividualStudentTaskList: typeof refreshIndividualStudentTaskList === "function" ? refreshIndividualStudentTaskList : undefined,  
  hasUnsavedProgressChanges: typeof hasUnsavedProgressChanges === "function" ? hasUnsavedProgressChanges : undefined  
};  
