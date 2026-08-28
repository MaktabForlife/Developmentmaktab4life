/* M4L V102.11.1 - Global Course Scheduler: course setup, exact sessions, revision and publication. */
(function () {
  "use strict";

  const model = {
    active: false,
    loaded: false,
    loading: false,
    selectedSubjectId: "",
    selectedRunId: "",
    editingSessionId: "",
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
    return { key: `schedule-${Date.now()}-${Math.random().toString(16).slice(2)}`, day: "", start: "", end: "", moduleid: "", teacherid: "", zoom: "" };
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
    if (action === "new-course") return newCourse(target.dataset.subjectId || model.selectedSubjectId);
    if (action === "add-schedule-row") return addScheduleRow();
    if (action === "remove-schedule-row") return removeScheduleRow(target.dataset.rowKey || "");
    if (action === "save-course") return saveCourse(target);
    if (action === "revise") return reviseCourse(target);
    if (action === "edit-session") return editSession(target.dataset.sessionId || "");
    if (action === "close-session") return editSession("");
    if (action === "save-session") return saveSession(target, editingSessionStatus());
    if (action === "cancel-session") return saveSession(target, "CANCELLED");
    if (action === "restore-session") return saveSession(target, "SCHEDULED");
    if (action === "open-reschedule") return openReschedule(target.dataset.sessionId || "");
    if (action === "close-reschedule") return openReschedule("");
    if (action === "save-reschedule") return saveReschedule(target);
    if (action === "publish") return publishCourse(target);
  }

  function handleChange(event) {
    if (!model.active || !event.target?.closest?.("#global-curriculum-screen")) return;
    const target = event.target;
    if (target.id === "gcm-course-subject") {
      model.selectedSubjectId = String(target.value || "");
      syncScheduleRowsFromDom();
      render();
    }
    if (target.matches("[data-course-schedule-field]")) syncScheduleRowsFromDom();
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
    const editing = sessions.find(item => item.sessionid === model.editingSessionId) || null;
    const rescheduling = sessions.find(item => item.sessionid === model.rescheduleSessionId) || null;

    setContent(`
      <div class="global-course-scheduler-shell">
        ${subjectTable()}
        ${courseTable()}
        ${courseSetup(selectedRun, selectedSubject, state, locked)}
        ${selectedRun ? sessionSection(selectedRun, sessions, editing, rescheduling, state) : ""}
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
            <td><button type="button" data-gcm-course-action="save-subject-row" data-subject-id="${attr(subject.subjectid)}">Save</button></td>
          </tr>`).join("")}</tbody>
      </table></div>
    </section>`;
  }

  function courseTable() {
    const runs = [...model.delivery.runs].sort((a, b) => String(b.startdate || "").localeCompare(String(a.startdate || "")));
    return `<section class="global-curriculum-panel global-course-list-panel">
      <div class="global-curriculum-panel-heading"><h3>Global Courses</h3><button type="button" data-gcm-course-action="new-course" data-subject-id="${attr(model.selectedSubjectId)}">Set up a course</button></div>
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
    return `<section class="global-curriculum-panel global-course-setup-panel">
      <div class="global-curriculum-panel-heading"><h3>Set up / modify a course</h3>${run ? '<button type="button" data-gcm-course-action="new-course">New course</button>' : ""}</div>
      ${locked ? `<div class="global-course-locked"><strong>PUBLISHED</strong><button type="button" class="global-curriculum-primary" data-gcm-course-action="revise">Revise timetable</button></div>` : `
      <div class="global-curriculum-form">
        ${field("Global subject", `<select id="gcm-course-subject">${subjectOptions(subject?.subjectid)}</select>`)}
        ${field("Course name", `<input id="gcm-course-name" type="text" maxlength="160" value="${attr(runName)}" />`)}
        <div class="global-timetable-two-col">${field("Start date", `<input id="gcm-course-start" type="date" value="${attr(startDate)}" />`)}${field("End date", `<input id="gcm-course-end" type="date" value="${attr(endDate)}" />`)}</div>
        <label class="global-curriculum-check"><input id="gcm-course-active" type="checkbox" ${active ? "checked" : ""} /><span>Active course</span></label>
        <div class="global-course-weekly-heading"><h4>Weekly schedule</h4><button type="button" data-gcm-course-action="add-schedule-row">Add day / time</button></div>
        <div class="global-course-schedule-rows">${model.scheduleRows.map((row, index) => scheduleRow(row, index, subject?.subjectid)).join("")}</div>
        <div class="global-curriculum-form-actions"><button type="button" class="global-curriculum-primary" data-gcm-course-action="save-course">${run ? "Save course / add schedule" : "Save course & generate schedule"}</button></div>
      </div>`}
      ${run && !locked && hasPublication ? '<div class="global-course-revision-state">REVISION</div>' : ""}
    </section>`;
  }

  function scheduleRow(row, index, subjectId) {
    return `<div class="global-course-schedule-row" data-schedule-row-key="${attr(row.key)}">
      ${field("Day", `<select data-course-schedule-field="day"><option value="">Select day</option>${dayOptions(row.day)}</select>`)}
      ${field("Start", `<input data-course-schedule-field="start" type="time" value="${attr(row.start)}" />`)}
      ${field("End", `<input data-course-schedule-field="end" type="time" value="${attr(row.end)}" />`)}
      ${field("Module", `<select data-course-schedule-field="moduleid"><option value="">No module</option>${moduleOptions(subjectId, row.moduleid)}</select>`)}
      ${field("Teacher", `<select data-course-schedule-field="teacherid">${teacherOptions(row.teacherid)}</select>`)}
      ${field("Zoom link", `<input data-course-schedule-field="zoom" type="url" value="${attr(row.zoom)}" inputmode="url" placeholder="https://…" />`)}
      <button type="button" class="global-course-remove-row" data-gcm-course-action="remove-schedule-row" data-row-key="${attr(row.key)}" ${model.scheduleRows.length === 1 && index === 0 ? "disabled" : ""} aria-label="Remove day/time">×</button>
    </div>`;
  }

  function sessionSection(run, sessions, editing, rescheduling, state) {
    const lifecycleMap = new Map(model.timetable.lifecycles.map(item => [item.sessionid, item]));
    const stage = state?.stage || "DEVELOPMENT";
    return `<section class="global-curriculum-panel global-course-sessions-panel">
      <div class="global-curriculum-panel-heading"><h3>Sessions</h3><span>${sessions.filter(item => item.active).length}</span></div>
      <div class="global-timetable-session-list">${sessions.length ? sessions.map(session => {
        const lifecycle = lifecycleMap.get(session.sessionid) || { status: "SCHEDULED" };
        const relation = lifecycle.rescheduledfromsessionid ? " · replacement" : "";
        return `<button type="button" class="global-timetable-session ${lifecycle.status !== "SCHEDULED" ? "is-lifecycle-changed" : ""}" data-gcm-course-action="edit-session" data-session-id="${attr(session.sessionid)}">
          <span class="global-timetable-session-date">${html(formatDate(session.sessiondate))}</span><span>${html(session.starttime)}–${html(session.endtime)}</span><strong>${html(session.modulename || session.subjectname || "Session")}</strong><span>${html(session.teachername || "TBA")}</span><small>${html(lifecycle.status)}${html(relation)}</small>
        </button>`;
      }).join("") : '<p>No sessions have been generated.</p>'}</div>
      ${editing ? editSessionPanel(editing, lifecycleMap.get(editing.sessionid) || { status: "SCHEDULED" }, stage) : ""}
      ${rescheduling ? reschedulePanel(rescheduling) : ""}
      ${stage === "DEVELOPMENT" ? `<div class="global-course-publish-row"><button type="button" class="global-curriculum-primary" data-gcm-course-action="publish" ${sessions.some(item => item.active) ? "" : "disabled"}>${state?.currentpublicationid ? "Publish revision" : "Publish course"}</button></div>` : ""}
    </section>`;
  }

  function editSessionPanel(session, lifecycle, stage) {
    const readOnly = stage === "PUBLISHED";
    const rescheduled = lifecycle.status === "RESCHEDULED";
    return `<div class="global-course-session-editor">
      <div class="global-curriculum-panel-heading"><h3>Edit session</h3><button type="button" data-gcm-course-action="close-session">Close</button></div>
      <input id="gcm-course-session-id" type="hidden" value="${attr(session.sessionid)}" />
      <div class="global-curriculum-form">
        ${field("Date", `<input id="gcm-course-session-date" type="date" value="${attr(session.sessiondate)}" ${readOnly ? "disabled" : ""} />`)}
        <div class="global-timetable-two-col">${field("Start", `<input id="gcm-course-session-start" type="time" value="${attr(session.starttime)}" ${readOnly ? "disabled" : ""} />`)}${field("End", `<input id="gcm-course-session-end" type="time" value="${attr(session.endtime)}" ${readOnly ? "disabled" : ""} />`)}</div>
        ${field("Module", `<select id="gcm-course-session-module" ${readOnly ? "disabled" : ""}><option value="">No module</option>${moduleOptions(session.subjectid, session.moduleid)}</select>`)}
        ${field("Teacher", `<select id="gcm-course-session-teacher" ${readOnly ? "disabled" : ""}>${teacherOptions(session.teacheraccountid)}</select>`)}
        ${field("Zoom link", `<input id="gcm-course-session-zoom" type="url" value="${attr(session.zoomlink)}" ${readOnly ? "disabled" : ""} />`)}
        <div class="global-curriculum-form-actions">
          ${readOnly ? "" : `<button type="button" class="global-curriculum-primary" data-gcm-course-action="save-session" ${rescheduled ? "disabled" : ""}>Save session</button>
          ${lifecycle.status === "CANCELLED" ? '<button type="button" data-gcm-course-action="restore-session">Restore</button>' : '<button type="button" data-gcm-course-action="cancel-session">Cancel session</button>'}
          ${rescheduled ? "" : `<button type="button" data-gcm-course-action="open-reschedule" data-session-id="${attr(session.sessionid)}">Reschedule</button>`}`}
        </div>
      </div>
    </div>`;
  }

  function editingSessionStatus() {
    const lifecycle = model.timetable.lifecycles.find(item => item.sessionid === model.editingSessionId);
    return lifecycle?.status === "CANCELLED" ? "CANCELLED" : "SCHEDULED";
  }

  function reschedulePanel(session) {
    return `<div class="global-course-session-editor global-course-reschedule-editor">
      <div class="global-curriculum-panel-heading"><h3>Reschedule session</h3><button type="button" data-gcm-course-action="close-reschedule">Close</button></div>
      <div class="global-curriculum-form">
        ${field("New date", '<input id="gcm-course-reschedule-date" type="date" />')}
        <div class="global-timetable-two-col">${field("Start", `<input id="gcm-course-reschedule-start" type="time" value="${attr(session.starttime)}" />`)}${field("End", `<input id="gcm-course-reschedule-end" type="time" value="${attr(session.endtime)}" />`)}</div>
        ${field("Module", `<select id="gcm-course-reschedule-module"><option value="">No module</option>${moduleOptions(session.subjectid, session.moduleid)}</select>`)}
        ${field("Teacher", `<select id="gcm-course-reschedule-teacher">${teacherOptions(session.teacheraccountid)}</select>`)}
        ${field("Zoom link", `<input id="gcm-course-reschedule-zoom" type="url" value="${attr(session.zoomlink)}" />`)}
        <div class="global-curriculum-form-actions"><button type="button" class="global-curriculum-primary" data-gcm-course-action="save-reschedule">Save reschedule</button></div>
      </div>
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
      const scheduleRows = model.scheduleRows.filter(row => row.day && row.start && row.end);
      for (const row of scheduleRows) {
        const generated = await apiPost("/api/admin/platform/global/timetable/generate", {
          runId, moduleId: row.moduleid, weekdays: [row.day], startTime: row.start, endTime: row.end,
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

  async function saveSession(button, status) {
    const session = sessionsForRun(model.selectedRunId).find(item => item.sessionid === model.editingSessionId);
    if (!session) return;
    await withBusy(button, "Saving…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/session/save", {
        sessionId: session.sessionid,
        sessionDate: value("gcm-course-session-date") || session.sessiondate,
        startTime: value("gcm-course-session-start") || session.starttime,
        endTime: value("gcm-course-session-end") || session.endtime,
        moduleId: value("gcm-course-session-module"),
        teacherAccountId: value("gcm-course-session-teacher"),
        zoomLink: value("gcm-course-session-zoom"),
        active: true,
        status
      }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to save session");
      model.editingSessionId = "";
      invalidateAll();
      await load(true);
      setMessage(result.message || "Session saved.", "success");
    });
  }

  async function saveReschedule(button) {
    const session = sessionsForRun(model.selectedRunId).find(item => item.sessionid === model.rescheduleSessionId);
    if (!session) return;
    await withBusy(button, "Saving…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/session/reschedule", {
        sessionId: session.sessionid,
        sessionDate: value("gcm-course-reschedule-date"),
        startTime: value("gcm-course-reschedule-start"),
        endTime: value("gcm-course-reschedule-end"),
        moduleId: value("gcm-course-reschedule-module"),
        teacherAccountId: value("gcm-course-reschedule-teacher"),
        zoomLink: value("gcm-course-reschedule-zoom")
      }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to reschedule session");
      model.rescheduleSessionId = "";
      model.editingSessionId = "";
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
    model.editingSessionId = "";
    model.rescheduleSessionId = "";
    model.scheduleRows = [blankScheduleRow()];
    render();
  }
  function newCourse(subjectId) {
    model.selectedRunId = "";
    model.selectedSubjectId = String(subjectId || model.selectedSubjectId || "");
    model.editingSessionId = "";
    model.rescheduleSessionId = "";
    model.scheduleRows = [blankScheduleRow()];
    render();
  }
  function addScheduleRow() { syncScheduleRowsFromDom(); model.scheduleRows.push(blankScheduleRow()); render(); }
  function removeScheduleRow(key) { syncScheduleRowsFromDom(); model.scheduleRows = model.scheduleRows.filter(row => row.key !== key); if (!model.scheduleRows.length) model.scheduleRows = [blankScheduleRow()]; render(); }
  function editSession(id) { model.editingSessionId = String(id || ""); model.rescheduleSessionId = ""; render(); }
  function openReschedule(id) { model.rescheduleSessionId = String(id || ""); render(); }

  function syncScheduleRowsFromDom() {
    const rows = [...document.querySelectorAll("[data-schedule-row-key]")];
    if (!rows.length) return;
    model.scheduleRows = rows.map(element => ({
      key: element.dataset.scheduleRowKey,
      day: element.querySelector('[data-course-schedule-field="day"]')?.value || "",
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
  function dayOptions(selected) { return [["MON","Monday"],["TUE","Tuesday"],["WED","Wednesday"],["THU","Thursday"],["FRI","Friday"],["SAT","Saturday"],["SUN","Sunday"]].map(([value,label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join(""); }
  function field(label, control) { return `<label class="global-curriculum-field"><span>${html(label)}</span>${control}</label>`; }
  function formatDate(value) { const text=String(value||""); const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text); if(!m) return text; return `${m[3]} ${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m[2])]} ${m[1]}`; }

  function markTabActive() {
    document.querySelectorAll("#global-curriculum-screen .global-curriculum-tabs button").forEach(button => button.classList.remove("is-active"));
    document.querySelector('#global-curriculum-screen [data-gcm-course-action="show"]')?.classList.add("is-active");
  }
  function setMessage(message, type) { const el=document.getElementById("global-curriculum-message"); if(!el)return; el.textContent=message||""; el.classList.toggle("is-error",type==="error"); el.classList.toggle("is-success",type==="success"); }
  function setContent(markup) { const el=document.getElementById("global-curriculum-content"); if(el)el.innerHTML=markup; }
  async function withBusy(button, label, work) { const original=button?.textContent||""; if(button){button.disabled=true;button.textContent=label;} try{await work();}catch(error){setMessage(error.message||"Course Scheduler request failed.","error");}finally{if(button){button.disabled=false;button.textContent=original;}} }
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
