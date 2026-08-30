/* M4L V103.1.0.5 - Courses: inline Course metadata, recurring schedules, direct publication and optional session editor. */
(function () {
  "use strict";

  const COURSE_TYPES = Object.freeze(["FIXED", "ONGOING"]);
  const COURSE_ACCESS = Object.freeze(["FREE", "PAID"]);
  const COURSE_STATUS = Object.freeze(["ACTIVE", "INACTIVE"]);
  const DAY_ORDER = Object.freeze(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
  const DAY_LABELS = Object.freeze({ MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" });

  const model = {
    active: false,
    loaded: false,
    loading: false,
    delivery: emptyDelivery(),
    timetable: emptyTimetable(),
    courses: [],
    courseFilter: "ACTIVE",
    scheduleOpenKey: "",
    sessionOpenRunId: "",
    sessionDrafts: new Map(),
    sequence: 0
  };
  let bound = false;

  function emptyDelivery() {
    return {
      platformTimezone: "Africa/Johannesburg",
      platformSchemaVersion: "",
      courseAccessSchemaReady: false,
      subjects: [], policies: [], runs: []
    };
  }

  function emptyTimetable() {
    return {
      subjects: [], modules: [], runs: [], teachers: [], sessions: [], states: [], publications: [],
      lifecycles: [], calendarEvents: []
    };
  }

  function bind() {
    if (bound) return;
    bound = true;
    document.addEventListener("click", handleRefreshCapture, true);
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
    document.addEventListener("input", handleInput);
  }

  function handleRefreshCapture(event) {
    if (!model.active) return;
    const root = event.target?.closest?.("#global-curriculum-screen");
    if (!root) return;

    const reload = event.target?.closest?.('[data-gcm-action="reload"]');
    if (reload) {
      if (!confirmDiscardAll()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    const leaving = event.target?.closest?.('[data-header-action], [data-gcm-action="show-tab"]');
    if (!leaving || !hasUnsavedChanges()) return;
    if (window.confirm("Discard unsaved Course or session changes?")) {
      clearUnsavedState();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  async function handleClick(event) {
    const closeAction = event.target?.closest?.('#global-curriculum-screen [data-header-action]');
    if (closeAction) { model.active = false; return; }
    const otherTab = event.target?.closest?.('#global-curriculum-screen [data-gcm-action="show-tab"]');
    if (otherTab) { model.active = false; return; }

    const target = event.target?.closest?.("[data-gcm-course-action]");
    if (!target || !target.closest("#global-curriculum-screen") || target.disabled) return;
    event.preventDefault();
    const action = target.dataset.gcmCourseAction || "";
    if (action === "show") return show();
    if (!model.active) return;

    if (action === "add-course") return addCourseDraft();
    if (action === "discard-course") return discardCourseDraft(target.dataset.courseKey || "");
    if (action === "toggle-schedule") return toggleSchedule(target.dataset.courseKey || "");
    if (action === "add-schedule-row") return addScheduleRow(target.dataset.courseKey || "");
    if (action === "remove-schedule-row") return removeScheduleRow(target.dataset.courseKey || "", target.dataset.rowKey || "");
    if (action === "save-courses") return saveCourses(target);
    if (action === "preview-course-access-migration") return previewCourseAccessMigration(target);
    if (action === "migrate-course-access") return migrateCourseAccess(target);
    if (action === "publish-course") return publishCourseFromRow(target.dataset.courseKey || "", target);
    if (action === "view-sessions") return openSessionEditor(target.dataset.courseKey || "");
    if (action === "close-sessions") return closeSessionEditor();
    if (action === "revise") return reviseCourse(target, target.dataset.runId || model.sessionOpenRunId);
    if (action === "save-session-batch") return saveSessionBatch(target, false);
    if (action === "save-publish-sessions") return saveSessionBatch(target, true);
    if (action === "discard-session-drafts") return discardSessionDrafts();
  }

  function handleChange(event) {
    if (!model.active || !event.target?.closest?.("#global-curriculum-screen")) return;
    const target = event.target;
    if (target.matches("[data-course-filter]")) {
      model.courseFilter = String(target.value || "ACTIVE").toUpperCase();
      render();
      return;
    }
    if (target.matches("[data-course-field]")) {
      syncCourseField(target, true);
      if (target.dataset.courseField === "type") render();
      return;
    }
    if (target.matches("[data-course-schedule-field], [data-course-schedule-day]")) {
      if (target.matches("[data-time24]")) normalizeTimeField(target);
      syncScheduleField(target);
      return;
    }
    if (target.matches("[data-inline-session-field]")) {
      if (target.matches("[data-time24]")) normalizeTimeField(target);
      captureSessionDraft(target.closest("[data-session-row-id]"));
    }
  }

  function handleInput(event) {
    if (!model.active || !event.target?.closest?.("#global-curriculum-screen")) return;
    const target = event.target;
    if (target.matches("[data-course-field]")) {
      syncCourseField(target, false);
      return;
    }
    if (target.matches("[data-course-schedule-field]")) {
      syncScheduleField(target);
      return;
    }
    if (target.matches("[data-inline-session-field]")) captureSessionDraft(target.closest("[data-session-row-id]"));
  }

  async function show() {
    bind();
    model.active = true;
    markTabActive();
    await load(false);
    return true;
  }

  async function load(force) {
    if (model.loading) return false;
    if (model.loaded && !force) { render(); return true; }
    model.loading = true;
    setMessage("Loading Courses…", "");
    setContent('<p class="helper-text">Loading Courses…</p>');
    try {
      const token = appState()?.token || "";
      const [delivery, timetable] = await Promise.all([
        apiPost("/api/admin/platform/global/delivery/get", {}, token),
        apiPost("/api/admin/platform/global/timetable/get", {}, token)
      ]);
      if (!delivery.success) throw new Error(delivery.error || delivery.detail || "Unable to load Courses");
      if (!timetable.success) throw new Error(timetable.error || timetable.detail || "Unable to load Course timetables");
      model.delivery = {
        platformTimezone: String(delivery.platformTimezone || "Africa/Johannesburg"),
        platformSchemaVersion: String(delivery.platformSchemaVersion || ""),
        courseAccessSchemaReady: delivery.courseAccessSchemaReady === true,
        subjects: array(delivery.subjects), policies: array(delivery.policies), runs: array(delivery.runs)
      };
      model.timetable = {
        subjects: array(timetable.subjects), modules: array(timetable.modules), runs: array(timetable.runs),
        teachers: array(timetable.teachers), sessions: array(timetable.sessions), states: array(timetable.states),
        publications: array(timetable.publications), lifecycles: array(timetable.lifecycles),
        calendarEvents: array(timetable.calendarEvents)
      };
      model.sessionDrafts.clear();
      model.courses = model.delivery.runs.map(run => courseDraftFromRun(run));
      model.scheduleOpenKey = model.scheduleOpenKey && findCourse(model.scheduleOpenKey) ? model.scheduleOpenKey : "";
      model.sessionOpenRunId = model.sessionOpenRunId && runById(model.sessionOpenRunId) ? model.sessionOpenRunId : "";
      model.loaded = true;
      setMessage("", "");
      render();
      return true;
    } catch (error) {
      setMessage(error.message || "Courses unavailable.", "error");
      setContent('<div class="global-curriculum-empty"><h3>Courses unavailable</h3><button type="button" data-gcm-course-action="show">Try again</button></div>');
      return false;
    } finally {
      model.loading = false;
    }
  }

  function courseDraftFromRun(run) {
    const draft = {
      key: String(run.runid || nextLocalKey("course")),
      runid: String(run.runid || ""),
      subjectid: String(run.subjectid || ""),
      runname: String(run.runname || ""),
      type: run.ongoing ? "ONGOING" : "FIXED",
      startdate: String(run.startdate || ""),
      enddate: String(run.enddate || ""),
      publishstart: "",
      publishend: "",
      accessmodel: COURSE_ACCESS.includes(String(run.accessmodel || "").toUpperCase()) ? String(run.accessmodel).toUpperCase() : fallbackCourseAccess(run.subjectid),
      active: run.active !== false,
      isNew: false,
      dirty: false,
      scheduleDirty: false,
      windowDirty: false,
      removedSessionIds: [],
      scheduleRows: scheduleRowsFromSessions(run),
      original: null
    };
    draft.original = courseSnapshot(draft);
    return draft;
  }

  function newCourseDraft() {
    const subjectId = model.delivery.subjects.find(item => item.active)?.subjectid || model.delivery.subjects[0]?.subjectid || "";
    const draft = {
      key: nextLocalKey("course"), runid: "", subjectid: subjectId, runname: "", type: "FIXED",
      startdate: "", enddate: "", publishstart: "", publishend: "",
      accessmodel: fallbackCourseAccess(subjectId), active: true, isNew: true, dirty: true,
      scheduleDirty: false, windowDirty: false, removedSessionIds: [], scheduleRows: [blankScheduleRow()], original: null
    };
    draft.original = courseSnapshot(draft);
    return draft;
  }

  function blankScheduleRow() {
    return {
      key: nextLocalKey("schedule"), days: [], start: "", end: "", moduleid: "", teacherid: "", zoom: "",
      sessionIds: [], original: null, isNew: true, dirty: false
    };
  }

  function scheduleRowsFromSessions(run) {
    const sessions = currentWindowSessions(run.runid, run).filter(session => currentLifecycleStatus(session.sessionid) === "SCHEDULED");
    if (!sessions.length) return [blankScheduleRow()];
    const grouped = new Map();
    for (const session of sessions) {
      const signature = [
        normalizeTime(session.starttime), normalizeTime(session.endtime), String(session.moduleid || ""),
        String(session.teacheraccountid || ""), String(session.zoomlink || "").trim()
      ].join("|");
      if (!grouped.has(signature)) grouped.set(signature, []);
      grouped.get(signature).push(session);
    }
    return [...grouped.values()].map(group => {
      const first = group[0];
      const row = {
        key: nextLocalKey("schedule"),
        days: DAY_ORDER.filter(day => group.some(session => weekdayCode(session.sessiondate) === day)),
        start: formatUiTime(first.starttime), end: formatUiTime(first.endtime), moduleid: first.moduleid || "",
        teacherid: first.teacheraccountid || "", zoom: first.zoomlink || "", sessionIds: group.map(session => session.sessionid),
        original: null, isNew: false, dirty: false
      };
      row.original = scheduleSnapshot(row);
      return row;
    });
  }

  function render() {
    if (!model.active) return;
    markTabActive();
    const dirty = dirtyCourses().length > 0;
    setContent(`
      <div class="global-course-scheduler-shell global-courses-shell">
        ${courseAccessMigrationBanner()}
        <section class="global-curriculum-panel global-courses-panel">
          <div class="global-curriculum-panel-heading global-courses-heading">
            <div><h3>Courses</h3><p class="helper-text">Define each Course, its access model and recurring schedule. Save first; publishing is separate.</p></div>
            <div class="global-courses-heading-actions">
              <label class="global-course-filter"><span>Show</span><select data-course-filter><option value="ACTIVE" ${model.courseFilter === "ACTIVE" ? "selected" : ""}>Active</option><option value="INACTIVE" ${model.courseFilter === "INACTIVE" ? "selected" : ""}>Archived</option><option value="ALL" ${model.courseFilter === "ALL" ? "selected" : ""}>All</option></select></label>
              ${courseSaveButton(dirty)}
            </div>
          </div>
          <div class="global-course-grid-head" role="row"><span>Course Name</span><span>Global Subject</span><span>Type</span><span>Start / Publish From</span><span>End / Publish Through</span><span>Access</span><span>Status</span><span>Schedule / Publish</span></div>
          <div class="global-course-grid-body">${visibleCourses().map(courseCard).join("") || '<p class="global-curriculum-empty-list">No Courses in this view.</p>'}</div>
          <button type="button" class="global-course-add-button" data-gcm-course-action="add-course">+ Add Course</button>
        </section>
        ${model.sessionOpenRunId ? sessionSectionForOpenCourse() : ""}
      </div>
    `);
    refreshCourseSaveState();
  }

  function visibleCourses() {
    return model.courses.filter(course => {
      if (course.isNew) return true;
      if (model.courseFilter === "ALL") return true;
      if (model.courseFilter === "INACTIVE") return !course.active;
      return course.active;
    });
  }

  function courseCard(course) {
    const state = stateForRun(course.runid);
    const sessionCount = currentWindowSessions(course.runid, course).filter(item => item.active && currentLifecycleStatus(item.sessionid) === "SCHEDULED").length;
    const publication = currentPublication(course.runid);
    const publicationLabel = state?.stage === "PUBLISHED"
      ? `Published${publication?.versionno ? ` v${publication.versionno}` : ""}`
      : state?.currentpublicationid ? "Changes not published" : (sessionCount ? "Draft" : "Not scheduled");
    const scheduleOpen = model.scheduleOpenKey === course.key;
    const courseClasses = ["global-course-record", course.dirty || course.scheduleDirty || course.windowDirty ? "is-dirty" : "", course.isNew ? "is-new" : ""].filter(Boolean).join(" ");
    const fixed = course.type === "FIXED";
    const date1 = fixed ? course.startdate : course.publishstart;
    const date2 = fixed ? course.enddate : course.publishend;
    const accessDisabled = !model.delivery.courseAccessSchemaReady ? "disabled" : "";
    return `<article class="${courseClasses}" data-course-key="${attr(course.key)}">
      <div class="global-course-grid-row" role="row">
        <label class="global-course-grid-cell"><span class="global-course-mobile-label">Course Name</span><input data-course-field="runname" data-course-key="${attr(course.key)}" type="text" maxlength="160" value="${attr(course.runname)}" placeholder="Course name" /></label>
        <label class="global-course-grid-cell"><span class="global-course-mobile-label">Global Subject</span>${course.isNew ? `<select data-course-field="subjectid" data-course-key="${attr(course.key)}">${subjectOptions(course.subjectid)}</select>` : `<span class="global-course-subject-readonly">${html(subjectById(course.subjectid)?.subjectname || course.subjectid)}</span>`}</label>
        <label class="global-course-grid-cell"><span class="global-course-mobile-label">Type</span><select data-course-field="type" data-course-key="${attr(course.key)}"><option value="FIXED" ${fixed ? "selected" : ""}>FIXED</option><option value="ONGOING" ${!fixed ? "selected" : ""}>ONGOING</option></select></label>
        <label class="global-course-grid-cell"><span class="global-course-mobile-label">${fixed ? "Start Date" : "Publish From"}</span><input data-course-field="date1" data-course-key="${attr(course.key)}" type="date" value="${attr(date1)}" /></label>
        <label class="global-course-grid-cell"><span class="global-course-mobile-label">${fixed ? "End Date" : "Publish Through"}</span><input data-course-field="date2" data-course-key="${attr(course.key)}" type="date" value="${attr(date2)}" /></label>
        <label class="global-course-grid-cell"><span class="global-course-mobile-label">Access</span><select data-course-field="accessmodel" data-course-key="${attr(course.key)}" ${accessDisabled}><option value="FREE" ${course.accessmodel === "FREE" ? "selected" : ""}>FREE</option><option value="PAID" ${course.accessmodel === "PAID" ? "selected" : ""}>PAID</option></select></label>
        <label class="global-course-grid-cell"><span class="global-course-mobile-label">Status</span><select data-course-field="active" data-course-key="${attr(course.key)}"><option value="ACTIVE" ${course.active ? "selected" : ""}>ACTIVE</option><option value="INACTIVE" ${!course.active ? "selected" : ""}>INACTIVE</option></select></label>
        <div class="global-course-grid-cell global-course-actions-cell">
          <span class="global-course-mobile-label">Schedule / Publish</span>
          <div class="global-course-row-actions">
            <button type="button" class="global-course-inline-action" data-gcm-course-action="toggle-schedule" data-course-key="${attr(course.key)}" aria-expanded="${scheduleOpen ? "true" : "false"}">Schedule ${scheduleOpen ? "▴" : "▾"}</button>
            ${course.runid ? `<button type="button" class="global-course-inline-action" data-gcm-course-action="view-sessions" data-course-key="${attr(course.key)}">View/Edit Sessions</button>` : ""}
            ${publishRowButton(course, state, sessionCount)}
            ${course.isNew ? `<button type="button" class="global-course-draft-remove" data-gcm-course-action="discard-course" data-course-key="${attr(course.key)}" aria-label="Discard new Course" title="Discard new Course">×</button>` : ""}
          </div>
          <span class="global-course-publication-state">${html(publicationLabel)} · ${sessionCount} session${sessionCount === 1 ? "" : "s"}</span>
        </div>
      </div>
      ${scheduleOpen ? scheduleEditor(course) : ""}
    </article>`;
  }

  function publishRowButton(course, state, sessionCount) {
    if (!course.runid || !course.active) return "";
    const published = state?.stage === "PUBLISHED";
    if (published && course.type === "FIXED") {
      return '<button type="button" class="global-course-publish-inline is-published" disabled>Published</button>';
    }
    const blocked = course.dirty || course.scheduleDirty || course.windowDirty || !sessionCount || (course.type === "ONGOING" && !validPublishWindow(course));
    const label = published && course.type === "ONGOING" ? "Publish range" : "Publish";
    return `<button type="button" class="global-course-publish-inline" data-gcm-course-action="publish-course" data-course-key="${attr(course.key)}" ${blocked ? "disabled" : ""}>${label}</button>`;
  }

  function scheduleEditor(course) {
    const rows = course.scheduleRows.length ? course.scheduleRows : [blankScheduleRow()];
    return `<div class="global-course-schedule-editor ${course.scheduleDirty ? "is-dirty" : ""}">
      <div class="global-course-schedule-heading"><div><h4>Recurring schedule</h4><p class="helper-text">${course.type === "ONGOING" ? "Publish From / Through controls which exact dated sessions are prepared and published." : "Start / End dates define this fixed delivery period."}</p></div><button type="button" class="global-course-compact-action" data-gcm-course-action="add-schedule-row" data-course-key="${attr(course.key)}">+ Another Time Slot</button></div>
      <div class="global-course-schedule-rows">${rows.map((row, index) => scheduleRow(course, row, index)).join("")}</div>
      <p class="global-course-save-hint">Use the main Courses Save icon to store Course and schedule changes without publishing.</p>
    </div>`;
  }

  function scheduleRow(course, row, index) {
    const selectedDays = new Set(array(row.days).map(value => String(value).toUpperCase()));
    return `<div class="global-course-schedule-row ${row.dirty ? "is-dirty" : ""}" data-course-key="${attr(course.key)}" data-schedule-row-key="${attr(row.key)}">
      ${field("Days", `<div class="global-course-day-pills">${dayPills(selectedDays, course.key, row.key)}</div>`)}
      ${field("Start", `<input data-course-schedule-field="start" data-course-key="${attr(course.key)}" data-row-key="${attr(row.key)}" data-time24 type="text" inputmode="numeric" value="${attr(formatUiTime(row.start))}" placeholder="04h00" />`)}
      ${field("End", `<input data-course-schedule-field="end" data-course-key="${attr(course.key)}" data-row-key="${attr(row.key)}" data-time24 type="text" inputmode="numeric" value="${attr(formatUiTime(row.end))}" placeholder="05h00" />`)}
      ${field("Module", `<select data-course-schedule-field="moduleid" data-course-key="${attr(course.key)}" data-row-key="${attr(row.key)}"><option value="">No module</option>${moduleOptions(course.subjectid, row.moduleid)}</select>`)}
      ${field("Teacher", `<select data-course-schedule-field="teacherid" data-course-key="${attr(course.key)}" data-row-key="${attr(row.key)}">${teacherOptions(row.teacherid)}</select>`)}
      ${field("Zoom link", `<input data-course-schedule-field="zoom" data-course-key="${attr(course.key)}" data-row-key="${attr(row.key)}" type="url" value="${attr(row.zoom)}" inputmode="url" placeholder="https://…" />`)}
      <button type="button" class="global-course-remove-row" data-gcm-course-action="remove-schedule-row" data-course-key="${attr(course.key)}" data-row-key="${attr(row.key)}" ${rowsOnlyBlank(course, row, index) ? "disabled" : ""} aria-label="Remove time slot" title="Remove time slot">×</button>
    </div>`;
  }

  function rowsOnlyBlank(course, row, index) {
    return course.scheduleRows.length === 1 && index === 0 && row.isNew && !scheduleHasContent(row);
  }

  function courseAccessMigrationBanner() {
    if (model.delivery.courseAccessSchemaReady) return "";
    const globalAdmin = isGlobalAdmin();
    return `<section class="global-course-migration-banner">
      <div><strong>Prepare Course FREE/PAID access</strong><p>Existing Courses are currently showing the equivalent of their Global Subject access. This one-time migration adds Course-level FREE/PAID storage without changing current access.</p></div>
      ${globalAdmin ? `<button type="button" class="global-course-compact-action" data-gcm-course-action="preview-course-access-migration">Prepare Courses</button>` : '<span class="helper-text">A GLOBAL_ADMIN must run this one-time migration.</span>'}
    </section>`;
  }

  async function previewCourseAccessMigration(button) {
    await withBusy(button, "Checking…", async () => {
      const result = await apiPost("/api/admin/platform/global/courses/migrate-access", { commit: false }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to preview Course access migration");
      if (!result.canCommit) {
        setMessage("Course FREE/PAID access is already prepared.", "success");
        await load(true);
        return;
      }
      if (!window.confirm(`Prepare FREE/PAID access for ${Number(result.courseCount || 0)} Course${Number(result.courseCount || 0) === 1 ? "" : "s"}? Existing access is preserved.\n\nContinue?`)) return;
      await migrateCourseAccess(button);
    });
  }

  async function migrateCourseAccess(button) {
    await withBusy(button, "Migrating…", async () => {
      const result = await apiPost("/api/admin/platform/global/courses/migrate-access", {
        commit: true,
        confirmation: "MIGRATE COURSES"
      }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to prepare Course FREE/PAID access");
      await load(true);
      setMessage(result.message || "Course FREE/PAID access prepared.", "success");
    });
  }

  function syncCourseField(target, fromChange) {
    const course = findCourse(target.dataset.courseKey || "");
    if (!course) return;
    const fieldName = target.dataset.courseField || "";
    const value = String(target.value || "").trim();
    if (fieldName === "runname") course.runname = value;
    if (fieldName === "subjectid" && course.isNew) {
      course.subjectid = value;
      if (!course.accessmodel || !model.delivery.courseAccessSchemaReady) course.accessmodel = fallbackCourseAccess(value);
    }
    if (fieldName === "type") {
      const next = COURSE_TYPES.includes(value.toUpperCase()) ? value.toUpperCase() : "FIXED";
      if (next !== course.type) {
        course.type = next;
        if (next === "ONGOING") {
          course._fixedStart = course.startdate;
          course._fixedEnd = course.enddate;
          course.startdate = "";
          course.enddate = "";
          course.windowDirty = Boolean(course.publishstart || course.publishend);
        } else {
          course.startdate = course.startdate || course._fixedStart || "";
          course.enddate = course.enddate || course._fixedEnd || "";
          course.windowDirty = false;
        }
      }
    }
    if (fieldName === "date1") {
      if (course.type === "FIXED") course.startdate = value;
      else { course.publishstart = value; course.windowDirty = true; }
    }
    if (fieldName === "date2") {
      if (course.type === "FIXED") course.enddate = value;
      else { course.publishend = value; course.windowDirty = true; }
    }
    if (fieldName === "accessmodel" && COURSE_ACCESS.includes(value.toUpperCase())) course.accessmodel = value.toUpperCase();
    if (fieldName === "active") course.active = value.toUpperCase() === "ACTIVE";
    refreshCourseDirty(course);
    if (fromChange) refreshCourseSaveState();
  }

  function syncScheduleField(target) {
    const course = findCourse(target.dataset.courseKey || target.closest("[data-course-key]")?.dataset.courseKey || "");
    if (!course) return;
    const rowKey = target.dataset.rowKey || target.closest("[data-schedule-row-key]")?.dataset.scheduleRowKey || "";
    const row = course.scheduleRows.find(item => item.key === rowKey);
    if (!row) return;
    if (target.matches("[data-course-schedule-day]")) {
      const root = target.closest("[data-schedule-row-key]");
      row.days = root ? [...root.querySelectorAll("[data-course-schedule-day]:checked")].map(input => String(input.value || "")) : row.days;
    } else {
      const fieldName = target.dataset.courseScheduleField || "";
      if (fieldName === "start") row.start = String(target.value || "");
      if (fieldName === "end") row.end = String(target.value || "");
      if (fieldName === "moduleid") row.moduleid = String(target.value || "");
      if (fieldName === "teacherid") row.teacherid = String(target.value || "");
      if (fieldName === "zoom") row.zoom = String(target.value || "").trim();
    }
    refreshScheduleDirty(course, row);
    refreshCourseSaveState();
  }

  function refreshCourseDirty(course) {
    course.dirty = course.isNew || JSON.stringify(courseSnapshot(course)) !== JSON.stringify(course.original);
    const root = document.querySelector(`[data-course-key="${cssEscape(course.key)}"].global-course-record`);
    root?.classList.toggle("is-dirty", course.dirty || course.scheduleDirty || course.windowDirty);
  }

  function refreshScheduleDirty(course, row) {
    row.dirty = row.isNew ? scheduleHasContent(row) : JSON.stringify(scheduleSnapshot(row)) !== JSON.stringify(row.original);
    course.scheduleDirty = course.removedSessionIds.length > 0 || course.scheduleRows.some(item => item.dirty);
    refreshCourseDirty(course);
    const root = document.querySelector(`[data-course-key="${cssEscape(course.key)}"] [data-schedule-row-key="${cssEscape(row.key)}"]`);
    root?.classList.toggle("is-dirty", row.dirty);
    document.querySelector(`[data-course-key="${cssEscape(course.key)}"] .global-course-schedule-editor`)?.classList.toggle("is-dirty", course.scheduleDirty);
  }

  function toggleSchedule(courseKey) {
    model.scheduleOpenKey = model.scheduleOpenKey === courseKey ? "" : courseKey;
    render();
  }

  function addCourseDraft() {
    const draft = newCourseDraft();
    model.courses.push(draft);
    model.courseFilter = "ALL";
    model.scheduleOpenKey = draft.key;
    render();
    requestAnimationFrame(() => document.querySelector(`[data-course-key="${cssEscape(draft.key)}"] input[data-course-field="runname"]`)?.focus());
  }

  function discardCourseDraft(courseKey) {
    const course = findCourse(courseKey);
    if (!course?.isNew) return;
    model.courses = model.courses.filter(item => item.key !== courseKey);
    if (model.scheduleOpenKey === courseKey) model.scheduleOpenKey = "";
    render();
  }

  function addScheduleRow(courseKey) {
    const course = findCourse(courseKey);
    if (!course) return;
    course.scheduleRows.push(blankScheduleRow());
    course.scheduleDirty = true;
    model.scheduleOpenKey = courseKey;
    render();
  }

  function removeScheduleRow(courseKey, rowKey) {
    const course = findCourse(courseKey);
    if (!course) return;
    const row = course.scheduleRows.find(item => item.key === rowKey);
    if (!row) return;
    if (!row.isNew) course.removedSessionIds.push(...row.sessionIds);
    course.scheduleRows = course.scheduleRows.filter(item => item.key !== rowKey);
    if (!course.scheduleRows.length) course.scheduleRows = [blankScheduleRow()];
    course.scheduleDirty = true;
    refreshCourseDirty(course);
    render();
  }

  async function saveCourses(button) {
    if (!model.delivery.courseAccessSchemaReady) {
      setMessage("Prepare Course FREE/PAID access before saving Courses.", "error");
      return false;
    }
    const dirty = dirtyCourses();
    if (!dirty.length) return true;
    if (!validateCourseDrafts(dirty)) return false;

    const preservedWindows = new Map();
    const ok = await withBusy(button, "…", async () => {
      const token = appState()?.token || "";
      let savedCount = 0;
      for (const course of dirty) {
        const priorRunId = course.runid;
        const timetableWork = course.scheduleDirty || course.windowDirty || deliveryWindowChanged(course);
        const metadataWork = course.dirty || course.isNew;
        if (priorRunId && stateForRun(priorRunId)?.stage === "PUBLISHED" && (metadataWork || timetableWork)) {
          const revised = await apiPost("/api/admin/platform/global/timetable/revise", { runId: priorRunId }, token);
          if (!revised.success) throw new Error(revised.error || revised.detail || `Unable to open a revision for ${course.runname}`);
        }

        if (metadataWork) {
          const saved = await apiPost("/api/admin/platform/global/run/save", {
            runId: course.runid,
            subjectId: course.subjectid,
            runName: course.runname,
            startDate: course.type === "FIXED" ? course.startdate : "",
            endDate: course.type === "FIXED" ? course.enddate : "",
            ongoing: course.type === "ONGOING",
            accessModel: course.accessmodel,
            active: course.active
          }, token);
          if (!saved.success) throw new Error(saved.error || saved.detail || `Unable to save ${course.runname || "Course"}`);
          course.runid = String(saved.run?.runid || course.runid || "");
          if (!course.runid) throw new Error("Course save did not return a RunID");
        }

        if (timetableWork || (course.isNew && course.scheduleRows.some(scheduleHasContent))) {
          await saveCourseSchedule(course, priorRunId, token);
        }
        if (course.type === "ONGOING" && validPublishWindow(course)) {
          preservedWindows.set(course.runid, { start: course.publishstart, end: course.publishend });
        }
        savedCount += 1;
      }
      model.scheduleOpenKey = "";
      invalidateAll();
      await load(true);
      for (const [runId, window] of preservedWindows) {
        const reloaded = model.courses.find(item => item.runid === runId);
        if (!reloaded) continue;
        reloaded.publishstart = window.start;
        reloaded.publishend = window.end;
        reloaded.windowDirty = false;
      }
      render();
      setMessage(`${savedCount} Course${savedCount === 1 ? "" : "s"} saved. Published timetables remain unchanged until Publish is used.`, "success");
    });
    return ok;
  }

  async function saveCourseSchedule(course, priorRunId, token) {
    const sourceRunId = priorRunId || course.runid;
    const sourceSessions = sourceRunId ? sessionsForRun(sourceRunId) : [];
    const changesById = new Map();
    const removed = new Set(course.removedSessionIds);
    const newFixedWindow = deliveryWindowChanged(course);
    const ongoingWindow = course.type === "ONGOING" && validPublishWindow(course);
    const selectedOngoingWindow = ongoingWindow
      ? session => session.sessiondate >= course.publishstart && session.sessiondate <= course.publishend
      : () => true;

    // A new FIXED delivery window is a repeat of the Course, not a rewrite of history.
    // Preserve historical source sessions and use the recurring rows as templates for
    // the newly selected Start/End window. For ONGOING Courses, schedule edits apply
    // only to the explicitly selected Publish From/Through window.
    if (!newFixedWindow) {
      for (const sessionId of removed) {
        const session = sourceSessions.find(item => item.sessionid === sessionId);
        if (!session || !selectedOngoingWindow(session)) continue;
        changesById.set(sessionId, sessionChange(session, { status: "CANCELLED" }));
      }
    }

    const generateSpecs = [];
    for (const row of course.scheduleRows) {
      if (!scheduleHasContent(row)) continue;
      const currentDays = new Set(row.days);

      if (newFixedWindow) {
        if (currentDays.size) generateSpecs.push({ row, days: [...currentDays], ensure: true });
        continue;
      }

      if (row.dirty && !row.isNew) {
        for (const sessionId of row.sessionIds) {
          const session = sourceSessions.find(item => item.sessionid === sessionId);
          if (!session || !selectedOngoingWindow(session)) continue;
          const day = weekdayCode(session.sessiondate);
          changesById.set(sessionId, sessionChange(session, {
            startTime: parseUiTime(row.start), endTime: parseUiTime(row.end), moduleId: row.moduleid,
            teacherAccountId: row.teacherid, zoomLink: row.zoom,
            status: currentDays.has(day) ? "SCHEDULED" : "CANCELLED"
          }));
        }
      }

      if (course.type === "ONGOING" && (course.windowDirty || row.dirty)) {
        if (currentDays.size) generateSpecs.push({ row, days: [...currentDays], ensure: true });
      } else if (row.dirty) {
        if (row.isNew) {
          generateSpecs.push({ row, days: [...currentDays], ensure: true });
        } else {
          const originalDays = new Set(row.original?.days || []);
          const addedDays = [...currentDays].filter(day => !originalDays.has(day));
          if (addedDays.length) generateSpecs.push({ row, days: addedDays, ensure: true });
        }
      }
    }

    if (changesById.size) {
      const result = await apiPost("/api/admin/platform/global/timetable/session/batch-save", {
        runId: course.runid,
        changes: [...changesById.values()]
      }, token);
      if (!result.success) throw new Error(result.error || result.detail || `Unable to update the schedule for ${course.runname}`);
    }

    for (const spec of generateSpecs) {
      if (!spec.days.length) continue;
      const result = await apiPost("/api/admin/platform/global/timetable/generate", {
        runId: course.runid,
        moduleId: spec.row.moduleid,
        weekdays: spec.days,
        startTime: parseUiTime(spec.row.start),
        endTime: parseUiTime(spec.row.end),
        teacherAccountId: spec.row.teacherid,
        zoomLink: spec.row.zoom,
        skipExistingEquivalent: spec.ensure === true,
        ...(course.type === "ONGOING" ? {
          generationStartDate: course.publishstart,
          generationEndDate: course.publishend
        } : {})
      }, token);
      if (!result.success) throw new Error(result.error || result.detail || `Unable to generate the schedule for ${course.runname}`);
    }
  }

  function sessionChange(session, overrides = {}) {
    return {
      sessionId: session.sessionid,
      sessionDate: overrides.sessionDate || session.sessiondate,
      startTime: overrides.startTime || normalizeTime(session.starttime),
      endTime: overrides.endTime || normalizeTime(session.endtime),
      moduleId: overrides.moduleId !== undefined ? overrides.moduleId : (session.moduleid || ""),
      teacherAccountId: overrides.teacherAccountId !== undefined ? overrides.teacherAccountId : (session.teacheraccountid || ""),
      zoomLink: overrides.zoomLink !== undefined ? overrides.zoomLink : (session.zoomlink || ""),
      active: session.active !== false,
      status: overrides.status || currentLifecycleStatus(session.sessionid)
    };
  }

  function validateCourseDrafts(courses) {
    for (const course of courses) {
      if (!course.subjectid) { setMessage("Every Course requires a Global Subject.", "error"); return false; }
      if (!course.runname.trim()) { setMessage("Every Course requires a Course Name.", "error"); return false; }
      if (!COURSE_TYPES.includes(course.type)) { setMessage("Course Type must be FIXED or ONGOING.", "error"); return false; }
      if (!COURSE_ACCESS.includes(course.accessmodel)) { setMessage("Course Access must be FREE or PAID.", "error"); return false; }
      if (course.type === "FIXED") {
        if (!isIsoDate(course.startdate) || !isIsoDate(course.enddate) || course.enddate < course.startdate) {
          setMessage(`${course.runname || "Course"}: FIXED Courses require valid Start and End dates.`, "error"); return false;
        }
      }
      if (course.type === "ONGOING" && (course.scheduleDirty || course.windowDirty)) {
        if (!validPublishWindow(course)) {
          setMessage(`${course.runname || "Course"}: ONGOING schedule work requires Publish From and Publish Through dates.`, "error"); return false;
        }
        if (!course.scheduleRows.some(scheduleHasContent)) {
          setMessage(`${course.runname || "Course"}: add at least one recurring time slot before preparing an ONGOING publication window.`, "error"); return false;
        }
      }
      for (const row of course.scheduleRows.filter(item => item.dirty && scheduleHasContent(item))) {
        if (!row.days.length || !parseUiTime(row.start) || !parseUiTime(row.end) || parseUiTime(row.end) <= parseUiTime(row.start)) {
          setMessage(`${course.runname || "Course"}: every changed schedule row needs days and a valid increasing time such as 13h00–14h00.`, "error"); return false;
        }
      }
    }
    return true;
  }

  async function publishCourseFromRow(courseKey, button) {
    const course = findCourse(courseKey);
    if (!course?.runid) return;
    if (course.dirty || course.scheduleDirty || course.windowDirty) {
      setMessage("Save this Course, schedule and publication window before publishing.", "error");
      return;
    }
    await publishRun(course, button);
  }

  async function publishRun(course, button) {
    if (course.type === "ONGOING" && !validPublishWindow(course)) {
      setMessage(`${course.runname}: enter Publish From and Publish Through before publishing an ONGOING Course.`, "error");
      return false;
    }
    await withBusy(button, "Publishing…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/publish", {
        runId: course.runid,
        ...(course.type === "ONGOING" ? { publishStartDate: course.publishstart, publishEndDate: course.publishend } : {})
      }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to publish Course");
      invalidateAll();
      await load(true);
      setMessage(result.message || "Course published.", "success");
    });
    return true;
  }

  function openSessionEditor(courseKey) {
    const course = findCourse(courseKey);
    if (!course?.runid) return;
    if (course.dirty || course.scheduleDirty || course.windowDirty) {
      setMessage("Save the Course, schedule and publication window before opening its sessions.", "error");
      return;
    }
    if (model.sessionDrafts.size && !discardSessionDraftsConfirmed()) return;
    model.sessionOpenRunId = course.runid;
    render();
    requestAnimationFrame(() => document.querySelector(".global-course-sessions-panel")?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
  }

  function closeSessionEditor() {
    if (!discardSessionDraftsConfirmed()) return;
    model.sessionOpenRunId = "";
    render();
  }

  function sessionSectionForOpenCourse() {
    const course = model.courses.find(item => item.runid === model.sessionOpenRunId);
    if (!course) return "";
    const state = stateForRun(course.runid) || { stage: "DEVELOPMENT" };
    const sessions = currentWindowSessions(course.runid, course);
    const stage = state.stage || "DEVELOPMENT";
    const canEdit = stage === "DEVELOPMENT";
    const pending = model.sessionDrafts.size;
    return `<section class="global-curriculum-panel global-course-sessions-panel">
      <div class="global-curriculum-panel-heading global-course-session-heading">
        <div class="global-course-session-title"><button type="button" class="global-course-session-close" data-gcm-course-action="close-sessions" aria-label="Close session editor" title="Close">×</button><div><h3>${html(course.runname)} — Sessions</h3><p class="helper-text">${sessions.length} session${sessions.length === 1 ? "" : "s"}${pending ? ` · ${pending} unsaved change${pending === 1 ? "" : "s"}` : ""}</p></div></div>
        ${stage === "PUBLISHED" ? `<button type="button" class="global-course-compact-action" data-gcm-course-action="revise" data-run-id="${attr(course.runid)}">Revise timetable</button>` : ""}
      </div>
      <div class="global-session-inline-scroll">
        <div class="global-session-inline-table" role="table" aria-label="Course sessions">
          <div class="global-session-inline-row global-session-inline-header" role="row"><span>Date</span><span>Start</span><span>End</span><span>Module</span><span>Teacher</span><span>Zoom link</span><span>Status</span></div>
          ${sessions.length ? sessions.map(session => sessionInlineRow(session, stage)).join("") : '<p class="global-curriculum-empty-list">No sessions in this Course delivery window.</p>'}
        </div>
      </div>
      <div class="global-course-session-actions">
        ${canEdit ? `<button type="button" class="global-course-secondary-action" data-gcm-course-action="discard-session-drafts" ${pending ? "" : "disabled"}>Cancel all changes</button><button type="button" class="global-course-secondary-action" data-gcm-course-action="save-session-batch" ${pending ? "" : "disabled"}>Save without publishing</button><button type="button" class="global-curriculum-primary global-course-compact-action" data-gcm-course-action="save-publish-sessions">Save &amp; Publish</button>` : ""}
      </div>
    </section>`;
  }

  function sessionInlineRow(session, stage) {
    const lifecycle = lifecycleForSession(session.sessionid);
    const readOnly = stage === "PUBLISHED" || lifecycle.status === "RESCHEDULED";
    const draft = model.sessionDrafts.get(session.sessionid) || null;
    const values = draft || {
      date: session.sessiondate,
      start: formatUiTime(session.starttime),
      end: formatUiTime(session.endtime),
      moduleid: session.moduleid || "",
      teacherid: session.teacheraccountid || "",
      zoom: session.zoomlink || "",
      status: lifecycle.status || "SCHEDULED"
    };
    const rowClasses = ["global-session-inline-row", values.status === "CANCELLED" ? "is-cancelled" : "", draft ? "is-dirty" : ""].filter(Boolean).join(" ");
    const dateInfo = calendarInfoForDate(values.date || session.sessiondate);
    const fields = readOnly
      ? [
          readOnlySessionCell("Date", `${formatDate(session.sessiondate)}${dateInfo.text ? ` · ${dateInfo.text}` : ""}`, dateInfo.className),
          readOnlySessionCell("Start", formatUiTime(session.starttime)), readOnlySessionCell("End", formatUiTime(session.endtime)),
          readOnlySessionCell("Module", session.modulename || session.subjectname || "Session"),
          readOnlySessionCell("Teacher", session.teachername || "TBA"), readOnlySessionCell("Zoom link", session.zoomlink || "—", "global-session-zoom-display"),
          readOnlySessionCell("Status", lifecycle.status || "SCHEDULED")
        ].join("")
      : [
          sessionCell("Date", `<input data-inline-session-field="date" type="date" value="${attr(values.date)}" aria-label="Session date" />${dateInfo.text ? `<small class="global-session-calendar-note ${attr(dateInfo.className)}">${html(dateInfo.text)}</small>` : ""}`),
          sessionCell("Start", `<input data-inline-session-field="start" data-time24 type="text" inputmode="numeric" value="${attr(values.start)}" aria-label="Start time" />`),
          sessionCell("End", `<input data-inline-session-field="end" data-time24 type="text" inputmode="numeric" value="${attr(values.end)}" aria-label="End time" />`),
          sessionCell("Module", `<select data-inline-session-field="moduleid" aria-label="Module"><option value="">No module</option>${moduleOptions(session.subjectid, values.moduleid)}</select>`),
          sessionCell("Teacher", `<select data-inline-session-field="teacherid" aria-label="Teacher">${teacherOptions(values.teacherid)}</select>`),
          sessionCell("Zoom link", `<input data-inline-session-field="zoom" type="url" value="${attr(values.zoom)}" aria-label="Zoom link" />`, "global-session-zoom-cell"),
          sessionCell("Status", `<select data-inline-session-field="status" aria-label="Session status"><option value="SCHEDULED" ${values.status === "SCHEDULED" ? "selected" : ""}>SCHEDULED</option><option value="CANCELLED" ${values.status === "CANCELLED" ? "selected" : ""}>CANCELLED</option></select>`)
        ].join("");
    return `<div class="${rowClasses}" role="row" data-session-row-id="${attr(session.sessionid)}">${fields}</div>`;
  }

  function captureSessionDraft(row) {
    if (!row || !model.sessionOpenRunId) return;
    const sessionId = String(row.dataset.sessionRowId || "");
    const session = sessionsForRun(model.sessionOpenRunId).find(item => item.sessionid === sessionId);
    if (!session) return;
    const lifecycle = lifecycleForSession(sessionId);
    if ((stateForRun(model.sessionOpenRunId)?.stage || "DEVELOPMENT") !== "DEVELOPMENT" || lifecycle.status === "RESCHEDULED") return;
    const current = {
      date: String(row.querySelector('[data-inline-session-field="date"]')?.value || ""),
      start: String(row.querySelector('[data-inline-session-field="start"]')?.value || ""),
      end: String(row.querySelector('[data-inline-session-field="end"]')?.value || ""),
      moduleid: String(row.querySelector('[data-inline-session-field="moduleid"]')?.value || ""),
      teacherid: String(row.querySelector('[data-inline-session-field="teacherid"]')?.value || ""),
      zoom: String(row.querySelector('[data-inline-session-field="zoom"]')?.value || "").trim(),
      status: String(row.querySelector('[data-inline-session-field="status"]')?.value || "SCHEDULED")
    };
    const changed = current.date !== String(session.sessiondate || "")
      || (parseUiTime(current.start) || current.start.trim()) !== normalizeTime(session.starttime)
      || (parseUiTime(current.end) || current.end.trim()) !== normalizeTime(session.endtime)
      || current.moduleid !== String(session.moduleid || "") || current.teacherid !== String(session.teacheraccountid || "")
      || current.zoom !== String(session.zoomlink || "").trim() || current.status !== String(lifecycle.status || "SCHEDULED");
    if (changed) model.sessionDrafts.set(sessionId, current); else model.sessionDrafts.delete(sessionId);
    row.classList.toggle("is-dirty", changed);
    row.classList.toggle("is-cancelled", current.status === "CANCELLED");
    refreshSessionButtons();
  }

  async function saveSessionBatch(button, publishAfter) {
    captureAllSessionDrafts();
    const course = model.courses.find(item => item.runid === model.sessionOpenRunId);
    if (!course) return false;
    if (model.sessionDrafts.size) {
      const changes = [];
      for (const [sessionId, draft] of model.sessionDrafts) {
        const session = sessionsForRun(course.runid).find(item => item.sessionid === sessionId);
        if (!session) continue;
        const startTime = parseUiTime(draft.start); const endTime = parseUiTime(draft.end);
        if (!isIsoDate(draft.date)) { setMessage("Every changed session requires a valid date.", "error"); return false; }
        if (!startTime || !endTime || endTime <= startTime) { setMessage("Use increasing 24-hour times such as 13h00–14h00.", "error"); return false; }
        changes.push({
          sessionId, sessionDate: draft.date, startTime, endTime, moduleId: draft.moduleid,
          teacherAccountId: draft.teacherid, zoomLink: draft.zoom, active: session.active !== false, status: draft.status
        });
      }
      const savedOk = await withBusy(button, "Saving…", async () => {
        const result = await apiPost("/api/admin/platform/global/timetable/session/batch-save", { runId: course.runid, changes }, appState()?.token || "");
        if (!result.success) throw new Error(result.error || result.detail || "Unable to save session changes");
        model.sessionDrafts.clear();
      });
      if (!savedOk) return false;
    }
    if (publishAfter) {
      if (course.type === "ONGOING" && !validPublishWindow(course)) {
        setMessage(`${course.runname}: enter Publish From and Publish Through in the Course row before publishing.`, "error");
        return false;
      }
      const result = await apiPost("/api/admin/platform/global/timetable/publish", {
        runId: course.runid,
        ...(course.type === "ONGOING" ? { publishStartDate: course.publishstart, publishEndDate: course.publishend } : {})
      }, appState()?.token || "");
      if (!result.success) { setMessage(result.error || result.detail || "Unable to publish Course", "error"); return false; }
      setMessage(result.message || "Course published.", "success");
    } else {
      setMessage("Session changes saved without publishing.", "success");
    }
    invalidateAll();
    await load(true);
    model.sessionOpenRunId = course.runid;
    render();
    return true;
  }

  async function reviseCourse(button, runId) {
    if (!runId) return false;
    if (model.sessionDrafts.size) { setMessage("Save or discard session changes first.", "error"); return false; }
    await withBusy(button, "Opening…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/revise", { runId }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to open revision");
      invalidateAll();
      await load(true);
      model.sessionOpenRunId = runId;
      render();
      setMessage(result.message || "Revision opened.", "success");
    });
    return true;
  }

  function discardSessionDrafts() {
    model.sessionDrafts.clear();
    render();
  }
  function captureAllSessionDrafts() { document.querySelectorAll("#global-curriculum-screen [data-session-row-id]").forEach(captureSessionDraft); }
  function discardSessionDraftsConfirmed() {
    if (!model.sessionDrafts.size) return true;
    if (!window.confirm("Discard unsaved session changes?")) return false;
    model.sessionDrafts.clear(); return true;
  }
  function refreshSessionButtons() {
    const pending = model.sessionDrafts.size > 0;
    document.querySelectorAll('#global-curriculum-screen [data-gcm-course-action="save-session-batch"], #global-curriculum-screen [data-gcm-course-action="discard-session-drafts"]').forEach(button => { button.disabled = !pending; });
  }

  function calendarInfoForDate(date) {
    const events = model.timetable.calendarEvents.filter(event => String(event.startDate || "") <= date && String(event.endDate || event.startDate || "") >= date);
    const holiday = events.find(event => String(event.eventType || "").toUpperCase() === "PUBLIC_HOLIDAY");
    if (holiday) return { text: holiday.description || "Holiday", className: "is-holiday" };
    const islamic = events.find(event => ["ISLAMIC_DAY", "RELIGIOUS_PERIOD"].includes(String(event.eventType || "").toUpperCase()));
    if (islamic) return { text: [islamic.description, islamic.islamicDate].filter(Boolean).join(" · "), className: "is-islamic" };
    return { text: "", className: "" };
  }

  function currentWindowSessions(runId, courseLike) {
    const sessions = sessionsForRun(runId);
    const type = courseLike?.type || ((!courseLike?.startdate && !courseLike?.enddate) ? "ONGOING" : "FIXED");
    if (type === "ONGOING") {
      const start = courseLike?.publishstart || "";
      const end = courseLike?.publishend || "";
      return isIsoDate(start) && isIsoDate(end) && end >= start
        ? sessions.filter(item => item.sessiondate >= start && item.sessiondate <= end)
        : sessions;
    }
    const start = courseLike?.startdate || ""; const end = courseLike?.enddate || "";
    if (!start || !end) return sessions;
    return sessions.filter(item => item.sessiondate >= start && item.sessiondate <= end);
  }

  function courseSnapshot(course) {
    return {
      subjectid: course.subjectid, runname: course.runname, type: course.type,
      startdate: course.type === "FIXED" ? course.startdate : "",
      enddate: course.type === "FIXED" ? course.enddate : "",
      accessmodel: course.accessmodel, active: course.active
    };
  }
  function deliveryWindowChanged(course) {
    if (!course || course.isNew || course.type !== "FIXED") return false;
    const original = course.original || {};
    return original.type !== "FIXED"
      || String(original.startdate || "") !== String(course.startdate || "")
      || String(original.enddate || "") !== String(course.enddate || "");
  }
  function scheduleSnapshot(row) {
    return {
      days: DAY_ORDER.filter(day => row.days.includes(day)), start: normalizeTime(row.start), end: normalizeTime(row.end),
      moduleid: row.moduleid || "", teacherid: row.teacherid || "", zoom: String(row.zoom || "").trim()
    };
  }
  function scheduleHasContent(row) { return Boolean(row.days.length || row.start || row.end || row.moduleid || row.teacherid || row.zoom); }
  function dirtyCourses() { return model.courses.filter(course => course.dirty || course.scheduleDirty || course.windowDirty); }
  function hasUnsavedChanges() { return dirtyCourses().length > 0 || model.sessionDrafts.size > 0; }
  function clearUnsavedState() {
    model.sessionDrafts.clear();
    model.courses = model.delivery.runs.map(run => courseDraftFromRun(run));
    model.scheduleOpenKey = "";
    model.sessionOpenRunId = "";
  }
  function confirmDiscardAll() {
    if (!hasUnsavedChanges()) return true;
    if (!window.confirm("Discard unsaved Course or session changes?")) return false;
    clearUnsavedState(); return true;
  }
  function refreshCourseSaveState() {
    const dirty = dirtyCourses().length > 0;
    const button = document.querySelector('#global-curriculum-screen [data-gcm-course-action="save-courses"]');
    if (button) { button.disabled = !dirty; button.classList.toggle("is-dirty", dirty); }
  }
  function courseSaveButton(dirty) {
    return `<button type="button" class="global-save-icon-button global-resource-screen-save global-course-screen-save ${dirty ? "is-dirty" : ""}" data-gcm-course-action="save-courses" ${dirty ? "" : "disabled"} aria-label="Save all Course and schedule changes" title="Save all Course and schedule changes"><span class="app-icon save-mode-icon" aria-hidden="true"></span><span class="global-save-icon-label">SAVE</span></button>`;
  }

  function fallbackCourseAccess(subjectId) {
    const subject = subjectById(subjectId);
    return String(subject?.accessmodel || "SUBSCRIPTION").toUpperCase() === "FREE" ? "FREE" : "PAID";
  }
  function validPublishWindow(course) { return isIsoDate(course.publishstart) && isIsoDate(course.publishend) && course.publishend >= course.publishstart; }
  function isIsoDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")); }
  function weekdayCode(date) {
    if (!isIsoDate(date)) return "";
    return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(`${date}T00:00:00Z`).getUTCDay()] || "";
  }

  function findCourse(key) { return model.courses.find(item => item.key === key || item.runid === key) || null; }
  function subjectById(id) { return model.delivery.subjects.find(item => item.subjectid === id) || null; }
  function runById(id) { return model.delivery.runs.find(item => item.runid === id) || null; }
  function stateForRun(id) { return model.timetable.states.find(item => item.runid === id) || null; }
  function currentPublication(runId) {
    const state = stateForRun(runId); if (!state?.currentpublicationid) return null;
    return model.timetable.publications.find(item => item.publicationid === state.currentpublicationid) || null;
  }
  function sessionsForRun(id) { return model.timetable.sessions.filter(item => item.runid === id).sort((a, b) => `${a.sessiondate} ${normalizeTime(a.starttime)}`.localeCompare(`${b.sessiondate} ${normalizeTime(b.starttime)}`)); }
  function lifecycleForSession(id) { return model.timetable.lifecycles.find(item => item.sessionid === id) || { status: "SCHEDULED" }; }
  function currentLifecycleStatus(id) { return String(lifecycleForSession(id).status || "SCHEDULED").toUpperCase(); }
  function moduleOptions(subjectId, selectedId) { return model.timetable.modules.filter(item => item.subjectid === subjectId).map(item => `<option value="${attr(item.moduleid)}" ${item.moduleid === selectedId ? "selected" : ""}>${html(item.modulename)}${item.active ? "" : " — inactive"}</option>`).join(""); }
  function teacherOptions(selectedId) { return `<option value="" ${selectedId ? "" : "selected"}>TBA</option>${model.timetable.teachers.filter(item => item.active).map(item => `<option value="${attr(item.accountid)}" ${item.accountid === selectedId ? "selected" : ""}>${html(item.displayname || item.accountid)}</option>`).join("")}`; }
  function subjectOptions(selectedId) { return model.delivery.subjects.map(item => `<option value="${attr(item.subjectid)}" ${item.subjectid === selectedId ? "selected" : ""}>${html(item.subjectname)}</option>`).join(""); }
  function dayPills(selected, courseKey, rowKey) { return DAY_ORDER.map(value => `<label class="global-course-day-pill"><input type="checkbox" data-course-schedule-day data-course-key="${attr(courseKey)}" data-row-key="${attr(rowKey)}" value="${value}" ${selected.has(value) ? "checked" : ""} aria-label="${DAY_LABELS[value]}" /><span>${DAY_LABELS[value]}</span></label>`).join(""); }

  function sessionCell(label, control, extraClass = "") { return `<label class="global-session-cell ${attr(extraClass)}"><span class="global-session-cell-label">${html(label)}</span>${control}</label>`; }
  function readOnlySessionCell(label, value, extraClass = "") { return `<div class="global-session-cell global-session-readonly-cell ${attr(extraClass)}"><span class="global-session-cell-label">${html(label)}</span><span>${html(value)}</span></div>`; }
  function field(label, control) { return `<label class="global-curriculum-field"><span>${html(label)}</span>${control}</label>`; }
  function formatDate(value) { const text = String(value || ""); const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text); if (!m) return text; return `${m[3]} ${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2])]} ${m[1]}`; }
  function parseUiTime(value) { const text = String(value || "").trim().toLowerCase().replace(/\s+/g, ""); const match = /^(\d{1,2})(?:h|:)?(\d{2})$/.exec(text); if (!match) return ""; const hour = Number(match[1]); const minute = Number(match[2]); if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return ""; return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`; }
  function normalizeTime(value) { return parseUiTime(value) || String(value || "").trim(); }
  function formatUiTime(value) { const parsed = parseUiTime(value); return parsed ? parsed.replace(":", "h") : String(value || ""); }
  function normalizeTimeField(input) { const parsed = parseUiTime(input?.value); if (parsed) input.value = formatUiTime(parsed); }

  function nextLocalKey(prefix) { model.sequence += 1; return `${prefix}-${Date.now()}-${model.sequence}`; }
  function isGlobalAdmin() { const user = appState()?.user || {}; return String(user.platformrole || user.role || "").trim().toUpperCase() === "GLOBAL_ADMIN"; }
  function invalidateAll() { model.loaded = false; if (window.M4LGlobalCurriculum?.invalidate) window.M4LGlobalCurriculum.invalidate(); }
  function markTabActive() { document.querySelectorAll("#global-curriculum-screen .global-curriculum-tabs button").forEach(button => button.classList.remove("is-active")); document.querySelector('#global-curriculum-screen [data-gcm-course-action="show"]')?.classList.add("is-active"); }
  function setMessage(message, type) { const el = document.getElementById("global-curriculum-message"); if (!el) return; el.textContent = message || ""; el.classList.toggle("is-error", type === "error"); el.classList.toggle("is-success", type === "success"); }
  function setContent(markup) { const el = document.getElementById("global-curriculum-content"); if (el) el.innerHTML = markup; }
  async function withBusy(button, label, work) {
    const original = button?.innerHTML || "";
    if (button) { button.disabled = true; button.textContent = label; }
    let ok = true;
    try {
      await work();
    } catch (error) {
      ok = false;
      setMessage(error.message || "Courses request failed.", "error");
    } finally {
      if (button?.isConnected) { button.disabled = false; button.innerHTML = original; }
      refreshCourseSaveState();
    }
    return ok;
  }
  function array(value) { return Array.isArray(value) ? value : []; }
  function appState() { return typeof state !== "undefined" && state ? state : null; }
  function html(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function attr(value) { return html(value); }
  function cssEscape(value) { return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }

  bind();
  window.M4LGlobalCourseScheduler = Object.freeze({ show, load, invalidate: invalidateAll });
})();
