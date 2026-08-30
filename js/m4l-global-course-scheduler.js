/* M4L V103.1.0.1 - Global Course Scheduler consumes Subjects/Modules managed in the Subjects tab; ongoing courses and batch session editing retained. */
(function () {
  "use strict";

  const model = {
    active: false,
    loaded: false,
    loading: false,
    selectedSubjectId: "",
    selectedRunId: "",
    scheduleRows: [blankScheduleRow()],
    ongoingWindow: { start: "", end: "" },
    sessionDrafts: new Map(),
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
    const root = event.target?.closest?.("#global-curriculum-screen");
    if (!root) return;

    const reload = event.target?.closest?.('[data-gcm-action="reload"]');
    if (reload) {
      event.preventDefault();
      event.stopImmediatePropagation();
      captureAllSessionDrafts();
      if (!discardSessionDraftsConfirmed()) return;
      void load(true);
      return;
    }

    const leaving = event.target?.closest?.("[data-header-action], [data-gcm-action=\"show-tab\"]");
    if (!leaving) return;
    captureAllSessionDrafts();
    if (!model.sessionDrafts.size) return;
    if (window.confirm("Discard unsaved session changes?")) {
      model.sessionDrafts.clear();
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
    if (action === "select-course") return selectCourse(target.dataset.runId || "");
    if (action === "new-course") return newCourse(target.dataset.subjectId || model.selectedSubjectId, true);
    if (action === "modify-course") return modifyCourse(target);
    if (action === "add-schedule-row") return addScheduleRow();
    if (action === "remove-schedule-row") return removeScheduleRow(target.dataset.rowKey || "");
    if (action === "save-course") return saveCourse(target);
    if (action === "revise") return reviseCourse(target);
    if (action === "save-session-batch") return saveSessionBatch(target);
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
    if (target.id === "gcm-course-ongoing") {
      updateOngoingCourseControls();
      return;
    }
    if (target.matches("[data-time24]")) normalizeTimeField(target);
    if (target.matches("[data-course-schedule-field], [data-course-schedule-day]")) syncScheduleRowsFromDom();
    if (target.matches("[data-inline-session-field]")) captureSessionDraft(target.closest("[data-session-row-id]"));
  }

  function handleInput(event) {
    if (!model.active || !event.target?.closest?.("#global-curriculum-screen")) return;
    if (event.target.matches("[data-course-schedule-field]")) syncScheduleRowsFromDom();
    if (event.target.matches("[data-inline-session-field]")) captureSessionDraft(event.target.closest("[data-session-row-id]"));
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
      if (model.selectedRunId && !model.delivery.runs.some(item => item.runid === model.selectedRunId)) {
        model.selectedRunId = "";
        model.sessionDrafts.clear();
      }
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

    setContent(`
      <div class="global-course-scheduler-shell">
        ${courseTable()}
        ${courseSetup(selectedRun, selectedSubject, state, locked)}
        ${selectedRun ? sessionSection(selectedRun, sessions, state) : ""}
      </div>
    `);
    updateOngoingCourseControls();
  }

  function courseTable() {
    const runs = [...model.delivery.runs].sort((a, b) => {
      if (Boolean(a.ongoing) !== Boolean(b.ongoing)) return a.ongoing ? -1 : 1;
      return String(b.startdate || "").localeCompare(String(a.startdate || ""));
    });
    return `<section class="global-curriculum-panel global-course-list-panel">
      <div class="global-curriculum-panel-heading"><h3>Global Courses</h3></div>
      <div class="global-table-scroll"><table class="global-course-table global-course-runs-table">
        <thead><tr><th>Course</th><th>Scheduled dates</th><th>Sessions</th><th>Status</th></tr></thead>
        <tbody>${runs.length ? runs.map(run => {
          const state = stateForRun(run.runid);
          const count = sessionsForRun(run.runid).filter(item => item.active).length;
          const status = run.active === false ? "INACTIVE" : (state?.stage || "DEVELOPMENT");
          return `<tr class="global-course-row ${run.runid === model.selectedRunId ? "is-selected" : ""}" data-gcm-course-action="select-course" data-run-id="${attr(run.runid)}">
            <td data-label="Course"><strong>${html(run.runname)}</strong></td><td data-label="Scheduled dates">${run.ongoing ? "Ongoing" : `${html(formatDate(run.startdate))} – ${html(formatDate(run.enddate))}`}</td><td data-label="Sessions">${count}</td><td data-label="Status">${html(status)}</td>
          </tr>`;
        }).join("") : '<tr><td colspan="4">No Global Courses have been set up.</td></tr>'}</tbody>
      </table></div>
    </section>`;
  }

  function courseSetup(run, subject, state, locked) {
    const runName = run?.runname || "";
    const startDate = run?.startdate || "";
    const endDate = run?.enddate || "";
    const ongoing = run ? Boolean(run.ongoing || (!startDate && !endDate)) : false;
    const active = run?.active !== false;
    const hasPublication = Boolean(state?.currentpublicationid);
    return `<section class="global-curriculum-panel global-course-setup-panel" id="global-course-setup-panel">
      <div class="global-course-setup-header-actions">
        <button type="button" class="global-course-compact-action" data-gcm-course-action="new-course">Set up a new course</button>
        <button type="button" class="global-course-compact-action" data-gcm-course-action="modify-course" ${run ? "" : "disabled"}>Modify course</button>
      </div>
      ${locked ? `<div class="global-course-locked"><strong>PUBLISHED</strong><button type="button" class="global-curriculum-primary global-course-compact-action" data-gcm-course-action="revise">Revise timetable</button></div>` : `
      <div class="global-curriculum-form">
        <div class="global-course-summary-edit-row">
          ${field("Global subject", `<select id="gcm-course-subject">${subjectOptions(subject?.subjectid)}</select>`)}
          ${field("Course name", `<input id="gcm-course-name" type="text" maxlength="160" value="${attr(runName)}" />`)}
          ${field("Start date", `<input id="gcm-course-start" type="date" value="${attr(startDate)}" />`)}
          ${field("End date", `<input id="gcm-course-end" type="date" value="${attr(endDate)}" />`)}
          <label class="global-course-active-field global-course-ongoing-field"><span>Ongoing</span><input id="gcm-course-ongoing" type="checkbox" ${ongoing ? "checked" : ""} /></label>
          <label class="global-course-active-field"><span>Active</span><input id="gcm-course-active" type="checkbox" ${active ? "checked" : ""} /></label>
        </div>
        <div class="global-course-ongoing-window ${ongoing ? "" : "hidden"}" data-ongoing-generation-window>
          ${field("Generate sessions from", `<input id="gcm-course-generate-start" type="date" value="${attr(model.ongoingWindow.start)}" />`)}
          ${field("Generate through", `<input id="gcm-course-generate-end" type="date" value="${attr(model.ongoingWindow.end)}" />`)}
          <p class="global-course-ongoing-help">These dates only set the batch of exact sessions to generate. They do not become course start/end dates.</p>
        </div>
        <div class="global-course-weekly-heading"><h4>Weekly schedule</h4><button type="button" class="global-course-compact-action" data-gcm-course-action="add-schedule-row">Add time period</button></div>
        <div class="global-course-schedule-rows">${model.scheduleRows.map((row, index) => scheduleRow(row, index, subject?.subjectid)).join("")}</div>
        <div class="global-curriculum-form-actions">${saveIconButton(run ? "Save course and add schedule" : "Save course and generate schedule", "save-course")}</div>
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
      <button type="button" class="global-course-remove-row" data-gcm-course-action="remove-schedule-row" data-row-key="${attr(row.key)}" ${model.scheduleRows.length === 1 && index === 0 ? "disabled" : ""} aria-label="Remove unsaved time period" title="Remove unsaved time period">×</button>
    </div>`;
  }

  function sessionSection(run, sessions, state) {
    const lifecycleMap = new Map(model.timetable.lifecycles.map(item => [item.sessionid, item]));
    const stage = state?.stage || "DEVELOPMENT";
    const canEdit = stage === "DEVELOPMENT";
    const pending = model.sessionDrafts.size;
    return `<section class="global-curriculum-panel global-course-sessions-panel">
      <div class="global-curriculum-panel-heading global-course-session-heading">
        <div class="global-course-session-title"><h3>Sessions</h3><span>${sessions.filter(item => item.active).length}</span>${pending ? `<span class="global-session-unsaved-count">${pending} unsaved</span>` : ""}</div>
        ${canEdit ? saveIconButton("Save all session changes", "save-session-batch", pending ? "" : "disabled", "global-session-section-save") : ""}
      </div>
      <div class="global-session-inline-scroll">
        <div class="global-session-inline-table" role="table" aria-label="Global Course sessions">
          <div class="global-session-inline-row global-session-inline-header" role="row"><span>Date</span><span>Start</span><span>End</span><span>Module</span><span>Teacher</span><span>Zoom link</span><span>Status</span></div>
          ${sessions.length ? sessions.map(session => sessionInlineRow(session, lifecycleMap.get(session.sessionid) || { status: "SCHEDULED" }, stage)).join("") : '<p class="global-curriculum-empty-list">No sessions have been generated.</p>'}
        </div>
      </div>
      ${canEdit ? `<div class="global-course-publish-row"><button type="button" class="global-curriculum-primary global-course-compact-action" data-gcm-course-action="publish" ${sessions.some(item => item.active) ? "" : "disabled"}>${state?.currentpublicationid ? "Publish revision" : "Publish course"}</button></div>` : ""}
    </section>`;
  }

  function sessionInlineRow(session, lifecycle, stage) {
    const readOnly = stage === "PUBLISHED" || lifecycle.status === "RESCHEDULED";
    const replacement = Boolean(lifecycle.rescheduledfromsessionid);
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
    const rowClasses = [
      "global-session-inline-row",
      lifecycle.status !== "SCHEDULED" ? "is-lifecycle-changed" : "",
      values.status === "CANCELLED" ? "is-cancelled" : "",
      draft ? "is-dirty" : ""
    ].filter(Boolean).join(" ");

    const fields = readOnly
      ? [
          readOnlySessionCell("Date", formatDate(session.sessiondate)),
          readOnlySessionCell("Start", formatUiTime(session.starttime)),
          readOnlySessionCell("End", formatUiTime(session.endtime)),
          readOnlySessionCell("Module", session.modulename || session.subjectname || "Session"),
          readOnlySessionCell("Teacher", session.teachername || "TBA"),
          readOnlySessionCell("Zoom link", session.zoomlink || "—", "global-session-zoom-display"),
          readOnlySessionCell("Status", `${lifecycle.status}${replacement ? " · replacement" : ""}`)
        ].join("")
      : [
          sessionCell("Date", `<input data-inline-session-field="date" type="date" value="${attr(values.date)}" aria-label="Session date" />`),
          sessionCell("Start", `<input data-inline-session-field="start" data-time24 type="text" inputmode="numeric" value="${attr(values.start)}" aria-label="Start time" />`),
          sessionCell("End", `<input data-inline-session-field="end" data-time24 type="text" inputmode="numeric" value="${attr(values.end)}" aria-label="End time" />`),
          sessionCell("Module", `<select data-inline-session-field="moduleid" aria-label="Module"><option value="">No module</option>${moduleOptions(session.subjectid, values.moduleid)}</select>`),
          sessionCell("Teacher", `<select data-inline-session-field="teacherid" aria-label="Teacher">${teacherOptions(values.teacherid)}</select>`),
          sessionCell("Zoom link", `<input data-inline-session-field="zoom" type="url" value="${attr(values.zoom)}" aria-label="Zoom link" />`, "global-session-zoom-cell"),
          sessionCell("Status", `<select data-inline-session-field="status" aria-label="Session status"><option value="SCHEDULED" ${values.status === "SCHEDULED" ? "selected" : ""}>SCHEDULED</option><option value="CANCELLED" ${values.status === "CANCELLED" ? "selected" : ""}>CANCELLED</option></select>`)
        ].join("");
    return `<div class="${rowClasses}" role="row" data-session-row-id="${attr(session.sessionid)}">${fields}</div>`;
  }

  function sessionCell(label, control, extraClass = "") {
    return `<label class="global-session-cell ${attr(extraClass)}"><span class="global-session-cell-label">${html(label)}</span>${control}</label>`;
  }
  function readOnlySessionCell(label, value, extraClass = "") {
    return `<div class="global-session-cell global-session-readonly-cell ${attr(extraClass)}"><span class="global-session-cell-label">${html(label)}</span><span>${html(value)}</span></div>`;
  }

  function captureSessionDraft(row) {
    if (!row) return;
    const sessionId = String(row.dataset.sessionRowId || "");
    const session = sessionsForRun(model.selectedRunId).find(item => item.sessionid === sessionId);
    if (!session) return;
    const lifecycle = model.timetable.lifecycles.find(item => item.sessionid === sessionId) || { status: "SCHEDULED" };
    if ((stateForRun(model.selectedRunId)?.stage || "DEVELOPMENT") !== "DEVELOPMENT" || lifecycle.status === "RESCHEDULED") return;

    const current = {
      date: String(row.querySelector('[data-inline-session-field="date"]')?.value || ""),
      start: String(row.querySelector('[data-inline-session-field="start"]')?.value || ""),
      end: String(row.querySelector('[data-inline-session-field="end"]')?.value || ""),
      moduleid: String(row.querySelector('[data-inline-session-field="moduleid"]')?.value || ""),
      teacherid: String(row.querySelector('[data-inline-session-field="teacherid"]')?.value || ""),
      zoom: String(row.querySelector('[data-inline-session-field="zoom"]')?.value || "").trim(),
      status: String(row.querySelector('[data-inline-session-field="status"]')?.value || "SCHEDULED")
    };
    const startCompared = parseUiTime(current.start) || current.start.trim();
    const endCompared = parseUiTime(current.end) || current.end.trim();
    const changed = current.date !== String(session.sessiondate || "")
      || startCompared !== (parseUiTime(session.starttime) || String(session.starttime || "").trim())
      || endCompared !== (parseUiTime(session.endtime) || String(session.endtime || "").trim())
      || current.moduleid !== String(session.moduleid || "")
      || current.teacherid !== String(session.teacheraccountid || "")
      || current.zoom !== String(session.zoomlink || "").trim()
      || current.status !== String(lifecycle.status || "SCHEDULED");

    if (changed) model.sessionDrafts.set(sessionId, current);
    else model.sessionDrafts.delete(sessionId);
    row.classList.toggle("is-dirty", changed);
    row.classList.toggle("is-cancelled", current.status === "CANCELLED");
    refreshSessionSaveState();
  }

  function captureAllSessionDrafts() {
    document.querySelectorAll("#global-curriculum-screen [data-session-row-id]").forEach(captureSessionDraft);
  }

  function refreshSessionSaveState() {
    const button = document.querySelector('#global-curriculum-screen [data-gcm-course-action="save-session-batch"]');
    if (button) button.disabled = model.sessionDrafts.size === 0;
    const badge = document.querySelector("#global-curriculum-screen .global-session-unsaved-count");
    if (badge) {
      if (model.sessionDrafts.size) badge.textContent = `${model.sessionDrafts.size} unsaved`;
      else badge.remove();
    } else if (model.sessionDrafts.size) {
      const title = document.querySelector("#global-curriculum-screen .global-course-session-title");
      title?.insertAdjacentHTML("beforeend", `<span class="global-session-unsaved-count">${model.sessionDrafts.size} unsaved</span>`);
    }
  }

  function discardSessionDraftsConfirmed() {
    if (!model.sessionDrafts.size) return true;
    if (!window.confirm("Discard unsaved session changes?")) return false;
    model.sessionDrafts.clear();
    return true;
  }

  async function saveCourse(button) {
    syncScheduleRowsFromDom();
    const subjectId = value("gcm-course-subject") || model.selectedSubjectId;
    const ongoing = checked("gcm-course-ongoing");
    syncOngoingWindowFromDom();
    const payload = {
      runId: model.selectedRunId,
      subjectId,
      runName: value("gcm-course-name"),
      startDate: ongoing ? "" : value("gcm-course-start"),
      endDate: ongoing ? "" : value("gcm-course-end"),
      ongoing,
      active: checked("gcm-course-active")
    };
    const scheduleRows = model.scheduleRows.filter(row => array(row.days).length || row.start || row.end);
    if (ongoing && scheduleRows.length && (
      !/^\d{4}-\d{2}-\d{2}$/.test(model.ongoingWindow.start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(model.ongoingWindow.end) ||
      model.ongoingWindow.end < model.ongoingWindow.start
    )) {
      setMessage("Ongoing courses need valid Generate sessions from / Generate through dates before a weekly schedule can be generated.", "error");
      return;
    }
    await withBusy(button, "…", async () => {
      const token = appState()?.token || "";
      const saved = await apiPost("/api/admin/platform/global/run/save", payload, token);
      if (!saved.success) throw new Error(saved.error || saved.detail || "Unable to save course");
      const runId = saved.run?.runid || model.selectedRunId;
      const calendarWarnings = [];
      for (const row of scheduleRows) {
        const startTime = parseUiTime(row.start);
        const endTime = parseUiTime(row.end);
        if (!array(row.days).length || !startTime || !endTime) throw new Error("Each schedule line requires at least one day plus valid start/end times in 24-hour format, for example 04h00–05h00");
        const generated = await apiPost("/api/admin/platform/global/timetable/generate", {
          runId, moduleId: row.moduleid, weekdays: row.days, startTime, endTime,
          teacherAccountId: row.teacherid, zoomLink: row.zoom,
          ...(ongoing ? {
            generationStartDate: model.ongoingWindow.start,
            generationEndDate: model.ongoingWindow.end
          } : {})
        }, token);
        if (!generated.success) throw new Error(generated.error || generated.detail || "Course saved, but a schedule row could not be generated");
        calendarWarnings.push(...array(generated.calendarWarnings));
      }
      model.selectedRunId = runId;
      model.selectedSubjectId = subjectId;
      model.scheduleRows = [blankScheduleRow()];
      model.ongoingWindow = { start: "", end: "" };
      invalidateAll();
      await load(true);
      if (calendarWarnings.length) {
        const dates = [...new Set(calendarWarnings.map(item => formatDate(item.date)))].join(", ");
        setMessage(`Course saved. ${calendarWarnings.length} scheduled session${calendarWarnings.length === 1 ? "" : "s"} fall on Academy no-teaching date${calendarWarnings.length === 1 ? "" : "s"}: ${dates}. Review the dates or set the relevant sessions to CANCELLED.`, "error");
      } else {
        setMessage(scheduleRows.length ? "Course and schedule saved." : "Course saved.", "success");
      }
    });
  }

  async function reviseCourse(button) {
    if (!model.selectedRunId) return;
    if (model.sessionDrafts.size) {
      setMessage("Save or discard the pending session changes before opening a revision.", "error");
      return;
    }
    await withBusy(button, "Opening…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/revise", { runId: model.selectedRunId }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to open revision");
      invalidateAll();
      await load(true);
      setMessage(result.message || "Revision opened.", "success");
    });
  }

  async function saveSessionBatch(button) {
    captureAllSessionDrafts();
    if (!model.selectedRunId || !model.sessionDrafts.size) return;
    const sessions = sessionsForRun(model.selectedRunId);
    const changes = [];
    for (const [sessionId, draft] of model.sessionDrafts) {
      const session = sessions.find(item => item.sessionid === sessionId);
      if (!session) continue;
      const startTime = parseUiTime(draft.start);
      const endTime = parseUiTime(draft.end);
      if (!draft.date) { setMessage("Every changed session requires a date.", "error"); return; }
      if (!startTime || !endTime) { setMessage("Use 24-hour times such as 13h00 for every changed session.", "error"); return; }
      changes.push({
        sessionId,
        sessionDate: draft.date,
        startTime,
        endTime,
        moduleId: draft.moduleid,
        teacherAccountId: draft.teacherid,
        zoomLink: draft.zoom,
        active: session.active !== false,
        status: draft.status
      });
    }
    if (!changes.length) return;

    await withBusy(button, "…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/session/batch-save", {
        runId: model.selectedRunId,
        changes
      }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to save session changes");
      model.sessionDrafts.clear();
      invalidateAll();
      await load(true);
      if (array(result.calendarWarnings).length) {
        const dates = [...new Set(result.calendarWarnings.map(item => formatDate(item.date)))].join(", ");
        setMessage(`${result.message || "Session changes saved."} Review Academy no-teaching date${result.calendarWarnings.length === 1 ? "" : "s"}: ${dates}. Change the date or set the session to CANCELLED if required.`, "error");
      } else {
        setMessage(result.message || "Session changes saved.", "success");
      }
    });
  }

  async function publishCourse(button) {
    if (!model.selectedRunId) return;
    captureAllSessionDrafts();
    if (model.sessionDrafts.size) {
      setMessage("Save the pending session changes before publishing.", "error");
      return;
    }
    await withBusy(button, "Publishing…", async () => {
      const result = await apiPost("/api/admin/platform/global/timetable/publish", { runId: model.selectedRunId }, appState()?.token || "");
      if (!result.success) throw new Error(result.error || result.detail || "Unable to publish course");
      invalidateAll();
      await load(true);
      setMessage(result.message || "Course published.", "success");
    });
  }

  function selectCourse(runId) {
    captureAllSessionDrafts();
    if (!discardSessionDraftsConfirmed()) return;
    syncScheduleRowsFromDom();
    model.selectedRunId = String(runId || "");
    const run = runById(model.selectedRunId);
    if (run) model.selectedSubjectId = run.subjectid;
    model.scheduleRows = [blankScheduleRow()];
    model.ongoingWindow = { start: "", end: "" };
    render();
  }
  function newCourse(subjectId, focus = false) {
    captureAllSessionDrafts();
    if (!discardSessionDraftsConfirmed()) return;
    model.selectedRunId = "";
    model.selectedSubjectId = String(subjectId || model.selectedSubjectId || "");
    model.scheduleRows = [blankScheduleRow()];
    model.ongoingWindow = { start: "", end: "" };
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

  function syncScheduleRowsFromDom() {
    syncOngoingWindowFromDom();
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

  function syncOngoingWindowFromDom() {
    const start = document.getElementById("gcm-course-generate-start");
    const end = document.getElementById("gcm-course-generate-end");
    if (start || end) {
      model.ongoingWindow = {
        start: String(start?.value || "").trim(),
        end: String(end?.value || "").trim()
      };
    }
  }

  function updateOngoingCourseControls() {
    const ongoing = document.getElementById("gcm-course-ongoing");
    if (!ongoing) return;
    const enabled = ongoing.checked === true;
    const start = document.getElementById("gcm-course-start");
    const end = document.getElementById("gcm-course-end");
    const windowRoot = document.querySelector("[data-ongoing-generation-window]");
    if (enabled) {
      if (start) {
        if (start.value) start.dataset.previousCourseDate = start.value;
        start.value = "";
        start.disabled = true;
      }
      if (end) {
        if (end.value) end.dataset.previousCourseDate = end.value;
        end.value = "";
        end.disabled = true;
      }
    } else {
      if (start) {
        start.disabled = false;
        if (!start.value && start.dataset.previousCourseDate) start.value = start.dataset.previousCourseDate;
      }
      if (end) {
        end.disabled = false;
        if (!end.value && end.dataset.previousCourseDate) end.value = end.dataset.previousCourseDate;
      }
    }
    windowRoot?.classList.toggle("hidden", !enabled);
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
  function dayPills(selected) { return [["MON","Mon"],["TUE","Tue"],["WED","Wed"],["THU","Thu"],["FRI","Fri"],["SAT","Sat"],["SUN","Sun"]].map(([value,label]) => `<label class="global-course-day-pill"><input type="checkbox" data-course-schedule-day value="${value}" ${selected.has(value) ? "checked" : ""} aria-label="${label}" /><span>${label}</span></label>`).join(""); }
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
    return `<button type="button" class="global-save-icon-button ${attr(classes)}" data-gcm-course-action="${attr(action)}" ${extraAttrs} aria-label="${attr(label)}" title="${attr(label)}"><span class="app-icon app-icon-small save-mode-icon" aria-hidden="true"></span><span class="global-save-icon-label">SAVE</span></button>`;
  }

  function markTabActive() {
    document.querySelectorAll("#global-curriculum-screen .global-curriculum-tabs button").forEach(button => button.classList.remove("is-active"));
    document.querySelector('#global-curriculum-screen [data-gcm-course-action="show"]')?.classList.add("is-active");
  }
  function setMessage(message, type) { const el=document.getElementById("global-curriculum-message"); if(!el)return; el.textContent=message||""; el.classList.toggle("is-error",type==="error"); el.classList.toggle("is-success",type==="success"); }
  function setContent(markup) { const el=document.getElementById("global-curriculum-content"); if(el)el.innerHTML=markup; }
  async function withBusy(button, label, work) { const original=button?.innerHTML||""; if(button){button.disabled=true;button.textContent=label;} try{await work();}catch(error){setMessage(error.message||"Course Scheduler request failed.","error");}finally{if(button?.isConnected){button.disabled=false;button.innerHTML=original;}} }
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
