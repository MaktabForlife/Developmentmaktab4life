/* M4L V101.4.3 - staged timetable publication with per-group session assignments. */

const timetableBuilderState = {
  loaded: false,
  loading: false,
  activeTab: "timetable",
  selectedCourseId: "",
  editCourseId: "",
  editTimeSlotId: "",
  editSubjectId: "",
  editModuleId: "",
  editTaskId: "",
  taskFilterSubjectId: "",
  showInactiveSessions: false,
  data: {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    courses: [],
    timeslots: [],
    sessions: [],
    subjects: [],
    modules: [],
    teachers: [],
    groups: ["ALL"],
    tasks: [],
    timetablestates: [],
    publications: [],
    globalzoomlink: ""
  }
};

let timetableBuilderHandlersBound = false;

function getTimetableBuilderRole() {
  return String(typeof state !== "undefined" && state?.user ? state.user.role || "" : "")
    .trim()
    .toUpperCase();
}

async function showTimetableBuilder() {
  if (getTimetableBuilderRole() !== "ADMIN") {
    alert("Timetable Builder is available to ADMIN accounts only.");
    return false;
  }

  bindTimetableBuilderHandlers();
  if (!showScreen("timetable-builder-screen")) return false;
  await loadTimetableBuilder();
  return true;
}

function bindTimetableBuilderHandlers() {
  if (timetableBuilderHandlersBound || !document) return true;
  timetableBuilderHandlersBound = true;
  document.addEventListener("click", handleTimetableBuilderClick);
  document.addEventListener("change", handleTimetableBuilderChange);
  return true;
}

function getTimetableBuilderAction(event) {
  const target = event?.target;
  if (!target || typeof target.closest !== "function") return null;
  const action = target.closest("[data-ttb-action]");
  return action && action.closest("#timetable-builder-screen") ? action : null;
}

async function handleTimetableBuilderClick(event) {
  const target = getTimetableBuilderAction(event);
  if (!target || target.disabled) return;
  const action = target.dataset.ttbAction || "";
  if (!action) return;
  event.preventDefault();

  if (action === "reload") return loadTimetableBuilder(true);
  if (action === "show-tab") return showTimetableBuilderTab(target.dataset.ttbTab);
  if (action === "new-course") return editTimetableBuilderCourse("");
  if (action === "edit-course") return editTimetableBuilderCourse(target.dataset.courseId);
  if (action === "save-course") return saveTimetableBuilderCourse(target);
  if (action === "new-slot") return editTimetableBuilderTimeSlot("", true);
  if (action === "edit-slot") return editTimetableBuilderTimeSlot(target.dataset.timeSlotId, true);
  if (action === "save-slot") return saveTimetableBuilderTimeSlot(target);
  if (action === "new-subject") return editTimetableBuilderSubject("");
  if (action === "edit-subject") return editTimetableBuilderSubject(target.dataset.subjectId);
  if (action === "save-subject") return saveTimetableBuilderSubject(target);
  if (action === "new-module") return editTimetableBuilderModule("");
  if (action === "edit-module") return editTimetableBuilderModule(target.dataset.moduleId);
  if (action === "save-module") return saveTimetableBuilderModule(target);
  if (action === "new-task") return editTimetableBuilderTask("");
  if (action === "edit-task") return editTimetableBuilderTask(target.dataset.taskId);
  if (action === "save-task") return saveTimetableBuilderTask(target);
  if (action === "add-session") return openTimetableSessionEditor("", target.dataset.timeSlotId, target.dataset.day);
  if (action === "edit-session") return openTimetableSessionEditor(target.dataset.sessionId);
  if (action === "close-session") return closeTimetableSessionEditor();
  if (action === "save-session") return saveTimetableBuilderSession(target);
  if (action === "delete-session") return deleteTimetableBuilderSession(target);
  if (action === "restore-session") return restoreTimetableBuilderSession(target);
  if (action === "publish-timetable") return publishTimetableBuilder(target);
  if (action === "toggle-inactive-sessions") {
    timetableBuilderState.showInactiveSessions = !timetableBuilderState.showInactiveSessions;
    return renderTimetableBuilderGrid();
  }
}

function handleTimetableBuilderChange(event) {
  const target = event?.target;
  if (!target || !target.closest("#timetable-builder-screen")) return;

  if (target.closest("#timetable-session-dialog")) {
    clearTimetableSessionMessage();
  }

  if (target.id === "ttb-course-select") {
    timetableBuilderState.selectedCourseId = target.value;
    timetableBuilderState.editCourseId = target.value;
    timetableBuilderState.editTimeSlotId = "";
    renderTimetableBuilder();
    return;
  }

  if (target.id === "ttb-session-subject") {
    renderTimetableSessionModuleOptions(target.value, "");
    return;
  }

  if (target.matches("input[name='ttb-session-group']")) {
    enforceTimetableBuilderGroupSelection(target);
    renderTimetableSessionGroupAssignments();
    return;
  }

  if (target.matches("input[name='ttb-session-day']")) {
    return;
  }

  if (target.id === "ttb-task-subject") {
    renderTaskModuleOptions(target.value, "");
    return;
  }

  if (target.id === "ttb-task-filter-subject") {
    timetableBuilderState.taskFilterSubjectId = target.value;
    renderTimetableBuilderTasks();
  }
}

async function loadTimetableBuilder(force = false) {
  if (timetableBuilderState.loading) return false;
  if (timetableBuilderState.loaded && !force) {
    renderTimetableBuilder();
    return true;
  }

  timetableBuilderState.loading = true;
  setTimetableBuilderMessage("Loading courses, curriculum and sessions…", "");
  setTimetableBuilderContent('<p class="helper-text">Loading Timetable Builder...</p>');

  try {
    const [builder, tasks] = await Promise.all([
      apiPost("/api/admin/timetable-builder/get", {}, state.token),
      apiPost("/api/admin/tasks/list", { subjectid: "ALL" }, state.token)
    ]);

    if (!builder.success) throw new Error(builder.error || "Unable to load Timetable Builder");
    if (!tasks.success) throw new Error(tasks.error || "Unable to load tasks");

    timetableBuilderState.data = {
      ...timetableBuilderState.data,
      ...builder,
      tasks: Array.isArray(tasks.tasks) ? tasks.tasks : []
    };
    timetableBuilderState.loaded = true;
    ensureTimetableBuilderSelections();
    setTimetableBuilderMessage("", "");
    renderTimetableBuilder();
    return true;
  } catch (error) {
    console.error("Could not load Timetable Builder", error);
    setTimetableBuilderMessage(error?.message || "Unable to load Timetable Builder.", "error");
    setTimetableBuilderContent(`
      <div class="timetable-builder-empty">
        <h3>Builder setup required</h3>
        <p>${ttbEscape(error?.message || "Unable to load Timetable Builder.")}</p>
        <button type="button" class="timetable-builder-primary" data-ttb-action="reload">Try Again</button>
      </div>
    `);
    return false;
  } finally {
    timetableBuilderState.loading = false;
  }
}

function ensureTimetableBuilderSelections() {
  const courses = timetableBuilderState.data.courses || [];
  const selectedExists = courses.some(course => course.courseid === timetableBuilderState.selectedCourseId);
  if (!selectedExists) {
    timetableBuilderState.selectedCourseId = courses.find(course => course.active)?.courseid || courses[0]?.courseid || "";
  }
  if (!timetableBuilderState.editCourseId && timetableBuilderState.selectedCourseId) {
    timetableBuilderState.editCourseId = timetableBuilderState.selectedCourseId;
  }

  const subjects = timetableBuilderState.data.subjects || [];
  if (!subjects.some(subject => subject.subjectid === timetableBuilderState.taskFilterSubjectId)) {
    timetableBuilderState.taskFilterSubjectId = subjects.find(subject => subject.active)?.subjectid || subjects[0]?.subjectid || "ALL";
  }
}

function showTimetableBuilderTab(tab) {
  const allowed = new Set(["timetable", "courses", "subjects", "modules", "tasks"]);
  timetableBuilderState.activeTab = allowed.has(tab) ? tab : "timetable";
  renderTimetableBuilder();
}

function renderTimetableBuilder() {
  renderTimetableBuilderStatus();
  document.querySelectorAll("#timetable-builder-screen [data-ttb-action='show-tab']").forEach(button => {
    const active = button.dataset.ttbTab === timetableBuilderState.activeTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  if (timetableBuilderState.activeTab === "courses") return renderTimetableBuilderCourses();
  if (timetableBuilderState.activeTab === "subjects") return renderTimetableBuilderSubjects();
  if (timetableBuilderState.activeTab === "modules") return renderTimetableBuilderModules();
  if (timetableBuilderState.activeTab === "tasks") return renderTimetableBuilderTasks();
  return renderTimetableBuilderGrid();
}

function getSelectedTimetableState() {
  return (timetableBuilderState.data.timetablestates || [])
    .find(item => item.courseid === timetableBuilderState.selectedCourseId) || {
      courseid: timetableBuilderState.selectedCourseId,
      stage: "DEVELOPMENT",
      currentpublicationid: "",
      versionno: 0
    };
}

function renderTimetableBuilderStatus() {
  const selectedState = getSelectedTimetableState();
  const label = document.getElementById("timetable-builder-stage-label");
  const detail = document.getElementById("timetable-builder-stage-detail");
  const publishButton = document.getElementById("timetable-builder-publish");
  const hasCourse = Boolean(timetableBuilderState.selectedCourseId);
  const isPublished = selectedState.stage === "PUBLISHED";

  if (label) label.textContent = isPublished
    ? `Published · version ${selectedState.versionno || 1}`
    : "Development draft";
  if (detail) detail.textContent = isPublished
    ? `Snapshot published${selectedState.publisheddate ? ` on ${formatBuilderDate(selectedState.publisheddate)}` : ""}. The live timetable still reads from TeacherAssign.`
    : selectedState.currentpublicationid
      ? `Draft changes are not in published version ${selectedState.versionno}. The live timetable still reads from TeacherAssign.`
      : "No builder snapshot is published yet. The live timetable still reads from TeacherAssign.";
  if (publishButton) {
    publishButton.hidden = !hasCourse;
    publishButton.textContent = isPublished ? "Publish New Version" : "Publish Timetable";
  }
}

function renderCourseToolbar() {
  const courses = timetableBuilderState.data.courses || [];
  const options = courses.map(course => `
    <option value="${ttbAttr(course.courseid)}" ${course.courseid === timetableBuilderState.selectedCourseId ? "selected" : ""}>
      ${ttbEscape(course.coursename)}${course.active ? "" : " — inactive"}
    </option>
  `).join("");

  return `
    <section class="timetable-builder-course-bar" aria-label="Course selection">
      <label class="timetable-builder-field timetable-builder-course-select">
        <span>Course</span>
        <select id="ttb-course-select" ${courses.length ? "" : "disabled"}>
          ${courses.length ? options : '<option value="">Create the first course</option>'}
        </select>
      </label>
      <button type="button" class="timetable-builder-secondary" data-ttb-action="new-course">New Course</button>
      ${timetableBuilderState.selectedCourseId ? `
        <button type="button" class="timetable-builder-secondary" data-ttb-action="edit-course" data-course-id="${ttbAttr(timetableBuilderState.selectedCourseId)}">Edit Course</button>
      ` : ""}
    </section>
  `;
}

function renderTimetableBuilderGrid() {
  const courseId = timetableBuilderState.selectedCourseId;
  const slots = (timetableBuilderState.data.timeslots || []).filter(slot => slot.courseid === courseId && slot.active);
  const days = timetableBuilderState.data.days || [];
  const sessions = (timetableBuilderState.data.sessions || []).filter(session => (
    session.active || timetableBuilderState.showInactiveSessions
  ));

  if (!courseId) {
    setTimetableBuilderContent(`
      ${renderCourseToolbar()}
      <div class="timetable-builder-empty">
        <h3>Create a course first</h3>
        <p>A course owns its time slots and weekly sessions.</p>
        <button type="button" class="timetable-builder-primary" data-ttb-action="new-course">Create Course</button>
      </div>
    `);
    return;
  }

  const head = days.map(day => `<div class="ttb-grid-heading">${ttbEscape(day)}</div>`).join("");
  const rows = slots.map(slot => {
    const cells = days.map(day => {
      const cellSessions = sessions.filter(session => (
        session.courseid === courseId && session.timeslotid === slot.timeslotid && session.dayofweek === day
      ));
      const cards = cellSessions.map(renderTimetableSessionCard).join("");
      return `
        <div class="ttb-grid-cell" data-day="${ttbAttr(day)}" data-time-slot-id="${ttbAttr(slot.timeslotid)}">
          <div class="ttb-grid-cell-sessions">${cards}</div>
          <button type="button" class="ttb-grid-add" data-ttb-action="add-session" data-time-slot-id="${ttbAttr(slot.timeslotid)}" data-day="${ttbAttr(day)}" aria-label="Add ${ttbAttr(day)} ${ttbAttr(formatBuilderTimeRange(slot))} session">+</button>
        </div>
      `;
    }).join("");

    return `
      <div class="ttb-grid-time">
        <strong>${ttbEscape(formatBuilderTimeRange(slot))}</strong>
        <button type="button" data-ttb-action="edit-slot" data-time-slot-id="${ttbAttr(slot.timeslotid)}">Edit</button>
      </div>
      ${cells}
    `;
  }).join("");

  setTimetableBuilderContent(`
    ${renderCourseToolbar()}
    <section class="timetable-builder-grid-card">
      <div class="timetable-builder-grid-title">
        <div>
          <h3>Weekly sessions</h3>
          <p>Choose a cell to add sessions. One subject/module is repeated across the selected days and groups.</p>
        </div>
        <div class="timetable-builder-grid-title-actions">
          <button type="button" class="timetable-builder-secondary" data-ttb-action="toggle-inactive-sessions">${timetableBuilderState.showInactiveSessions ? "Hide inactive" : "Show inactive"}</button>
          <span>${slots.length} ${slots.length === 1 ? "time slot" : "time slots"}</span>
        </div>
      </div>
      ${slots.length ? `
        <div class="timetable-builder-grid-scroll">
          <div class="timetable-builder-week-grid" style="--ttb-day-count:${days.length}">
            <div class="ttb-grid-heading ttb-grid-heading--time">Time</div>
            ${head}
            ${rows}
          </div>
        </div>
      ` : `
        <div class="timetable-builder-empty timetable-builder-empty--inside">
          <p>Create at least one active time slot for this course.</p>
          <button type="button" class="timetable-builder-primary" data-ttb-action="new-slot">Create Time Slot</button>
        </div>
      `}
    </section>
  `);
}

function renderTimetableSessionCard(session) {
  const meta = [
    `Group ${session.groupno}`,
    session.teachername,
    session.zoomlink ? "Zoom override" : "Global Zoom"
  ].filter(Boolean).join(" · ");
  return `
    <button type="button" class="ttb-session-card ${session.active ? "" : "is-inactive"}" data-ttb-action="edit-session" data-session-id="${ttbAttr(session.sessionid)}">
      <strong>${ttbEscape(session.subjectname || session.subjectid)}</strong>
      ${session.modulename ? `<span>${ttbEscape(session.modulename)}</span>` : ""}
      <small>${ttbEscape(meta)}</small>
    </button>
  `;
}

function renderTimetableBuilderCourses() {
  const course = (timetableBuilderState.data.courses || []).find(item => item.courseid === timetableBuilderState.editCourseId) || null;
  const courseId = timetableBuilderState.selectedCourseId;
  const slot = (timetableBuilderState.data.timeslots || []).find(item => item.timeslotid === timetableBuilderState.editTimeSlotId) || null;
  const slots = (timetableBuilderState.data.timeslots || []).filter(item => item.courseid === courseId);

  setTimetableBuilderContent(`
    ${renderCourseToolbar()}
    <div class="timetable-builder-management-grid">
      <section class="timetable-builder-panel">
        <div class="timetable-builder-panel-heading">
          <h3>${course ? "Modify Course" : "Add Course"}</h3>
          ${course ? '<button type="button" data-ttb-action="new-course">Add another</button>' : ""}
        </div>
        <input id="ttb-course-id" type="hidden" value="${ttbAttr(course?.courseid || "")}" />
        <label class="timetable-builder-field">
          <span>Course name</span>
          <input id="ttb-course-name" type="text" maxlength="100" value="${ttbAttr(course?.coursename || "")}" placeholder="e.g. Reboot Your Maktab" />
        </label>
        <label class="timetable-builder-check">
          <input id="ttb-course-active" type="checkbox" ${course ? (course.active ? "checked" : "") : "checked"} />
          <span>Active course</span>
        </label>
        <button type="button" class="timetable-builder-primary" data-ttb-action="save-course">${course ? "Save Course" : "Create Course"}</button>
      </section>

      <section class="timetable-builder-panel timetable-builder-panel--wide">
        <div class="timetable-builder-panel-heading">
          <div>
            <h3>Course Time Slots</h3>
            <p>Every row needs a start and end time.</p>
          </div>
          ${courseId ? '<button type="button" data-ttb-action="new-slot">New time slot</button>' : ""}
        </div>
        ${courseId ? `
          <div class="timetable-builder-inline-form">
            <input id="ttb-slot-id" type="hidden" value="${ttbAttr(slot?.timeslotid || "")}" />
            <label class="timetable-builder-field"><span>Start</span><input id="ttb-slot-start" type="time" lang="en-GB" step="60" value="${ttbAttr(slot?.starttime || "")}" /></label>
            <label class="timetable-builder-field"><span>End</span><input id="ttb-slot-end" type="time" lang="en-GB" step="60" value="${ttbAttr(slot?.endtime || "")}" /></label>
            <label class="timetable-builder-check"><input id="ttb-slot-active" type="checkbox" ${slot ? (slot.active ? "checked" : "") : "checked"} /><span>Active</span></label>
            <button type="button" class="timetable-builder-primary" data-ttb-action="save-slot">${slot ? "Save Time Slot" : "Add Time Slot"}</button>
          </div>
          ${renderTimeSlotList(slots)}
        ` : '<div class="timetable-builder-empty timetable-builder-empty--inside"><p>Create or select a course first.</p></div>'}
      </section>
    </div>
  `);
}

function renderTimeSlotList(slots) {
  if (!slots.length) return '<p class="timetable-builder-list-empty">No time slots have been added.</p>';
  return `
    <div class="timetable-builder-record-list">
      ${slots.map(slot => `
        <button type="button" class="timetable-builder-record-row ${slot.active ? "" : "is-inactive"}" data-ttb-action="edit-slot" data-time-slot-id="${ttbAttr(slot.timeslotid)}">
          <span><strong>${ttbEscape(formatBuilderTimeRange(slot))}</strong><small>${ttbEscape(slot.timeslotid)}</small></span>
          <span class="timetable-builder-status">${slot.active ? "Active" : "Inactive"}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderTimetableBuilderSubjects() {
  const subject = (timetableBuilderState.data.subjects || []).find(item => item.subjectid === timetableBuilderState.editSubjectId) || null;
  const subjects = timetableBuilderState.data.subjects || [];
  setTimetableBuilderContent(`
    <div class="timetable-builder-management-grid">
      <section class="timetable-builder-panel">
        <div class="timetable-builder-panel-heading"><h3>${subject ? "Modify Subject" : "Add Subject"}</h3>${subject ? '<button type="button" data-ttb-action="new-subject">Add another</button>' : ""}</div>
        <input id="ttb-subject-id" type="hidden" value="${ttbAttr(subject?.subjectid || "")}" />
        <label class="timetable-builder-field"><span>Subject name</span><input id="ttb-subject-name" type="text" value="${ttbAttr(subject?.subjectname || "")}" placeholder="Subject name" /></label>
        <label class="timetable-builder-check"><input id="ttb-subject-active" type="checkbox" ${subject ? (subject.active ? "checked" : "") : "checked disabled"} /><span>Active subject</span></label>
        <button type="button" class="timetable-builder-primary" data-ttb-action="save-subject">${subject ? "Save Subject" : "Create Subject"}</button>
      </section>
      <section class="timetable-builder-panel timetable-builder-panel--wide">
        <div class="timetable-builder-panel-heading"><div><h3>Subjects</h3><p>${subjects.length} records</p></div><button type="button" data-ttb-action="new-subject">New Subject</button></div>
        ${renderCurriculumRows(subjects, subject => ({ id: subject.subjectid, title: subject.subjectname, subtitle: subject.subjectid, active: subject.active, action: "edit-subject", dataName: "subject-id" }))}
      </section>
    </div>
  `);
}

function renderTimetableBuilderModules() {
  const module = (timetableBuilderState.data.modules || []).find(item => item.moduleid === timetableBuilderState.editModuleId) || null;
  const subjects = timetableBuilderState.data.subjects || [];
  const modules = timetableBuilderState.data.modules || [];
  const defaultSubject = module?.subjectid || subjects.find(subject => subject.active)?.subjectid || subjects[0]?.subjectid || "";
  setTimetableBuilderContent(`
    <div class="timetable-builder-management-grid">
      <section class="timetable-builder-panel">
        <div class="timetable-builder-panel-heading"><h3>${module ? "Modify Module" : "Add Module"}</h3>${module ? '<button type="button" data-ttb-action="new-module">Add another</button>' : ""}</div>
        <input id="ttb-module-id" type="hidden" value="${ttbAttr(module?.moduleid || "")}" />
        <label class="timetable-builder-field"><span>Subject</span><select id="ttb-module-subject">${renderSubjectOptions(defaultSubject, true)}</select></label>
        <label class="timetable-builder-field"><span>Module name</span><input id="ttb-module-name" type="text" value="${ttbAttr(module?.modulename || "")}" placeholder="Module name" /></label>
        <label class="timetable-builder-field"><span>Sort order</span><input id="ttb-module-sort" type="number" min="1" step="1" value="${ttbAttr(module?.sortorder || "")}" placeholder="Automatic" /></label>
        <label class="timetable-builder-check"><input id="ttb-module-active" type="checkbox" ${module ? (module.active ? "checked" : "") : "checked disabled"} /><span>Active module</span></label>
        <button type="button" class="timetable-builder-primary" data-ttb-action="save-module">${module ? "Save Module" : "Create Module"}</button>
      </section>
      <section class="timetable-builder-panel timetable-builder-panel--wide">
        <div class="timetable-builder-panel-heading"><div><h3>Modules</h3><p>${modules.length} records</p></div><button type="button" data-ttb-action="new-module">New Module</button></div>
        ${renderCurriculumRows(modules, item => ({ id: item.moduleid, title: item.modulename, subtitle: `${subjectNameFor(item.subjectid)} · Order ${item.sortorder || "—"}`, active: item.active, action: "edit-module", dataName: "module-id" }))}
      </section>
    </div>
  `);
}

function renderTimetableBuilderTasks() {
  const task = (timetableBuilderState.data.tasks || []).find(item => item.taskid === timetableBuilderState.editTaskId) || null;
  const subjects = timetableBuilderState.data.subjects || [];
  const defaultSubject = task?.subjectid || timetableBuilderState.taskFilterSubjectId || subjects.find(subject => subject.active)?.subjectid || "";
  const tasks = (timetableBuilderState.data.tasks || []).filter(item => (
    !timetableBuilderState.taskFilterSubjectId || timetableBuilderState.taskFilterSubjectId === "ALL" || item.subjectid === timetableBuilderState.taskFilterSubjectId
  ));
  setTimetableBuilderContent(`
    <div class="timetable-builder-management-grid">
      <section class="timetable-builder-panel">
        <div class="timetable-builder-panel-heading"><h3>${task ? "Modify Task" : "Add Task"}</h3>${task ? '<button type="button" data-ttb-action="new-task">Add another</button>' : ""}</div>
        <input id="ttb-task-id" type="hidden" value="${ttbAttr(task?.taskid || "")}" />
        <label class="timetable-builder-field"><span>Subject</span><select id="ttb-task-subject">${renderSubjectOptions(defaultSubject, true)}</select></label>
        <label class="timetable-builder-field"><span>Module <small>optional</small></span><select id="ttb-task-module"></select></label>
        <label class="timetable-builder-field"><span>Task name</span><input id="ttb-task-name" type="text" value="${ttbAttr(task?.taskname || "")}" placeholder="Task name" /></label>
        <label class="timetable-builder-check"><input id="ttb-task-active" type="checkbox" ${task ? (task.active ? "checked" : "") : "checked disabled"} /><span>Active task</span></label>
        <button type="button" class="timetable-builder-primary" data-ttb-action="save-task">${task ? "Save Task" : "Create Task"}</button>
      </section>
      <section class="timetable-builder-panel timetable-builder-panel--wide">
        <div class="timetable-builder-panel-heading timetable-builder-panel-heading--filter">
          <div><h3>Tasks</h3><p>${tasks.length} shown</p></div>
          <label class="timetable-builder-field"><span>Filter subject</span><select id="ttb-task-filter-subject"><option value="ALL">All subjects</option>${renderSubjectOptions(timetableBuilderState.taskFilterSubjectId, false)}</select></label>
          <button type="button" data-ttb-action="new-task">New Task</button>
        </div>
        ${renderCurriculumRows(tasks, item => ({ id: item.taskid, title: item.taskname, subtitle: `${subjectNameFor(item.subjectid)}${item.modulename ? ` · ${item.modulename}` : ""}`, active: item.active, action: "edit-task", dataName: "task-id" }))}
      </section>
    </div>
  `);
  renderTaskModuleOptions(defaultSubject, task?.moduleid || "");
}

function renderCurriculumRows(items, mapper) {
  if (!items.length) return '<p class="timetable-builder-list-empty">No records found.</p>';
  return `<div class="timetable-builder-record-list timetable-builder-record-list--scroll">${items.map(item => {
    const row = mapper(item);
    return `
      <button type="button" class="timetable-builder-record-row ${row.active ? "" : "is-inactive"}" data-ttb-action="${ttbAttr(row.action)}" data-${ttbAttr(row.dataName)}="${ttbAttr(row.id)}">
        <span><strong>${ttbEscape(row.title)}</strong><small>${ttbEscape(row.subtitle)}</small></span>
        <span class="timetable-builder-status">${row.active ? "Active" : "Inactive"}</span>
      </button>
    `;
  }).join("")}</div>`;
}

function renderSubjectOptions(selectedId, activeOnly) {
  return (timetableBuilderState.data.subjects || [])
    .filter(subject => !activeOnly || subject.active || subject.subjectid === selectedId)
    .map(subject => `<option value="${ttbAttr(subject.subjectid)}" ${subject.subjectid === selectedId ? "selected" : ""}>${ttbEscape(subject.subjectname)}${subject.active ? "" : " — inactive"}</option>`)
    .join("");
}

function renderTaskModuleOptions(subjectId, selectedModuleId) {
  const select = document.getElementById("ttb-task-module");
  if (!select) return;
  const modules = (timetableBuilderState.data.modules || []).filter(module => (
    module.subjectid === subjectId && (module.active || module.moduleid === selectedModuleId)
  ));
  select.innerHTML = `<option value="">No module</option>${modules.map(module => `<option value="${ttbAttr(module.moduleid)}" ${module.moduleid === selectedModuleId ? "selected" : ""}>${ttbEscape(module.modulename)}</option>`).join("")}`;
}

function renderTimetableSessionModuleOptions(subjectId, selectedModuleId) {
  const select = document.getElementById("ttb-session-module");
  if (!select) return;
  const modules = (timetableBuilderState.data.modules || []).filter(module => (
    module.subjectid === subjectId && (module.active || module.moduleid === selectedModuleId)
  ));
  select.innerHTML = `<option value="">No module</option>${modules.map(module => `<option value="${ttbAttr(module.moduleid)}" ${module.moduleid === selectedModuleId ? "selected" : ""}>${ttbEscape(module.modulename)}</option>`).join("")}`;
  select.disabled = !subjectId;
}

function editTimetableBuilderCourse(courseId) {
  timetableBuilderState.activeTab = "courses";
  timetableBuilderState.editCourseId = courseId || "";
  renderTimetableBuilder();
}

function editTimetableBuilderTimeSlot(timeSlotId, switchTab = false) {
  if (switchTab) timetableBuilderState.activeTab = "courses";
  timetableBuilderState.editTimeSlotId = timeSlotId || "";
  renderTimetableBuilder();
}

function editTimetableBuilderSubject(subjectId) {
  timetableBuilderState.editSubjectId = subjectId || "";
  renderTimetableBuilder();
}

function editTimetableBuilderModule(moduleId) {
  timetableBuilderState.editModuleId = moduleId || "";
  renderTimetableBuilder();
}

function editTimetableBuilderTask(taskId) {
  timetableBuilderState.editTaskId = taskId || "";
  renderTimetableBuilder();
}

async function saveTimetableBuilderCourse(button) {
  const courseid = valueOf("ttb-course-id");
  const courseName = valueOf("ttb-course-name");
  if (!courseName) return setTimetableBuilderMessage("Enter a course name.", "error");
  return runTimetableBuilderSave(button, "/api/admin/timetable-builder/course/save", {
    courseid,
    courseName,
    active: checkedOf("ttb-course-active")
  }, result => {
    timetableBuilderState.selectedCourseId = result.course?.courseid || courseid;
    timetableBuilderState.editCourseId = timetableBuilderState.selectedCourseId;
  });
}

async function saveTimetableBuilderTimeSlot(button) {
  const courseid = timetableBuilderState.selectedCourseId;
  const startTime = valueOf("ttb-slot-start");
  const endTime = valueOf("ttb-slot-end");
  if (!courseid || !startTime || !endTime) return setTimetableBuilderMessage("Select a course and enter start and end times.", "error");
  return runTimetableBuilderSave(button, "/api/admin/timetable-builder/time-slot/save", {
    timeslotid: valueOf("ttb-slot-id"), courseid, startTime, endTime, active: checkedOf("ttb-slot-active")
  }, () => { timetableBuilderState.editTimeSlotId = ""; });
}

async function saveTimetableBuilderSubject(button) {
  const subjectid = valueOf("ttb-subject-id");
  const subjectName = valueOf("ttb-subject-name");
  if (!subjectName) return setTimetableBuilderMessage("Enter a subject name.", "error");
  const path = subjectid ? "/api/admin/subjects/update" : "/api/admin/subjects/create";
  const payload = subjectid
    ? { subjectid, subjectName, active: checkedOf("ttb-subject-active") }
    : { subjectName };
  return runTimetableBuilderSave(button, path, payload, () => { timetableBuilderState.editSubjectId = ""; });
}

async function saveTimetableBuilderModule(button) {
  const moduleid = valueOf("ttb-module-id");
  const subjectid = valueOf("ttb-module-subject");
  const moduleName = valueOf("ttb-module-name");
  if (!subjectid || !moduleName) return setTimetableBuilderMessage("Select a subject and enter a module name.", "error");
  const path = moduleid ? "/api/admin/modules/update" : "/api/admin/modules/create";
  const payload = {
    moduleid,
    subjectid,
    moduleName,
    sortOrder: valueOf("ttb-module-sort"),
    active: checkedOf("ttb-module-active")
  };
  if (!moduleid) delete payload.active;
  return runTimetableBuilderSave(button, path, payload, () => { timetableBuilderState.editModuleId = ""; });
}

async function saveTimetableBuilderTask(button) {
  const taskid = valueOf("ttb-task-id");
  const subjectid = valueOf("ttb-task-subject");
  const moduleid = valueOf("ttb-task-module");
  const taskName = valueOf("ttb-task-name");
  if (!subjectid || !taskName) return setTimetableBuilderMessage("Select a subject and enter a task name.", "error");
  const path = taskid ? "/api/admin/tasks/update" : "/api/admin/tasks/create";
  const payload = { taskid, subjectid, moduleid, taskName, active: checkedOf("ttb-task-active") };
  if (!taskid) delete payload.active;
  return runTimetableBuilderSave(button, path, payload, () => {
    timetableBuilderState.editTaskId = "";
    timetableBuilderState.taskFilterSubjectId = subjectid;
  });
}

async function runTimetableBuilderSave(button, path, payload, onSuccess) {
  button.disabled = true;
  setTimetableBuilderMessage("Saving…", "");
  try {
    const result = await apiPost(path, payload, state.token);
    if (!result.success) throw new Error(result.error || "Save failed");
    if (typeof onSuccess === "function") onSuccess(result);
    timetableBuilderState.loaded = false;
    await loadTimetableBuilder(true);
    setTimetableBuilderMessage(result.message || "Saved.", "success");
    return true;
  } catch (error) {
    console.error("Timetable Builder save failed", error);
    setTimetableBuilderMessage(error?.message || "Save failed.", "error");
    return false;
  } finally {
    button.disabled = false;
  }
}

function openTimetableSessionEditor(sessionId, timeSlotId, day) {
  const courseId = timetableBuilderState.selectedCourseId;
  const session = (timetableBuilderState.data.sessions || []).find(item => item.sessionid === sessionId) || null;
  const selectedSubject = session?.subjectid || (timetableBuilderState.data.subjects || []).find(subject => subject.active)?.subjectid || "";
  const selectedTeacher = session?.teacherid || (timetableBuilderState.data.teachers || []).find(teacher => teacher.active)?.teacherid || "";
  const dialog = document.getElementById("timetable-session-dialog");
  if (!dialog || !courseId) return false;

  setValue("ttb-session-id", session?.sessionid || "");
  setValue("ttb-session-course", session?.courseid || courseId);
  renderTimetableSessionChoices(
    "ttb-session-days",
    "ttb-session-day",
    timetableBuilderState.data.days || [],
    [session?.dayofweek || day || "Mon"],
    session ? "radio" : "checkbox"
  );
  setSelectOptions("ttb-session-slot", (timetableBuilderState.data.timeslots || [])
    .filter(slot => slot.courseid === courseId && (slot.active || slot.timeslotid === session?.timeslotid))
    .map(slot => ({ value: slot.timeslotid, label: formatBuilderTimeRange(slot) })), session?.timeslotid || timeSlotId || "");
  renderTimetableSessionChoices(
    "ttb-session-groups",
    "ttb-session-group",
    timetableBuilderState.data.groups || [],
    [session?.groupno || "ALL"],
    session ? "radio" : "checkbox"
  );
  setSelectOptions("ttb-session-subject", (timetableBuilderState.data.subjects || [])
    .filter(subject => subject.active || subject.subjectid === session?.subjectid)
    .map(subject => ({ value: subject.subjectid, label: `${subject.subjectname}${subject.active ? "" : " — inactive"}` })), selectedSubject);
  renderTimetableSessionModuleOptions(selectedSubject, session?.moduleid || "");
  renderTimetableSessionGroupAssignments(session ? {
    [session.groupno]: { teacherid: selectedTeacher, zoomlink: session.zoomlink || "" }
  } : {});
  document.getElementById("timetable-session-dialog-title").textContent = session ? "Modify Session" : "Add Sessions";
  document.getElementById("ttb-save-session").textContent = session ? "Save Session" : "Save Sessions";
  document.getElementById("ttb-session-days-help").textContent = session
    ? "Modify this session's day."
    : "Select one or more days.";
  document.getElementById("ttb-session-groups-help").textContent = session
    ? "Modify this session's group."
    : "Select ALL by itself, or select individual groups and assign each its own teacher and Zoom link.";
  const deleteButton = document.getElementById("ttb-delete-session");
  const restoreButton = document.getElementById("ttb-restore-session");
  if (deleteButton) deleteButton.hidden = !session || !session.active;
  if (restoreButton) restoreButton.hidden = !session || session.active;
  const saveButton = document.getElementById("ttb-save-session");
  if (saveButton) saveButton.hidden = Boolean(session && !session.active);
  clearTimetableSessionMessage();

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  return true;
}

function collectTimetableSessionGroupAssignments() {
  return Array.from(document.querySelectorAll("#ttb-session-group-assignments [data-group-no]")).reduce((result, row) => {
    result[row.dataset.groupNo] = {
      groupno: row.dataset.groupNo,
      teacherid: String(row.querySelector(".ttb-session-group-teacher")?.value || "").trim(),
      zoomlink: String(row.querySelector(".ttb-session-group-zoom")?.value || "").trim()
    };
    return result;
  }, {});
}

function renderTimetableSessionGroupAssignments(initialValues) {
  const container = document.getElementById("ttb-session-group-assignments");
  if (!container) return false;
  const values = initialValues || collectTimetableSessionGroupAssignments();
  const groups = selectedTimetableBuilderValues("ttb-session-group");
  const teachers = timetableBuilderState.data.teachers || [];
  if (!groups.length) {
    container.innerHTML = '<p class="timetable-builder-list-empty">Select at least one group.</p>';
    return true;
  }

  container.innerHTML = groups.map(groupno => {
    const assignment = values[groupno] || {};
    const teacherOptions = teachers
      .filter(teacher => teacher.active || teacher.teacherid === assignment.teacherid)
      .map(teacher => `<option value="${ttbAttr(teacher.teacherid)}" ${teacher.teacherid === assignment.teacherid ? "selected" : ""}>${ttbEscape(teacher.teachername)} — ${ttbEscape(teacher.role)}${teacher.active ? "" : " — inactive"}</option>`)
      .join("");
    return `
      <article class="timetable-session-group-assignment" data-group-no="${ttbAttr(groupno)}">
        <strong>${groupno === "ALL" ? "All groups together" : `Group ${ttbEscape(groupno)}`}</strong>
        <div class="timetable-session-group-assignment-grid">
          <label class="timetable-builder-field">
            <span>Teacher</span>
            <select class="ttb-session-group-teacher" required>
              <option value="">Select teacher</option>
              ${teacherOptions}
            </select>
          </label>
          <label class="timetable-builder-field">
            <span>Zoom override <small>optional</small></span>
            <input class="ttb-session-group-zoom" type="url" inputmode="url" value="${ttbAttr(assignment.zoomlink || "")}" placeholder="Use global Zoom when blank" />
          </label>
        </div>
      </article>
    `;
  }).join("");
  return true;
}

function closeTimetableSessionEditor() {
  const dialog = document.getElementById("timetable-session-dialog");
  if (!dialog) return false;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
  clearTimetableSessionMessage();
  return true;
}

async function saveTimetableBuilderSession(button) {
  const sessionid = valueOf("ttb-session-id");
  const daysofweek = selectedTimetableBuilderValues("ttb-session-day");
  const subjectid = valueOf("ttb-session-subject");
  const moduleid = valueOf("ttb-session-module");
  const groupassignments = Object.values(collectTimetableSessionGroupAssignments());

  if (!daysofweek.length) {
    showTimetableSessionMessage("Select at least one day.");
    return false;
  }

  if (!groupassignments.length) {
    showTimetableSessionMessage("Select at least one group.");
    return false;
  }

  if (!subjectid) {
    showTimetableSessionMessage("Select one subject.");
    return false;
  }

  const incompleteAssignment = groupassignments.find(assignment => !assignment.teacherid);
  if (incompleteAssignment) {
    showTimetableSessionMessage(`Select a teacher for group ${incompleteAssignment.groupno}.`);
    return false;
  }

  const teacherGroups = new Map();
  groupassignments.filter(assignment => assignment.groupno !== "ALL").forEach(assignment => {
    teacherGroups.set(assignment.teacherid, [...(teacherGroups.get(assignment.teacherid) || []), assignment.groupno]);
  });
  const repeatedTeacher = Array.from(teacherGroups.entries()).find(([, groups]) => groups.length > 1);
  if (repeatedTeacher) {
    showTimetableSessionMessage(`One teacher cannot teach groups ${repeatedTeacher[1].join(" and ")} at the same time. Select ALL if the groups are taught together.`);
    return false;
  }

  const payload = {
    sessionid,
    courseid: valueOf("ttb-session-course"),
    timeslotid: valueOf("ttb-session-slot"),
    ...(sessionid ? { dayofweek: daysofweek[0] } : { daysofweek }),
    subjectid,
    moduleid,
    groupassignments
  };
  button.disabled = true;
  showTimetableSessionMessage("Checking every day, group and teacher before saving…", "working");
  try {
    const result = await apiPost("/api/admin/timetable-builder/session/save", payload, state.token);
    if (!result.success) {
      showTimetableSessionMessage(result.error || "Unable to save session", "error", result.conflicts);
      return false;
    }
    closeTimetableSessionEditor();
    timetableBuilderState.loaded = false;
    await loadTimetableBuilder(true);
    setTimetableBuilderMessage(result.message || "Sessions saved.", "success");
    return true;
  } catch (error) {
    const message = error?.message || "Unable to save session.";
    showTimetableSessionMessage(message, "error");
    setTimetableBuilderMessage(message, "error");
    return false;
  } finally {
    button.disabled = false;
  }
}

async function deleteTimetableBuilderSession(button) {
  const sessionid = valueOf("ttb-session-id");
  const session = (timetableBuilderState.data.sessions || []).find(item => item.sessionid === sessionid);
  if (!session) return false;
  const stage = getSelectedTimetableState().stage;
  const hardDelete = stage === "DEVELOPMENT" && !session.everpublished;
  const summary = `${session.dayofweek} ${formatBuilderTime(session.starttime)}–${formatBuilderTime(session.endtime)}, group ${session.groupno}, ${session.subjectname || session.subjectid}${session.modulename ? ` / ${session.modulename}` : ""}, ${session.teachername || session.teacherid}`;
  const warning = hardDelete
    ? `Permanently delete this never-published draft session?\n\n${summary}\n\nThis cannot be undone.`
    : `Remove this session from the development timetable?\n\n${summary}\n\nThe published snapshot is preserved and the session can be restored.`;
  if (!window.confirm(warning)) return false;

  button.disabled = true;
  showTimetableSessionMessage(hardDelete ? "Permanently deleting draft session…" : "Removing session from the draft…", "working");
  try {
    const result = await apiPost("/api/admin/timetable-builder/session/delete", {
      sessionid,
      mode: hardDelete ? "HARD" : "SOFT"
    }, state.token);
    if (!result.success) throw new Error(result.error || "Unable to delete session");
    closeTimetableSessionEditor();
    timetableBuilderState.loaded = false;
    await loadTimetableBuilder(true);
    setTimetableBuilderMessage(result.message || "Session deleted.", "success");
    return true;
  } catch (error) {
    showTimetableSessionMessage(error?.message || "Unable to delete session.", "error");
    return false;
  } finally {
    button.disabled = false;
  }
}

async function restoreTimetableBuilderSession(button) {
  const sessionid = valueOf("ttb-session-id");
  button.disabled = true;
  showTimetableSessionMessage("Checking conflicts before restoring…", "working");
  try {
    const result = await apiPost("/api/admin/timetable-builder/session/restore", { sessionid }, state.token);
    if (!result.success) {
      showTimetableSessionMessage(result.error || "Unable to restore session", "error", result.conflicts);
      return false;
    }
    closeTimetableSessionEditor();
    timetableBuilderState.loaded = false;
    timetableBuilderState.showInactiveSessions = true;
    await loadTimetableBuilder(true);
    setTimetableBuilderMessage(result.message || "Session restored.", "success");
    return true;
  } catch (error) {
    showTimetableSessionMessage(error?.message || "Unable to restore session.", "error");
    return false;
  } finally {
    button.disabled = false;
  }
}

async function publishTimetableBuilder(button) {
  const courseid = timetableBuilderState.selectedCourseId;
  const course = (timetableBuilderState.data.courses || []).find(item => item.courseid === courseid);
  const activeCount = (timetableBuilderState.data.sessions || []).filter(session => session.courseid === courseid && session.active).length;
  const nextVersion = (getSelectedTimetableState().versionno || 0) + 1;
  if (!courseid || !activeCount) return setTimetableBuilderMessage("Add at least one active session before publishing.", "error");
  if (!window.confirm(`Publish ${course?.coursename || "this course"} timetable version ${nextVersion} with ${activeCount} active sessions?\n\nThis creates an immutable snapshot. TeacherAssign remains the live timetable source in V101.4.3.`)) return false;

  button.disabled = true;
  setTimetableBuilderMessage("Validating and publishing an immutable snapshot…", "");
  try {
    const result = await apiPost("/api/admin/timetable-builder/publish", { courseid }, state.token);
    if (!result.success) throw new Error(result.error || "Unable to publish timetable");
    timetableBuilderState.loaded = false;
    await loadTimetableBuilder(true);
    setTimetableBuilderMessage(result.message || "Timetable published.", "success");
    return true;
  } catch (error) {
    setTimetableBuilderMessage(error?.message || "Unable to publish timetable.", "error");
    return false;
  } finally {
    button.disabled = false;
  }
}

function subjectNameFor(subjectId) {
  return (timetableBuilderState.data.subjects || []).find(subject => subject.subjectid === subjectId)?.subjectname || subjectId;
}

function formatBuilderTimeRange(slot) {
  return `${formatBuilderTime(slot?.starttime)}–${formatBuilderTime(slot?.endtime)}`;
}

function formatBuilderTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
  if (!match) return String(value || "");
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

function formatBuilderDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function renderTimetableSessionChoices(containerId, name, values, selectedValues, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const selected = new Set((selectedValues || []).map(String));
  container.innerHTML = values.map(value => `
    <label class="timetable-builder-choice">
      <input type="${ttbAttr(type)}" name="${ttbAttr(name)}" value="${ttbAttr(value)}" ${selected.has(String(value)) ? "checked" : ""} />
      <span>${ttbEscape(value)}</span>
    </label>
  `).join("");
}

function selectedTimetableBuilderValues(name) {
  return Array.from(document.querySelectorAll(`input[name='${name}']:checked`)).map(input => input.value);
}

function enforceTimetableBuilderGroupSelection(changedInput) {
  if (changedInput.type !== "checkbox" || !changedInput.checked) return;
  const inputs = Array.from(document.querySelectorAll("input[name='ttb-session-group']"));
  if (changedInput.value === "ALL") {
    inputs.forEach(input => { if (input !== changedInput) input.checked = false; });
    return;
  }
  const allInput = inputs.find(input => input.value === "ALL");
  if (allInput) allInput.checked = false;
}

function showTimetableSessionMessage(message, type = "error", conflicts = []) {
  const element = document.getElementById("timetable-session-message");
  if (!element) return false;
  const conflictItems = Array.isArray(conflicts) ? conflicts.filter(item => item?.message) : [];
  const heading = conflictItems.length
    ? "The selected sessions could not be saved because of these timetable conflicts:"
    : (message || "Unable to save session.");
  element.className = `timetable-session-message is-${ttbAttr(type)}`;
  element.innerHTML = `
    <strong>${ttbEscape(heading)}</strong>
    ${conflictItems.length ? `<ul>${conflictItems.map(item => `<li>${ttbEscape(item.message)}</li>`).join("")}</ul>` : ""}
  `;
  return true;
}

function clearTimetableSessionMessage() {
  const element = document.getElementById("timetable-session-message");
  if (!element) return false;
  element.className = "timetable-session-message";
  element.textContent = "";
  return true;
}

function setSelectOptions(id, options, selectedValue) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = options.map(option => `<option value="${ttbAttr(option.value)}" ${String(option.value) === String(selectedValue) ? "selected" : ""}>${ttbEscape(option.label)}</option>`).join("");
}

function setTimetableBuilderContent(html) {
  const container = document.getElementById("timetable-builder-content");
  if (container) container.innerHTML = html;
}

function setTimetableBuilderMessage(message, type) {
  const element = document.getElementById("timetable-builder-message");
  if (!element) return false;
  element.textContent = message || "";
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
  return true;
}

function valueOf(id) {
  return String(document.getElementById(id)?.value || "").trim();
}

function checkedOf(id) {
  return document.getElementById(id)?.checked === true;
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value || "";
}

function ttbEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ttbAttr(value) {
  return ttbEscape(value).replace(/`/g, "&#96;");
}

window.showTimetableBuilder = showTimetableBuilder;
window.M4LTimetableBuilder = {
  show: showTimetableBuilder,
  load: loadTimetableBuilder,
  render: renderTimetableBuilder,
  state: timetableBuilderState
};
