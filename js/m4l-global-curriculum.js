/* M4L V102.6 - ADMIN/GLOBAL_ADMIN central curriculum and direct subject-access UI. */
(function () {
  "use strict";

  const RESOURCE_TYPES = ["EBOOK", "PRINTABLE", "AUDIO", "VIDEO", "OTHER"];
  const model = {
    loaded: false,
    loading: false,
    tab: "subjects",
    editing: {
      subjects: "",
      modules: "",
      tasks: "",
      resources: "",
      access: ""
    },
    data: emptyData()
  };
  let handlersBound = false;

  function emptyData() {
    return {
      globalCurriculumVersion: 0,
      subjects: [],
      modules: [],
      tasks: [],
      resources: [],
      accounts: [],
      subjectAccess: []
    };
  }

  function hasGlobalCurriculumAuthority() {
    const user = appState()?.user || {};
    return String(user.platformrole || "").trim().toUpperCase() === "GLOBAL_ADMIN" ||
      String(user.role || "").trim().toUpperCase() === "ADMIN";
  }

  function syncAccess() {
    const allowed = hasGlobalCurriculumAuthority();
    document.querySelectorAll("[data-global-curriculum-admin]").forEach(button => {
      button.classList.toggle("hidden", !allowed);
      button.disabled = !allowed;
      button.setAttribute("aria-hidden", allowed ? "false" : "true");
    });
    return allowed;
  }

  async function show() {
    if (!syncAccess()) {
      alert("Global Curriculum is available to ADMIN and GLOBAL_ADMIN accounts only.");
      return false;
    }
    bindHandlers();
    if (typeof window.showScreen !== "function" || !window.showScreen("global-curriculum-screen")) {
      return false;
    }
    await load(false);
    return true;
  }

  function bindHandlers() {
    if (handlersBound) return;
    handlersBound = true;
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
  }

  function getAction(event) {
    const target = event?.target;
    if (!target || typeof target.closest !== "function") return null;
    const action = target.closest("[data-gcm-action]");
    return action && action.closest("#global-curriculum-screen") ? action : null;
  }

  async function handleClick(event) {
    const target = getAction(event);
    if (!target || target.disabled) return;
    const action = target.dataset.gcmAction || "";
    if (!action) return;
    event.preventDefault();

    if (action === "reload") return load(true);
    if (action === "show-tab") return selectTab(target.dataset.gcmTab);
    if (action === "new") return beginEdit("");
    if (action === "edit") return beginEdit(target.dataset.recordId || "");
    if (action === "save-subject") return saveSubject(target);
    if (action === "save-module") return saveModule(target);
    if (action === "save-task") return saveTask(target);
    if (action === "save-resource") return saveResource(target);
    if (action === "save-access") return saveAccess(target);
  }

  function handleChange(event) {
    const target = event?.target;
    if (!target || !target.closest("#global-curriculum-screen")) return;
    if (target.id === "gcm-task-subject") updateTaskModuleOptions();
    if (target.id === "gcm-resource-subject" || target.id === "gcm-resource-module") {
      updateResourceBranchOptions();
    }
  }

  async function load(force) {
    if (model.loading) return false;
    if (model.loaded && !force) {
      render();
      return true;
    }
    model.loading = true;
    setMessage("Loading central global curriculum…", "");
    setContent('<p class="helper-text">Loading Global Curriculum...</p>');
    try {
      const result = await apiPost("/api/admin/platform/global/get", {}, appState()?.token || "");
      if (!result.success) throw new Error(result.error || "Unable to load Global Curriculum");
      model.data = {
        globalCurriculumVersion: Number(result.globalCurriculumVersion) || 0,
        subjects: array(result.subjects),
        modules: array(result.modules),
        tasks: array(result.tasks),
        resources: array(result.resources),
        accounts: array(result.accounts),
        subjectAccess: array(result.subjectAccess)
      };
      model.loaded = true;
      setMessage("", "");
      render();
      return true;
    } catch (error) {
      setMessage(error.message || "Unable to load Global Curriculum.", "error");
      setContent('<div class="global-curriculum-empty"><h3>Global Curriculum unavailable</h3><p>Check Platform Sheet validation and try again.</p><button type="button" data-gcm-action="reload">Try again</button></div>');
      return false;
    } finally {
      model.loading = false;
    }
  }

  function selectTab(tab) {
    if (!["subjects", "modules", "tasks", "resources", "access"].includes(tab)) return;
    model.tab = tab;
    setMessage("", "");
    render();
  }

  function beginEdit(recordId) {
    model.editing[model.tab] = String(recordId || "");
    setMessage("", "");
    render();
  }

  function render() {
    document.querySelectorAll("#global-curriculum-screen [data-gcm-tab]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.gcmTab === model.tab);
    });
    const version = document.getElementById("global-curriculum-version");
    if (version) version.textContent = `Curriculum version ${model.data.globalCurriculumVersion || "—"}`;

    if (model.tab === "subjects") return renderSubjects();
    if (model.tab === "modules") return renderModules();
    if (model.tab === "tasks") return renderTasks();
    if (model.tab === "resources") return renderResources();
    return renderAccess();
  }

  function renderSubjects() {
    const current = findById(model.data.subjects, "subjectid", model.editing.subjects);
    setContent(`
      <div class="global-curriculum-management-grid">
        ${panelForm(current ? "Modify Global Subject" : "Add Global Subject", `
          <input id="gcm-subject-id" type="hidden" value="${attr(current?.subjectid || "")}" />
          ${field("Subject name", `<input id="gcm-subject-name" type="text" maxlength="160" value="${attr(current?.subjectname || "")}" autocomplete="off" />`)}
          ${activeField("gcm-subject-active", current?.active !== false)}
          ${saveButtons("save-subject", Boolean(current))}
        `)}
        ${listPanel("Global Subjects", model.data.subjects.length, recordList(
          model.data.subjects,
          item => item.subjectid,
          item => item.subjectname,
          item => item.subjectid,
          item => item.active
        ))}
      </div>
    `);
  }

  function renderModules() {
    const current = findById(model.data.modules, "moduleid", model.editing.modules);
    const selectedSubject = current?.subjectid || firstActive(model.data.subjects, "subjectid");
    setContent(`
      <div class="global-curriculum-management-grid">
        ${panelForm(current ? "Modify Global Module" : "Add Global Module", `
          <input id="gcm-module-id" type="hidden" value="${attr(current?.moduleid || "")}" />
          ${field("Global subject", `<select id="gcm-module-subject">${subjectOptions(selectedSubject, current?.subjectid)}</select>`)}
          ${field("Module name", `<input id="gcm-module-name" type="text" maxlength="160" value="${attr(current?.modulename || "")}" autocomplete="off" />`)}
          ${field("Sort order", `<input id="gcm-module-sort" type="number" min="1" step="1" value="${attr(current?.sortorder || nextModuleSort(selectedSubject))}" />`)}
          ${activeField("gcm-module-active", current?.active !== false)}
          ${saveButtons("save-module", Boolean(current))}
        `)}
        ${listPanel("Global Modules", model.data.modules.length, recordList(
          sortedModules(),
          item => item.moduleid,
          item => item.modulename,
          item => `${subjectName(item.subjectid)} · Order ${item.sortorder || "—"}`,
          item => item.active
        ))}
      </div>
    `);
  }

  function renderTasks() {
    const current = findById(model.data.tasks, "taskid", model.editing.tasks);
    const selectedSubject = current?.subjectid || firstActive(model.data.subjects, "subjectid");
    setContent(`
      <div class="global-curriculum-management-grid">
        ${panelForm(current ? "Modify Global Task" : "Add Global Task", `
          <input id="gcm-task-id" type="hidden" value="${attr(current?.taskid || "")}" />
          ${field("Global subject", `<select id="gcm-task-subject">${subjectOptions(selectedSubject, current?.subjectid)}</select>`)}
          ${field("Module (optional)", `<select id="gcm-task-module">${moduleOptions(selectedSubject, current?.moduleid || "", true)}</select>`)}
          ${field("Task name", `<input id="gcm-task-name" type="text" maxlength="160" value="${attr(current?.taskname || "")}" autocomplete="off" />`)}
          ${activeField("gcm-task-active", current?.active !== false)}
          ${saveButtons("save-task", Boolean(current))}
        `)}
        ${listPanel("Global Tasks", model.data.tasks.length, recordList(
          model.data.tasks,
          item => item.taskid,
          item => item.taskname,
          item => `${subjectName(item.subjectid)}${item.moduleid ? ` · ${moduleName(item.moduleid)}` : ""}`,
          item => item.active
        ))}
      </div>
    `);
  }

  function renderResources() {
    const current = findById(model.data.resources, "resourceid", model.editing.resources);
    const selectedSubject = current?.subjectid || firstActive(model.data.subjects, "subjectid");
    const selectedModule = current?.moduleid || "";
    setContent(`
      <div class="global-curriculum-management-grid">
        ${panelForm(current ? "Modify Global Resource" : "Add Global Resource", `
          <input id="gcm-resource-id" type="hidden" value="${attr(current?.resourceid || "")}" />
          ${field("Global subject", `<select id="gcm-resource-subject">${subjectOptions(selectedSubject, current?.subjectid)}</select>`)}
          ${field("Module (optional)", `<select id="gcm-resource-module">${moduleOptions(selectedSubject, selectedModule, true)}</select>`)}
          ${field("Task (optional)", `<select id="gcm-resource-task">${taskOptions(selectedSubject, selectedModule, current?.taskid || "")}</select>`)}
          ${field("Resource name", `<input id="gcm-resource-name" type="text" maxlength="160" value="${attr(current?.resourcename || "")}" autocomplete="off" />`)}
          ${field("Resource type", `<select id="gcm-resource-type">${RESOURCE_TYPES.map(type => `<option value="${type}" ${type === (current?.resourcetype || "EBOOK") ? "selected" : ""}>${type}</option>`).join("")}</select>`)}
          ${field("Format (optional)", `<input id="gcm-resource-format" type="text" maxlength="40" value="${attr(current?.resourceformat || "")}" placeholder="e.g. PDF or MP4" />`)}
          ${field("Description (optional)", `<textarea id="gcm-resource-description" maxlength="2000">${html(current?.resourcedescription || "")}</textarea>`)}
          ${field("Complete HTTPS link", `<input id="gcm-resource-link" type="url" maxlength="2000" value="${attr(current?.resourcelink || "")}" placeholder="https://…" />`)}
          ${activeField("gcm-resource-active", current?.active !== false)}
          ${saveButtons("save-resource", Boolean(current))}
        `)}
        ${listPanel("Global Resources", model.data.resources.length, recordList(
          model.data.resources,
          item => item.resourceid,
          item => item.resourcename,
          item => `${item.resourcetype} · ${subjectName(item.subjectid)}${item.moduleid ? ` · ${moduleName(item.moduleid)}` : ""}`,
          item => item.active
        ))}
      </div>
    `);
  }

  function renderAccess() {
    const current = findById(model.data.subjectAccess, "subjectaccessid", model.editing.access);
    const activeAccounts = model.data.accounts.filter(item => item.active || item.accountid === current?.accountid);
    const selectedAccount = current?.accountid || activeAccounts[0]?.accountid || "";
    const selectedSubject = current?.subjectid || firstActive(model.data.subjects, "subjectid");
    const rows = [...model.data.subjectAccess].sort((left, right) => (
      accountName(left.accountid).localeCompare(accountName(right.accountid)) ||
      subjectName(left.subjectid).localeCompare(subjectName(right.subjectid))
    ));
    setContent(`
      <div class="global-curriculum-management-grid">
        ${panelForm(current ? "Modify Direct Subscription" : "Add Direct Subscription", `
          <input id="gcm-access-id" type="hidden" value="${attr(current?.subjectaccessid || "")}" />
          ${field("Account", `<select id="gcm-access-account" ${current ? "disabled" : ""}>${activeAccounts.map(account => `<option value="${attr(account.accountid)}" ${account.accountid === selectedAccount ? "selected" : ""}>${html(account.displayname)} · ${html(account.uniqueid)}</option>`).join("")}</select>`)}
          ${field("Global subject", `<select id="gcm-access-subject" ${current ? "disabled" : ""}>${subjectOptions(selectedSubject, current?.subjectid)}</select>`)}
          ${activeField("gcm-access-active", current?.active !== false, "Access active")}
          <p class="global-curriculum-help">This row authorises direct access to one global subject. It does not duplicate a course Student subscription.</p>
          ${saveButtons("save-access", Boolean(current))}
        `)}
        ${listPanel("Direct Global-Subject Subscriptions", rows.length, recordList(
          rows,
          item => item.subjectaccessid,
          item => accountName(item.accountid),
          item => subjectName(item.subjectid),
          item => item.active
        ))}
      </div>
    `);
  }

  async function saveSubject(button) {
    return submit(button, "/api/admin/platform/global/subject/save", {
      subjectId: value("gcm-subject-id"),
      subjectName: value("gcm-subject-name"),
      active: checked("gcm-subject-active")
    });
  }

  async function saveModule(button) {
    return submit(button, "/api/admin/platform/global/module/save", {
      moduleId: value("gcm-module-id"),
      subjectId: value("gcm-module-subject"),
      moduleName: value("gcm-module-name"),
      sortOrder: Number(value("gcm-module-sort")),
      active: checked("gcm-module-active")
    });
  }

  async function saveTask(button) {
    return submit(button, "/api/admin/platform/global/task/save", {
      taskId: value("gcm-task-id"),
      subjectId: value("gcm-task-subject"),
      moduleId: value("gcm-task-module"),
      taskName: value("gcm-task-name"),
      active: checked("gcm-task-active")
    });
  }

  async function saveResource(button) {
    return submit(button, "/api/admin/platform/global/resource/save", {
      resourceId: value("gcm-resource-id"),
      subjectId: value("gcm-resource-subject"),
      moduleId: value("gcm-resource-module"),
      taskId: value("gcm-resource-task"),
      resourceName: value("gcm-resource-name"),
      resourceType: value("gcm-resource-type"),
      resourceFormat: value("gcm-resource-format"),
      resourceDescription: value("gcm-resource-description"),
      resourceLink: value("gcm-resource-link"),
      active: checked("gcm-resource-active")
    });
  }

  async function saveAccess(button) {
    const current = findById(model.data.subjectAccess, "subjectaccessid", model.editing.access);
    return submit(button, "/api/admin/platform/global/access/save", {
      accountId: current?.accountid || value("gcm-access-account"),
      subjectId: current?.subjectid || value("gcm-access-subject"),
      active: checked("gcm-access-active")
    });
  }

  async function submit(button, path, payload) {
    if (model.loading) return false;
    model.loading = true;
    button.disabled = true;
    setMessage("Saving platform change…", "");
    try {
      const result = await apiPost(path, payload, appState()?.token || "");
      if (!result.success) throw new Error(result.error || "The platform change could not be saved");
      const dependencyText = result.dependencies ? formatDependencies(result.dependencies) : "";
      model.editing[model.tab] = "";
      model.loaded = false;
      model.loading = false;
      await load(true);
      setMessage(`${result.message || "Saved."}${dependencyText}`, "success");
      return true;
    } catch (error) {
      setMessage(error.message || "The platform change could not be saved.", "error");
      return false;
    } finally {
      model.loading = false;
      button.disabled = false;
    }
  }

  function updateTaskModuleOptions() {
    const select = document.getElementById("gcm-task-module");
    if (select) select.innerHTML = moduleOptions(value("gcm-task-subject"), "", true);
  }

  function updateResourceBranchOptions() {
    const subjectId = value("gcm-resource-subject");
    const moduleSelect = document.getElementById("gcm-resource-module");
    if (moduleSelect && document.activeElement?.id === "gcm-resource-subject") {
      moduleSelect.innerHTML = moduleOptions(subjectId, "", true);
    }
    const moduleId = value("gcm-resource-module");
    const taskSelect = document.getElementById("gcm-resource-task");
    if (taskSelect) taskSelect.innerHTML = taskOptions(subjectId, moduleId, "");
  }

  function panelForm(title, body) {
    return `<section class="global-curriculum-panel"><div class="global-curriculum-panel-heading"><h3>${html(title)}</h3><button type="button" data-gcm-action="new">New</button></div><div class="global-curriculum-form">${body}</div></section>`;
  }

  function listPanel(title, count, body) {
    return `<section class="global-curriculum-panel global-curriculum-panel--wide"><div class="global-curriculum-panel-heading"><div><h3>${html(title)}</h3><p>${count} records</p></div><button type="button" data-gcm-action="new">New</button></div>${body}</section>`;
  }

  function field(label, control) {
    return `<label class="global-curriculum-field"><span>${html(label)}</span>${control}</label>`;
  }

  function activeField(id, active, label = "Active") {
    return `<label class="global-curriculum-check"><input id="${attr(id)}" type="checkbox" ${active ? "checked" : ""} /><span>${html(label)}</span></label>`;
  }

  function saveButtons(action, editing) {
    return `<div class="global-curriculum-form-actions">${editing ? '<button type="button" class="global-curriculum-secondary" data-gcm-action="new">Cancel</button>' : ""}<button type="button" class="global-curriculum-primary" data-gcm-action="${attr(action)}">${editing ? "Save Changes" : "Create"}</button></div>`;
  }

  function recordList(items, id, title, subtitle, active) {
    if (!items.length) return '<p class="global-curriculum-empty-list">No records found.</p>';
    return `<div class="global-curriculum-record-list">${items.map(item => `
      <button type="button" class="global-curriculum-record-row ${active(item) ? "" : "is-inactive"}" data-gcm-action="edit" data-record-id="${attr(id(item))}">
        <span><strong>${html(title(item))}</strong><small>${html(subtitle(item))}</small></span>
        <span class="global-curriculum-record-status">${active(item) ? "Active" : "Inactive"}</span>
      </button>
    `).join("")}</div>`;
  }

  function subjectOptions(selectedId, includeId) {
    return model.data.subjects
      .filter(subject => subject.active || subject.subjectid === includeId || subject.subjectid === selectedId)
      .map(subject => `<option value="${attr(subject.subjectid)}" ${subject.subjectid === selectedId ? "selected" : ""}>${html(subject.subjectname)}${subject.active ? "" : " — inactive"}</option>`)
      .join("");
  }

  function moduleOptions(subjectId, selectedId, optional) {
    const options = sortedModules().filter(module => (
      module.subjectid === subjectId && (module.active || module.moduleid === selectedId)
    ));
    return `${optional ? '<option value="">No module</option>' : ""}${options.map(module => `<option value="${attr(module.moduleid)}" ${module.moduleid === selectedId ? "selected" : ""}>${html(module.modulename)}${module.active ? "" : " — inactive"}</option>`).join("")}`;
  }

  function taskOptions(subjectId, moduleId, selectedId) {
    const options = model.data.tasks.filter(task => (
      task.subjectid === subjectId &&
      String(task.moduleid || "") === String(moduleId || "") &&
      (task.active || task.taskid === selectedId)
    ));
    return `<option value="">No task</option>${options.map(task => `<option value="${attr(task.taskid)}" ${task.taskid === selectedId ? "selected" : ""}>${html(task.taskname)}${task.active ? "" : " — inactive"}</option>`).join("")}`;
  }

  function sortedModules() {
    return [...model.data.modules].sort((left, right) => (
      subjectName(left.subjectid).localeCompare(subjectName(right.subjectid)) ||
      Number(left.sortorder || 0) - Number(right.sortorder || 0) ||
      left.modulename.localeCompare(right.modulename)
    ));
  }

  function nextModuleSort(subjectId) {
    return Math.max(0, ...model.data.modules
      .filter(module => module.subjectid === subjectId)
      .map(module => Number(module.sortorder) || 0)) + 1;
  }

  function subjectName(subjectId) {
    return findById(model.data.subjects, "subjectid", subjectId)?.subjectname || subjectId || "Unknown subject";
  }

  function moduleName(moduleId) {
    return findById(model.data.modules, "moduleid", moduleId)?.modulename || moduleId || "";
  }

  function accountName(accountId) {
    return findById(model.data.accounts, "accountid", accountId)?.displayname || accountId || "Unknown account";
  }

  function firstActive(items, key) {
    return items.find(item => item.active)?.[key] || items[0]?.[key] || "";
  }

  function findById(items, key, id) {
    return array(items).find(item => String(item?.[key] || "") === String(id || "")) || null;
  }

  function formatDependencies(dependencies) {
    const parts = Object.entries(dependencies)
      .filter(([, count]) => Number(count) > 0)
      .map(([name, count]) => `${count} ${name}`);
    return parts.length ? ` Referenced by ${parts.join(", ")}.` : " No dependent records were found.";
  }

  function setMessage(message, type) {
    const element = document.getElementById("global-curriculum-message");
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("is-error", type === "error");
    element.classList.toggle("is-success", type === "success");
  }

  function setContent(markup) {
    const element = document.getElementById("global-curriculum-content");
    if (element) element.innerHTML = markup;
  }

  function value(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function checked(id) {
    return document.getElementById(id)?.checked === true;
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function appState() {
    return typeof state !== "undefined" && state ? state : null;
  }

  function html(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function attr(value) {
    return html(value);
  }

  window.M4LGlobalCurriculum = Object.freeze({ show, syncAccess, load });
  window.showGlobalCurriculumManagement = show;
})();
