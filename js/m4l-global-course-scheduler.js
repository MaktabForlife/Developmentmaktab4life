/* M4L V102.11.2 - Global Course Scheduler: compact course setup, multi-day schedule rows and inline session editing. */
(function () {
  "use strict";

  const model = {
    active: false,
    loaded: false,
    loading: false,
    selectedSubjectId: "",
    selectedRunId: "",
    rescheduleSessionId: "",
    scheduleRows: [blankScheduleRow()],
    delivery: emptyDelivery(),
    timetable: emptyTimetable()
  };
  let bound = false;

  function emptyDelivery() {
    return { platformTimezone: "Africa/Johannesburg", subjects: [], policies: [], runs: [] };
  }
  function emptyTimetable() {
    return { subjects: [], modules: [], runs: [], teachers: [], sessions: [], states: [], publications: [], lifecycles: [] };
  }
  function blankScheduleRow() {
    return { key: `schedule-${Date.now()}-${Math.random().toString(16).slice(2)}`, days: [], start: "", end: "", moduleid: "", teacherid: "", zoom: "" };
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
    const target = event.target?.closest?.('#global-curriculum-screen [data-gcm-action="reload"]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void load(true);
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
    if (action === "save-subject-row") return saveSubjectRow(target);
    if (action === "select-course") return selectCourse(target.dataset.runId || "");
    if (action === "new-course") return newCourse(target.dataset.subjectId || model.selectedSubjectId, true);
    if (action === "modify-course") return modifyCourse(target);
    if (action === "add-schedule-row") return addScheduleRow();
    if (action === "remove-schedule-row") return removeScheduleRow(target.dataset.rowKey || "");
    if (action === "save-course") return saveCourse(target);
    if (action === "revise") return reviseCourse(target);
    if (action === "save-session-inline") return saveSessionInline(target);
    if (action === "open-reschedule-inline") return openReschedule(target.dataset.sessionId || "");
    if (action === "close-reschedule") return openReschedule("");
    if (action === "save-reschedule-inline") return saveRescheduleInline(target);
    if (action === "publish") return publishCourse(target);
  }

  function handleChange(event) {
    if (!model.active || !event.target?.closest?.("#global-curriculum-screen")) return;
    const target = event.target;
    if (target.id === "gcm-course-subject") {
      model.selectedSubjectId = String(target.value || "");
      syncScheduleRowsFromDom();
      render();
      return;
    }
    if (target.matches("[data-time24]")) normalizeTimeField(target);
    if (target.matches("[data-course-schedule-field], [data-course-schedule-day]")) syncScheduleRowsFromDom();
  }

  function handleInput(event) {
    if (!model.active || !event.target?.closest?.("#global-curriculum-screen")) return;
    if (event.target.matches("[data-course-schedule-field]")) syncScheduleRowsFromDom();
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
    setMessage("Loading Course Scheduler…", "");
    setContent('<p class="helper-text">Loading Course Scheduler…</p>');
    try {
      const token = appState()?.token || "";
      const [delivery, timetable] = await Promise.all([
        apiPost("/api/admin/platform/global/delivery/get", {}, token),
        apiPost("/api/admin/platform/global/timetable/get", {}, token)
      ]);
      if (!delivery.success) throw new Error(delivery.error || delivery.detail || "Unable to load global courses");
      if (!timetable.success) throw new Error(timetable.error || timetable.detail || "Unable to load course schedules");
      model.delivery = {
        platformTimezone: String(delivery.platformTimezone || "Africa/Johannesburg"),
        subjects: array(delivery.subjects), policies: array(delivery.policies), runs: array(delivery.runs)
      };
      model.timetable = {
        subjects: array(timetable.subjects), modules: array(timetable.modules), runs: array(timetable.runs),
        teachers: array(timetable.teachers), sessions: array(timetable.sessions), states: array(timetable.states),
        publications: array(timetable.publications), lifecycles: array(timetable.lifecycles)
      };
      if (!model.selectedSubjectId || !model.delivery.subjects.some(item => item.subjectid === model.selectedSubjectId)) {
        model.selectedSubjectId = model.delivery.subjects.find(item => item.active)?.subjectid || model.delivery.subjects[0]?.subjectid || "";
      }
      if (model.selectedRunId && !model.delivery.runs.some(item => item.runid === model.selectedRunId)) model.selectedRunId = "";
      model.loaded = true;
      setMessage("", "");
      render();
      return true;
    } catch (error) {
      setMessage(error.message || "Course Scheduler unavailable.", "error");
      setContent('<div class="global-curriculum-empty"><h3>Course Scheduler unavailable</h3><button type="button" data-gcm-course-action="show">Try again</button></div>');
      return false;
    } finally {
      model.loading = false;
    }
  }

  function render() {
    if (!model.active) return;
    markTabActive();
    if (!model.delivery.subjects.length) {
      setContent('<div class="global-curriculum-empty"><h3>No global subjects</h3><p>Create a Global Subject first.</p></div>');
      return;
    }
    const selectedRun = runById(model.selectedRunId);
    if (selectedRun) model.selectedSubjectId = selectedRun.subjectid;
    const state = selectedRun ? stateForRun(selectedRun.runid) : null;
    const locked = state?.stage === "PUBLISHED";
    const selectedSubject = subjectById(model.selectedSubjectId);
    const sessions = selectedRun ? sessionsForRun(selectedRun.runid) : [];
    const rescheduling = sessions.find(item => item.sessionid === model.rescheduleSessionId) || null;

    setContent(`
      <div class="global-course-scheduler-shell">
        ${subjectTable()}
        ${courseTable()}
        ${courseSetup(selectedRun, selectedSubject, state, locked)}
        ${selectedRun ? sessionSection(selectedRun, sessions, rescheduling, state) : ""}
      </div>
    `);
  }

  function subjectTable() {
    return `<section class="global-curriculum-panel global-course-subjects-panel">
      <div class="global-table-scroll"><table class="global-course-table global-course-subject-table">
        <thead><tr><th>Subject</th><th>Access</th><th>Modules</th><th>Status</th><th></th></tr></thead>
        <tbody>${model.delivery.subjects.map(subject => `
          <tr class="${subject.subjectid === model.selectedSubjectId ? "is-selected" : ""}">
            <td><input data-course-subject-name="${attr(subject.subjectid)}" type="text" value="${attr(subject.subjectname)}" maxlength="160" /></td>
            <td><select data-course-subject-access="${attr(subject.subjectid)}"><option value="SUBSCRIPTION" ${subject.accessmodel === "SUBSCRIPTION" ? "selected" : ""}>PAID</option><option value="FREE" ${subject.accessmodel === "FREE" ? "selected" : ""}>FREE</option></select></td>
            <td>${Number(subject.modulecount) || moduleCount(subject.subjectid)}</td>
            <td><select data-course-subject-status="${attr(subject.subjectid)}"><option value="ACTIVE" ${subject.active ? "selected" : ""}>ACTIVE</option><option value="INACTIVE" ${subject.active ? "" : "selected"}>INACTIVE</option></select></td>
            <td>${saveIconButton("Save subject", "save-subject-row", `data-subject-id="${attr(subject.subjectid)}"`)}</td>
          </tr>`).join("")}</tbody>
      </table></div>
    </section>`;
  }

  function courseTable() {
    const runs = [...model.delivery.runs].sort((a, b) => String(b.startdate || "").localeCompare(String(a.startdate || "")));
    return `<section class="global-curriculum-panel global-course-list-panel">
      <div class="global-curriculum-panel-heading"><h3>Global Courses</h3></div>
      <div class="global-table-scroll"><table class="global-course-table">
        <thead><tr><th>Course</th><th>Scheduled dates</th><th>Sessions</th><th>Status</th></tr></thead>
        <tbody>${runs.length ? runs.map(run => {
          const state = stateForRun(run.runid);
          const count = sessionsForRun(run.runid).filter(item => item.active).length;
          const status = run.active === false ? "INACTIVE" : (state?.stage || "DEVELOPMENT");
          return `<tr class="global-course-row ${run.runid === model.selectedRunId ? "is-selected" : ""}" data-gcm-course-action="select-course" data-run-id="${attr(run.runid)}">
            <td><strong>${html(run.runname)}</strong></td><td>${html(formatDate(run.startdate))} – ${html(formatDate(run.enddate))}</td><td>${count}</td><td>${html(status)}</td>
          </tr>`;
        }).join("") : '<tr><td colspan="4">No Global Courses have been set up.</td></tr>'}</tbody>
      </table></div>
    </section>`;
  }

  function courseSetup(run, subject, state, locked) {
    const runName = run?.runname || "";
    const startDate = run?.startdate || "";
    const endDate = run?.enddate || "";
    const active = run?.active !== false;
    const hasPublication = Boolean(state?.currentpublicationid);
    return `<section class="global-curriculum-panel global-course-setup-panel" id="global-course-setup-panel">
      <div class="global-course-setup-header-actions">
        <button type="button" data-gcm-course-action="new-course">Set up a new course</button>
        <button type="button" data-gcm-course-action="modify-course" ${run ? "" : "disabled"}>Modify course</button>
      </div>
      ${locked ? `<div class="global-course-locked"><strong>PUBLISHED</strong><button type="button" class="global-curriculum-primary" data-gcm-course-action="revise">Revise timetable</button></div>` : `
      <div class="global-curriculum-form">
        <div class="global-course-summary-edit-row">
          ${field("Global subject", `<select id="gcm-course-subject">${subjectOptions(subject?.subjectid)}</select>`)}
          ${field("Course name", `<input id="gcm-course-name" type="text" maxlength="160" value="${attr(runName)}" />`)}
          ${field("Start date", `<input id="gcm-course-start" type="date" value="${attr(startDate)}" />`)}
          ${field("End date", `<input id="gcm-course-end" type="date" value="${attr(endDate)}" />`)}
          <label class="global-course-active-field"><span>Active</span><input id="gcm-course-active" type="checkbox" ${active ? "checked" : ""} /></label>
        </div>
        <div class="global-course-weekly-heading"><h4>Weekly schedule</h4><button type="button" data-gcm-course-action="add-schedule-row">Add time period</button></div>
        <div class="global-course-schedule-rows">${model.scheduleRows.map((row, index) => scheduleRow(row, index, subject?.subjectid)).join("")}</div>
        <div class="global-curriculum-form-actions">${saveIconButton(run ? "Save course and add schedule" : "Save course and generate schedule", "save-course", "", "global-curriculum-primary")}</div>
      </div>`}
      ${run && !locked && hasPublication ? '<div class="global-course-revision-state">REVISION</div>' : ""}
    </section>`;
  }

  function scheduleRow(row, index, subjectId) {
    const selectedDays = new Set(array(row.days).map(value => String(value).toUpperCase()));
    return `<div class="global-course-schedule-row" data-schedule-row-key="${attr(row.key)}">
      ${field("Days", `<div class="global-course-day-pills">${dayPills(selectedDays, row.key)}</div>`)}
      ${field("Start", `<input data-course-schedule-field="start" data-time24 type="text" inputmode="numeric" autocomplete="off" value="${attr(formatUiTime(row.start))}" placeholder="04h00" />`)}
      ${field("End", `<input data-course-schedule-field="end" data-time24 type="text" inputmode="numeric" autocomplete="off" value="${attr(formatUiTime(row.end))}" placeholder="05h00" />`)}
      ${field("Module", `<select data-course-schedule-field="moduleid"><option value="">No module</option>${moduleOptions(subjectId, row.moduleid)}</select>`)}
      ${field("Teacher", `<select data-course-schedule-field="teacherid">${teacherOptions(row.teacherid)}</select>`)}
      ${field("Zoom link", `<input data-course-schedule-field="zoom" type="url" value="${attr(row.zoom)}" inputmode="url" placeholder="https://…" />`)}
      <button type="button" class="global-course-remove-row" data-gcm-course-action="remove-schedule-row" data-row-key="${attr(row.key)}" ${model.scheduleRows.length === 1 && index === 0 ? "disabled" : ""} aria-label="Remove time period" title="Remove time period">×</button>
    </div>`;
  }

  function sessionSection(run, sessions, rescheduling, state) {
    const lifecycleMap = new Map(model.timetable.lifecycles.map(item => [item.sessionid, item]));
    const stage = state?.stage || "DEVELOPMENT";
    return `<section class="global-curriculum-panel global-course-sessions-panel">
      <div class="global-curriculum-panel-heading"><h3>Sessions</h3><span>${sessions.filter(item => item.active).length}</span></div>
      <div class="global-session-inline-scroll">
        <div class="global-session-inline-table" role="table" aria-label="Global Course sessions">
          <div class="global-session-inline-row global-session-inline-header" role="row"><span>Date</span><span>Start</span><span>End</span><span>Module</span><span>Teacher</span><span>Zoom link</span><span>Status</span><span>Actions</span></div>
          ${sessions.length ? sessions.map(session => sessionInlineRow(session, lifecycleMap.get(session.sessionid) || { status: "SCHEDULED" }, stage, rescheduling)).join("") : '<p class="global-curriculum-empty-list">No sessions have been generated.</p>'}
        </div>
      </div>
      ${stage === "DEVELOPMENT" ? `<div class="global-course-publish-row"><button type="button" class="global-curriculum-primary" data-gcm-course-action="publish" ${sessions.some(item => item.active) ? "" : "disabled"}>${state?.currentpublicationid ? "Publish revision" : "Publish course"}</button></div>` : ""}
    </section>`;
  }

  function sessionInlineRow(session, lifecycle, stage, rescheduling) {
    const readOnly = stage === "PUBLISHED" || lifecycle.status === "RESCHEDULED";
    const replacement = Boolean(lifecycle.rescheduledfromsessionid);
    const relation = replacement ? '<span class="global-session-relation">replacement</span>' : "";
    const fields = readOnly
      ? `<span>${html(formatDate(session.sessiondate))}</span><span>${html(formatUiTime(session.starttime))}</span><span>${html(formatUiTime(session.endtime))}</span><span>${html(session.modulename || session.subjectname || "Session")}</span><span>${html(session.teachername || "TBA")}</span><span class="global-session-zoom-display">${session.zoomlink ? html(session.zoomlink) : "—"}</span><span>${html(lifecycle.status)}${relation}</span><span>—</span>`
      : `<input data-inline-session-field="date" type="date" value="${attr(session.sessiondate)}" aria-label="Session date" />
         <input data-inline-session-field="start" data-time24 type="text" inputmode="numeric" value="${attr(formatUiTime(session.starttime))}" aria-label="Start time" />
         <input data-inline-session-field="end" data-time24 type="text" inputmode="numeric" value="${attr(formatUiTime(session.endtime))}" aria-label="End time" />
         <select data-inline-session-field="moduleid" aria-label="Module"><option value="">No module</option>${moduleOptions(session.subjectid, session.moduleid)}</select>
         <select data-inline-session-field="teacherid" aria-label="Teacher">${teacherOptions(session.teacheraccountid)}</select>
         <input data-inline-session-field="zoom" type="url" value="${attr(session.zoomlink)}" aria-label="Zoom link" />
         <select data-inline-session-field="status" aria-label="Session status"><option value="SCHEDULED" ${lifecycle.status === "SCHEDULED" ? "selected" : ""}>SCHEDULED</option><option value="CANCELLED" ${lifecycle.status === "CANCELLED" ? "selected" : ""}>CANCELLED</option></select>
         <span class="global-session-inline-actions">${saveIconButton("Save session", "save-session-inline", `data-session-id="${attr(session.sessionid)}"`)}<button type="button" class="global-session-reschedule-button" data-gcm-course-action="open-reschedule-inline" data-session-id="${attr(session.sessionid)}" aria-label="Reschedule session" title="Reschedule session">↪</button></span>`;
    return `<div class="global-session-inline-row ${lifecycle.status !== "SCHEDULED" ? "is-lifecycle-changed" : ""}" role="row" data-session-row-id="${attr(session.sessionid)}">${fields}</div>${rescheduling?.sessionid === session.sessionid ? rescheduleInlineRow(session) : ""}`;
  }

  function rescheduleInlineRow(session) {
    return `<div class="global-session-reschedule-inline" data-reschedule-row-id="${attr(session.sessionid)}">
      <strong>Reschedule</strong>
      <input data-reschedule-field="date" type="date" aria-label="Replacement date" />
      <input data-reschedule-field="start" data-time24 type="text" inputmode="numeric" value="${attr(formatUiTime(session.starttime))}" aria-label="Replacement start time" />
      <input data-reschedule-field="end" data-time24 type="text" inputmode="numeric" value="${attr(formatUiTime(session.endtime))}" aria-label="Replacement end time" />
      <select data-reschedule-field="moduleid" aria-label="Replacement module"><option value="">No module</option>${moduleOptions(session.subjectid, session.moduleid)}</select>
      <select data-reschedule-field="teacherid" aria-label="Replacement teacher">${teacherOptions(session.teacheraccountid)}</select>
      <input data-reschedule-field="zoom" type="url" value="${attr(session.zoomlink)}" aria-label="Replacement Zoom link" />
      <span class="global-session-inline-actions">${saveIconButton("Save rescheduled session", "save-reschedule-inline", `data-session-id="${attr(session.sessionid)}"`)}<button type="button" data-gcm-course-action="close-reschedule" aria-label="Cancel reschedule" title="Cancel reschedule">×</button></span>
    </div>`;
  }

  async function saveSubjectRow(button) {
    const subjectId = String(button.dataset.subjectId || "");
    const subject = subjectById(subjectId);
    if (!subject) return;
    const name = document.querySelector(`[data-course-subject-name="${cssEscape(subjectId)}"]`)?.value?.trim() || "";
    const access = document.querySelector(`[data-course-subject-access="${cssEscape(subjectId)}"]`)?.value || "SUBSCRIPTION";
    const status = document.querySelector(`[data-course-subject-status="${cssEscape(subjectId)}"]`)?.value || "ACTIVE";
    await withBusy(button, "Saving…", async () => {
      const token = appState()?.token || "";
      const subjectResult = await apiPost("/api/admin/platform/global/subject/save", { subjectId, subjectName: name, active: status === "ACTIVE" }, token);
      if (!subjectResult.success) throw new Error(subjectResult.error || "Unable to save subject");
      if (access !== String(subject.accessmodel || "SUBSCRIPTION")) {
        const policy = await apiPost("/api/admin/platform/global/policy/save", { subjectId, accessModel: access }, token);
        if (!policy.success) throw new Error(policy.error || "Unable to save access");
      }
      invalidateAll();
      await load(true);
      setMessage("Subject saved.", "success");
    });
  }

  async function saveCourse(button) {
    syncScheduleRowsFromDom();
    const subjectId = value("gcm-course-subject") || model.selectedSubjectId;
    const payload = {
      runId: model.selectedRunId,
      subjectId,
      runName: value("gcm-course-name"),
      startDate: value("gcm-course-start"),
      endDate: value("gcm-course-end"),
      active: checked("gcm-course-active")
    };
    await withBusy(button, "Saving…", async () => {
      const token = appState()?.token || "";
      const saved = await apiPost("/api/admin/platform/global/run/save", payload, token);
      if (!saved.success) throw new Error(saved.error || saved.detail || "Unable to save course");
      const runId = saved.run?.runid || model.selectedRunId;
      const scheduleRows = model.scheduleRows.filter(row => array(row.days).length || row.start || row.end);
      for (const row of scheduleRows) {
        const startTime = parseUiTime(row.start);
        const endTime = parseUiTime(row.end);
        if (!array(row.days).length || !startTime || !endTime) throw new Error("Each schedule line requires at least one day plus valid start/end times in 24-hour format, for example 04h00–05h00");
        const generated = await apiPost("/api/admin/platform/global/timetable/generate", {
          runId, moduleId: row.moduleid, weekdays: row.days, startTime, endTime,
          teacherAccountId: row.teacherid, zoomLink: row.zoom
        }, token);
        if (!generated.success) throw new Error(generated.error || generated.detail || "Course saved, but a schedule row could not be generated");
      }
      model.selectedRunId = runId;
      model.selectedSubjectId = subjectId;
      model.scheduleRows = [blankScheduleRow()];
      invalidateAll();
      await load(true);
      setMessage(scheduleRows.length ? "Course and schedule saved." : "Course saved.", "success");
    });
  }

  async function reviseCourse(button) {
    if (!model.selectedRunId) return;
    await withBusy(button, "Opening…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/revise", { runId: model.selectedRunId }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to open revision");
      invalidateAll();
      await load(true);
      setMessage(result.message || "Revision opened.", "success");
    });
  }

  async function saveSessionInline(button) {
    const sessionId = String(button.dataset.sessionId || button.closest("[data-session-row-id]")?.dataset.sessionRowId || "");
    const session = sessionsForRun(model.selectedRunId).find(item => item.sessionid === sessionId);
    const row = button.closest("[data-session-row-id]");
    if (!session || !row) return;
    const startTime = parseUiTime(row.querySelector('[data-inline-session-field="start"]')?.value);
    const endTime = parseUiTime(row.querySelector('[data-inline-session-field="end"]')?.value);
    if (!startTime || !endTime) { setMessage("Use 24-hour times such as 13h00.", "error"); return; }
    await withBusy(button, "…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/session/save", {
        sessionId: session.sessionid,
        sessionDate: String(row.querySelector('[data-inline-session-field="date"]')?.value || session.sessiondate),
        startTime,
        endTime,
        moduleId: String(row.querySelector('[data-inline-session-field="moduleid"]')?.value || ""),
        teacherAccountId: String(row.querySelector('[data-inline-session-field="teacherid"]')?.value || ""),
        zoomLink: String(row.querySelector('[data-inline-session-field="zoom"]')?.value || "").trim(),
        active: true,
        status: String(row.querySelector('[data-inline-session-field="status"]')?.value || "SCHEDULED")
      }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to save session");
      invalidateAll();
      await load(true);
      setMessage(result.message || "Session saved.", "success");
    });
  }

  async function saveRescheduleInline(button) {
    const sessionId = String(button.dataset.sessionId || model.rescheduleSessionId || "");
    const session = sessionsForRun(model.selectedRunId).find(item => item.sessionid === sessionId);
    const row = document.querySelector(`[data-reschedule-row-id="${cssEscape(sessionId)}"]`);
    if (!session || !row) return;
    const startTime = parseUiTime(row.querySelector('[data-reschedule-field="start"]')?.value);
    const endTime = parseUiTime(row.querySelector('[data-reschedule-field="end"]')?.value);
    if (!startTime || !endTime) { setMessage("Use 24-hour times such as 13h00.", "error"); return; }
    await withBusy(button, "…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/session/reschedule", {
        sessionId: session.sessionid,
        sessionDate: String(row.querySelector('[data-reschedule-field="date"]')?.value || ""),
        startTime,
        endTime,
        moduleId: String(row.querySelector('[data-reschedule-field="moduleid"]')?.value || ""),
        teacherAccountId: String(row.querySelector('[data-reschedule-field="teacherid"]')?.value || ""),
        zoomLink: String(row.querySelector('[data-reschedule-field="zoom"]')?.value || "").trim()
      }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to reschedule session");
      model.rescheduleSessionId = "";
      invalidateAll();
      await load(true);
      setMessage(result.message || "Session rescheduled.", "success");
    });
  }

  async function publishCourse(button) {
    if (!model.selectedRunId) return;
    await withBusy(button, "Publishing…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/publish", { runId: model.selectedRunId }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to publish course");
      invalidateAll();
      await load(true);
      setMessage(result.message || "Course published.", "success");
    });
  }

  function selectCourse(runId) {
    syncScheduleRowsFromDom();
    model.selectedRunId = String(runId || "");
    const run = runById(model.selectedRunId);
    if (run) model.selectedSubjectId = run.subjectid;
    model.rescheduleSessionId = "";
    model.scheduleRows = [blankScheduleRow()];
    render();
  }
  function newCourse(subjectId, focus = false) {
    model.selectedRunId = "";
    model.selectedSubjectId = String(subjectId || model.selectedSubjectId || "");
    model.rescheduleSessionId = "";
    model.scheduleRows = [blankScheduleRow()];
    render();
    if (focus) focusCourseSetup();
  }
  async function modifyCourse(button) {
    if (!model.selectedRunId) return;
    const state = stateForRun(model.selectedRunId);
    if (state?.stage === "PUBLISHED") return reviseCourse(button);
    focusCourseSetup();
  }
  function focusCourseSetup() {
    requestAnimationFrame(() => {
      const panel = document.getElementById("global-course-setup-panel");
      panel?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      document.getElementById("gcm-course-name")?.focus?.({ preventScroll: true });
    });
  }
  function addScheduleRow() { syncScheduleRowsFromDom(); model.scheduleRows.push(blankScheduleRow()); render(); }
  function removeScheduleRow(key) { syncScheduleRowsFromDom(); model.scheduleRows = model.scheduleRows.filter(row => row.key !== key); if (!model.scheduleRows.length) model.scheduleRows = [blankScheduleRow()]; render(); }
  function openReschedule(id) { model.rescheduleSessionId = String(id || ""); render(); }

  function syncScheduleRowsFromDom() {
    const rows = [...document.querySelectorAll("[data-schedule-row-key]")];
    if (!rows.length) return;
    model.scheduleRows = rows.map(element => ({
      key: element.dataset.scheduleRowKey,
      days: [...element.querySelectorAll("[data-course-schedule-day]:checked")].map(input => String(input.value || "")),
      start: element.querySelector('[data-course-schedule-field="start"]')?.value || "",
      end: element.querySelector('[data-course-schedule-field="end"]')?.value || "",
      moduleid: element.querySelector('[data-course-schedule-field="moduleid"]')?.value || "",
      teacherid: element.querySelector('[data-course-schedule-field="teacherid"]')?.value || "",
      zoom: element.querySelector('[data-course-schedule-field="zoom"]')?.value || ""
    }));
  }

  function invalidateAll() {
    model.loaded = false;
    if (window.M4LGlobalCurriculum?.invalidate) window.M4LGlobalCurriculum.invalidate();
  }

  function subjectById(id) { return model.delivery.subjects.find(item => item.subjectid === id) || null; }
  function runById(id) { return model.delivery.runs.find(item => item.runid === id) || null; }
  function stateForRun(id) { return model.timetable.states.find(item => item.runid === id) || null; }
  function sessionsForRun(id) { return model.timetable.sessions.filter(item => item.runid === id).sort((a,b) => `${a.sessiondate} ${a.starttime}`.localeCompare(`${b.sessiondate} ${b.starttime}`)); }
  function moduleCount(subjectId) { return model.timetable.modules.filter(item => item.subjectid === subjectId).length; }
  function moduleOptions(subjectId, selectedId) { return model.timetable.modules.filter(item => item.subjectid === subjectId).map(item => `<option value="${attr(item.moduleid)}" ${item.moduleid === selectedId ? "selected" : ""}>${html(item.modulename)}${item.active ? "" : " — inactive"}</option>`).join(""); }
  function teacherOptions(selectedId) { return `<option value="" ${selectedId ? "" : "selected"}>TBA</option>${model.timetable.teachers.filter(item => item.active).map(item => `<option value="${attr(item.accountid)}" ${item.accountid === selectedId ? "selected" : ""}>${html(item.displayname || item.accountid)}</option>`).join("")}`; }
  function subjectOptions(selectedId) { return model.delivery.subjects.map(item => `<option value="${attr(item.subjectid)}" ${item.subjectid === selectedId ? "selected" : ""}>${html(item.subjectname)}</option>`).join(""); }
  function dayPills(selected, rowKey) { return [["MON","Mon"],["TUE","Tue"],["WED","Wed"],["THU","Thu"],["FRI","Fri"],["SAT","Sat"],["SUN","Sun"]].map(([value,label]) => `<label class="global-course-day-pill"><input type="checkbox" data-course-schedule-day value="${value}" ${selected.has(value) ? "checked" : ""} aria-label="${label}" /><span>${label}</span></label>`).join(""); }
  function field(label, control) { return `<label class="global-curriculum-field"><span>${html(label)}</span>${control}</label>`; }
  function formatDate(value) { const text=String(value||""); const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text); if(!m) return text; return `${m[3]} ${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m[2])]} ${m[1]}`; }
  function parseUiTime(value) {
    const text = String(value || "").trim().toLowerCase().replace(/\s+/g, "");
    const match = /^(\d{1,2})(?:h|:)?(\d{2})$/.exec(text);
    if (!match) return "";
    const hour = Number(match[1]); const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
    return `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
  }
  function formatUiTime(value) {
    const parsed = parseUiTime(value);
    return parsed ? parsed.replace(":", "h") : String(value || "");
  }
  function normalizeTimeField(input) { const parsed=parseUiTime(input?.value); if(parsed) input.value=formatUiTime(parsed); }
  function saveIconButton(label, action, extraAttrs = "", classes = "") {
    return `<button type="button" class="global-save-icon-button ${attr(classes)}" data-gcm-course-action="${attr(action)}" ${extraAttrs} aria-label="${attr(label)}" title="${attr(label)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 3h12l2 2v16H5V3Zm2 2v5h8V5H7Zm0 14h10v-7H7v7Zm2-12h4V5H9v2Z" fill="currentColor"/></svg></button>`;
  }

  function markTabActive() {
    document.querySelectorAll("#global-curriculum-screen .global-curriculum-tabs button").forEach(button => button.classList.remove("is-active"));
    document.querySelector('#global-curriculum-screen [data-gcm-course-action="show"]')?.classList.add("is-active");
  }
  function setMessage(message, type) { const el=document.getElementById("global-curriculum-message"); if(!el)return; el.textContent=message||""; el.classList.toggle("is-error",type==="error"); el.classList.toggle("is-success",type==="success"); }
  function setContent(markup) { const el=document.getElementById("global-curriculum-content"); if(el)el.innerHTML=markup; }
  async function withBusy(button, label, work) { const original=button?.innerHTML||""; if(button){button.disabled=true;button.textContent=label;} try{await work();}catch(error){setMessage(error.message||"Course Scheduler request failed.","error");}finally{if(button){button.disabled=false;button.innerHTML=original;}} }
  function value(id){return String(document.getElementById(id)?.value||"").trim();}
  function checked(id){return document.getElementById(id)?.checked===true;}
  function array(value){return Array.isArray(value)?value:[];}
  function appState(){return typeof state!=="undefined"&&state?state:null;}
  function html(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
  function attr(value){return html(value);}
  function cssEscape(value){return typeof CSS!=="undefined"&&CSS.escape?CSS.escape(String(value)):String(value).replace(/[^a-zA-Z0-9_-]/g,"\\$&");}

  bind();
  window.M4LGlobalCourseScheduler = Object.freeze({ show, load, invalidate: invalidateAll });
})();
