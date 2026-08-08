/* M4L V100.4.4 - Library resource form cleanup. */
/* M4L V100.4 - ADMIN-only private Google Drive Library management UI. */
(function () {
  "use strict";

  const SCREEN_ID = "manage-resources-screen";
  const RESOURCE_TYPES = [
    { type: "EBOOK", label: "eBook" },
    { type: "VIDEO", label: "Video" },
    { type: "AUDIO", label: "Audio" },
    { type: "PRINTABLE", label: "Printable" },
    { type: "OTHER", label: "Other" }
  ];
  const stateModel = {
    view: "home",
    returnView: "add",
    options: null,
    optionsLoading: false,
    resources: [],
    filteredResources: [],
    resourcesLoading: false,
    selectedResource: null,
    drive: null,
    driveLoading: false,
    submitting: false,
    result: null,
    feedback: "",
    feedbackError: false,
    search: "",
    filters: { type: "ALL", subjectId: "ALL" },
    form: createEmptyForm()
  };
  let handlersBound = false;

  function createEmptyForm() {
    return {
      resourceType: "EBOOK",
      file: null,
      name: "",
      subjectId: "",
      moduleId: "",
      groupNo: "ALL",
      active: true
    };
  }

  function getCurrentRole() {
    return String(typeof state !== "undefined" && state && state.user ? state.user.role || "" : "")
      .trim()
      .toUpperCase();
  }

  function isAllowed() {
    return getCurrentRole() === "ADMIN";
  }

  function syncAccess() {
    const button = document.getElementById("open-manage-resources-btn");
    const allowed = isAllowed();
    if (button) {
      button.classList.toggle("hidden", !allowed);
      button.disabled = !allowed;
      button.setAttribute("aria-hidden", allowed ? "false" : "true");
    }
    return allowed;
  }

  function showManageResources() {
    if (!syncAccess()) {
      alert("Library management is available to ADMIN accounts only.");
      return false;
    }

    stateModel.view = "home";
    stateModel.result = null;
    stateModel.feedback = "";
    stateModel.feedbackError = false;
    stateModel.submitting = false;
    stateModel.selectedResource = null;
    stateModel.form = createEmptyForm();

    if (typeof showScreen !== "function" || !showScreen(SCREEN_ID)) return false;
    render();
    return true;
  }

  function bindHandlers() {
    if (handlersBound) return;
    handlersBound = true;

    document.addEventListener("click", event => {
      const actionElement = event.target && typeof event.target.closest === "function"
        ? event.target.closest("[data-manage-resource-action]")
        : null;
      if (!actionElement) return;
      const scope = actionElement.closest(`#${SCREEN_ID}, #admin-academics`);
      if (!scope) return;

      const action = actionElement.dataset.manageResourceAction || "";
      if (!action) return;
      event.preventDefault();

      if (action === "open") return showManageResources();
      if (action === "close") return showScreen("admin-academics");
      if (action === "home") return setView("home");
      if (action === "add") return openAddResource();
      if (action === "modify") return openModifyResources();
      if (action === "view-library") return showAdminResources({ force: true });
      if (action === "browse") return openDriveBrowser();
      if (action === "browse-folder") return loadDriveFolder(actionElement.dataset.folderId || "");
      if (action === "drive-breadcrumb") return loadDriveFolder(actionElement.dataset.folderId || "");
      if (action === "select-file") return selectDriveFile(actionElement.dataset.fileId || "");
      if (action === "cancel-browser") return returnFromDriveBrowser();
      if (action === "clear-file") return clearSelectedFile();
      if (action === "save-new") return saveNewResource();
      if (action === "add-another") return openAddResource();
      if (action === "resource-list") return openModifyResources();
      if (action === "select-resource") {
        return selectManagedResource(
          actionElement.dataset.resourceType || "",
          actionElement.dataset.resourceId || "",
          Number(actionElement.dataset.sheetRow || 0)
        );
      }
      if (action === "back-list") return backToManagedResourceList();
      if (action === "save-edit") return saveEditedResource();
      if (action === "refresh-list") return loadManagedResources(true);
    });

    document.addEventListener("input", event => {
      const target = event.target;
      if (!target || !target.closest(`#${SCREEN_ID}`)) return;

      if (target.id === "manage-resource-search") {
        stateModel.search = String(target.value || "");
        applyResourceFilters();
        renderManagedResourceListOnly();
        return;
      }

      if (target.id === "manage-resource-name") stateModel.form.name = String(target.value || "");
      if (target.id === "manage-resource-group") stateModel.form.groupNo = String(target.value || "");
    });

    document.addEventListener("change", event => {
      const target = event.target;
      if (!target || !target.closest(`#${SCREEN_ID}`)) return;

      if (target.id === "manage-resource-type") {
        stateModel.form.resourceType = String(target.value || "EBOOK");
        if (
          stateModel.form.file &&
          Array.isArray(stateModel.form.file.supportedTypes) &&
          !stateModel.form.file.supportedTypes.includes(stateModel.form.resourceType)
        ) {
          stateModel.form.file = null;
        }
        render();
        return;
      }

      if (target.id === "manage-resource-subject") {
        stateModel.form.subjectId = String(target.value || "");
        stateModel.form.moduleId = "";
        render();
        return;
      }

      if (target.id === "manage-resource-module") {
        stateModel.form.moduleId = String(target.value || "");
        render();
        return;
      }

      if (target.name === "manage-resource-active") {
        stateModel.form.active = target.value === "true";
        render();
        return;
      }

      if (target.id === "manage-resource-filter-type") {
        stateModel.filters.type = String(target.value || "ALL");
        applyResourceFilters();
        renderManagedResourceListOnly();
        return;
      }

      if (target.id === "manage-resource-filter-subject") {
        stateModel.filters.subjectId = String(target.value || "ALL");
        applyResourceFilters();
        renderManagedResourceListOnly();
      }
    });
  }

  function setView(view) {
    stateModel.view = view;
    stateModel.feedback = "";
    stateModel.feedbackError = false;
    render();
  }

  async function ensureOptions() {
    if (stateModel.options || stateModel.optionsLoading) return;
    stateModel.optionsLoading = true;
    render();
    try {
      const result = await apiPost("/api/admin/resources/options", {}, state.token);
      if (!result.success) throw new Error(result.error || "Unable to load Library options");
      stateModel.options = result;
    } catch (error) {
      setFeedback(error.message || "Unable to load Library options.", true);
    } finally {
      stateModel.optionsLoading = false;
      render();
    }
  }

  async function openAddResource() {
    stateModel.view = "add";
    stateModel.returnView = "add";
    stateModel.form = createEmptyForm();
    stateModel.result = null;
    stateModel.selectedResource = null;
    stateModel.submitting = false;
    stateModel.feedback = "";
    render();
    await ensureOptions();
  }

  async function openModifyResources() {
    stateModel.view = "modify-list";
    stateModel.returnView = "edit";
    stateModel.selectedResource = null;
    stateModel.feedback = "";
    render();
    await ensureOptions();
    await loadManagedResources(false);
  }

  async function loadManagedResources(force) {
    if (stateModel.resourcesLoading) return;
    if (!force && stateModel.resources.length) {
      applyResourceFilters();
      render();
      return;
    }

    stateModel.resourcesLoading = true;
    render();
    try {
      const result = await apiPost("/api/admin/resources/manage-list", {}, state.token);
      if (!result.success) throw new Error(result.error || "Unable to load resources");
      stateModel.resources = Array.isArray(result.resources) ? result.resources : [];
      applyResourceFilters();
    } catch (error) {
      setFeedback(error.message || "Unable to load resources.", true);
    } finally {
      stateModel.resourcesLoading = false;
      render();
    }
  }

  function applyResourceFilters() {
    const query = String(stateModel.search || "").trim().toLowerCase();
    stateModel.filteredResources = stateModel.resources.filter(resource => {
      if (stateModel.filters.type !== "ALL" && resource.type !== stateModel.filters.type) return false;
      if (stateModel.filters.subjectId !== "ALL" && resource.subjectid !== stateModel.filters.subjectId) return false;
      if (!query) return true;
      return [
        resource.name,
        resource.resourceid,
        resource.typeLabel,
        resource.subjectname,
        resource.modulename,
        resource.groupno,
        resource.format
      ].join(" ").toLowerCase().includes(query);
    });
  }

  function selectManagedResource(resourceType, resourceId, sheetRow) {
    const resource = stateModel.resources.find(item => (
      item.type === resourceType &&
      item.resourceid === resourceId &&
      (!sheetRow || Number(item.sheetRow) === Number(sheetRow))
    ));
    if (!resource) {
      setFeedback("Resource not found. Refresh the list and try again.", true);
      return;
    }

    stateModel.selectedResource = resource;
    stateModel.form = {
      resourceType: resource.type,
      file: resource.fileid ? {
        id: resource.fileid,
        name: resource.name,
        format: resource.format,
        supportedTypes: [resource.type],
        current: true
      } : null,
      name: resource.name || "",
      subjectId: resource.subjectid || "",
      moduleId: findModuleSelectionKey(resource.subjectid, resource.moduleid, resource.modulename),
      groupNo: resource.groupno || "ALL",
      active: resource.active !== false
    };
    stateModel.view = "edit";
    stateModel.returnView = "edit";
    stateModel.feedback = "";
    stateModel.submitting = false;
    render();
  }

  function backToManagedResourceList() {
    stateModel.selectedResource = null;
    stateModel.view = "modify-list";
    stateModel.feedback = "";
    render();
  }

  async function openDriveBrowser() {
    if (!stateModel.options) await ensureOptions();
    stateModel.returnView = stateModel.view === "edit" ? "edit" : "add";
    stateModel.view = "drive";
    stateModel.drive = null;
    stateModel.feedback = "";
    render();
    await loadDriveFolder("");
  }

  async function loadDriveFolder(folderId) {
    if (stateModel.driveLoading) return;
    stateModel.driveLoading = true;
    render();
    try {
      const result = await apiPost("/api/admin/drive/browse", { folderId }, state.token);
      if (!result.success) throw new Error(result.error || "Unable to browse Google Drive");
      stateModel.drive = result;
    } catch (error) {
      setFeedback(error.message || "Unable to browse Google Drive.", true);
    } finally {
      stateModel.driveLoading = false;
      render();
    }
  }

  function selectDriveFile(fileId) {
    const file = stateModel.drive && Array.isArray(stateModel.drive.items)
      ? stateModel.drive.items.find(item => item.id === fileId)
      : null;
    if (!file || file.isFolder) return;
    if (!Array.isArray(file.supportedTypes) || !file.supportedTypes.includes(stateModel.form.resourceType)) {
      setFeedback(`This file is not supported as ${resourceTypeLabel(stateModel.form.resourceType)}.`, true);
      return;
    }

    const isEdit = stateModel.returnView === "edit";
    stateModel.form.file = file;
    if (!isEdit || !stateModel.form.name) stateModel.form.name = stripFileExtension(file.name);
    stateModel.view = stateModel.returnView;
    stateModel.feedback = "";
    render();
  }

  function returnFromDriveBrowser() {
    stateModel.view = stateModel.returnView;
    stateModel.feedback = "";
    render();
  }

  function clearSelectedFile() {
    stateModel.form.file = null;
    render();
  }

  async function saveNewResource() {
    if (stateModel.submitting) return;
    syncFormFromDom();
    const error = validateForm(true);
    if (error) return setFeedback(error, true);

    stateModel.submitting = true;
    stateModel.feedback = "";
    render();
    try {
      const result = await apiPost("/api/admin/resources/create", buildPayload(), state.token);
      if (!result.success) throw new Error(duplicateMessage(result) || result.error || "Unable to add resource");
      stateModel.submitting = false;
      stateModel.result = result.resource;
      stateModel.view = "result";
      invalidateLibraryCache();
      render();
    } catch (error) {
      stateModel.submitting = false;
      render();
      setFeedback(error.message || "Unable to add resource.", true);
    }
  }

  async function saveEditedResource() {
    if (stateModel.submitting || !stateModel.selectedResource) return;
    syncFormFromDom();
    const error = validateForm(false);
    if (error) return setFeedback(error, true);

    stateModel.submitting = true;
    stateModel.feedback = "";
    render();
    try {
      const result = await apiPost("/api/admin/resources/update", {
        ...buildPayload(),
        resourceId: stateModel.selectedResource.resourceid,
        sheetRow: stateModel.selectedResource.sheetRow
      }, state.token);
      if (!result.success) throw new Error(duplicateMessage(result) || result.error || "Unable to update resource");
      stateModel.submitting = false;
      replaceManagedResource(result.resource);
      stateModel.selectedResource = result.resource;
      stateModel.form.file = result.resource.fileid ? {
        id: result.resource.fileid,
        name: result.resource.name,
        format: result.resource.format,
        supportedTypes: [result.resource.type],
        current: true
      } : null;
      invalidateLibraryCache();
      render();
      setFeedback(result.message || "Resource updated.", false);
    } catch (error) {
      stateModel.submitting = false;
      render();
      setFeedback(error.message || "Unable to update resource.", true);
    }
  }

  function replaceManagedResource(resource) {
    stateModel.resources = stateModel.resources.map(item => (
      item.type === resource.type && item.resourceid === resource.resourceid ? resource : item
    ));
    applyResourceFilters();
  }

  function buildPayload() {
    return {
      resourceType: stateModel.form.resourceType,
      fileId: stateModel.form.file ? stateModel.form.file.id : "",
      name: stateModel.form.name.trim(),
      subjectId: stateModel.form.subjectId,
      moduleKey: stateModel.form.moduleId,
      groupNo: stateModel.form.groupNo.trim() || "ALL",
      active: stateModel.form.active
    };
  }

  function validateForm(requireFile) {
    if (requireFile && !stateModel.form.file) return "Select a Google Drive file.";
    if (!stateModel.form.name.trim()) return "Enter a resource name.";
    if (!stateModel.form.subjectId) return "Choose a subject.";
    if (!stateModel.form.groupNo.trim()) return "Enter ALL or a group number.";
    return "";
  }

  function syncFormFromDom() {
    const name = document.getElementById("manage-resource-name");
    const group = document.getElementById("manage-resource-group");
    if (name) stateModel.form.name = String(name.value || "");
    if (group) stateModel.form.groupNo = String(group.value || "");
  }

  function render() {
    const content = document.getElementById("manage-resources-content");
    if (!content) return;

    let markup = "";
    if (stateModel.view === "home") markup = renderHome();
    if (stateModel.view === "add") markup = renderResourceForm(false);
    if (stateModel.view === "edit") markup = renderResourceForm(true);
    if (stateModel.view === "modify-list") markup = renderModifyList();
    if (stateModel.view === "drive") markup = renderDriveBrowser();
    if (stateModel.view === "result") markup = renderResult();

    content.innerHTML = `${markup}${renderFeedback()}`;
  }

  function renderHome() {
    return `
      <div class="manage-resource-home-grid">
        <button type="button" class="manage-resource-home-card" data-manage-resource-action="add">
          <strong>Add Resource</strong>
          <span>Browse the private M4L Google folder and add a Library item.</span>
        </button>
        <button type="button" class="manage-resource-home-card" data-manage-resource-action="modify">
          <strong>Modify Resource</strong>
          <span>Edit the file, subject, module, group, or active status.</span>
        </button>
        <button type="button" class="manage-resource-home-card" data-manage-resource-action="view-library">
          <strong>View Library</strong>
          <span>Open the current student-facing Library.</span>
        </button>
      </div>
    `;
  }

  function renderResourceForm(isEdit) {
    if (stateModel.optionsLoading && !stateModel.options) {
      return '<p class="helper-text">Loading Library options...</p>';
    }
    if (!stateModel.options) {
      return `
        <p class="helper-text">Library options are unavailable.</p>
        <div class="student-admin-action-grid"><button type="button" data-manage-resource-action="${isEdit ? "modify" : "add"}">Retry</button></div>
      `;
    }

    const subject = getSelectedSubject();
    const file = stateModel.form.file;
    const selectedFileMarkup = file ? `
      <div class="manage-resource-selected-file">
        <div>
          <strong>${escapeHtml(file.name || stateModel.form.name || "Drive file")}</strong>
          <small>${escapeHtml(file.format || "FILE")} · Private Google Drive</small>
        </div>
        <button type="button" data-manage-resource-action="browse">Change</button>
      </div>
    ` : `
      <button type="button" class="manage-resource-drive-button" data-manage-resource-action="browse">
        Browse Shared Google Folder
      </button>
    `;

    return `
      <div class="manage-resource-toolbar">
        <button type="button" class="small-btn" data-manage-resource-action="${isEdit ? "back-list" : "home"}">Back</button>
        <strong>${isEdit ? "Modify Resource" : "Add Resource"}</strong>
      </div>
      <section class="student-admin-card manage-resource-form-card">
        <label class="student-admin-label" for="manage-resource-type">Resource type</label>
        <select id="manage-resource-type" ${isEdit ? "disabled" : ""}>
          ${RESOURCE_TYPES.map(item => `<option value="${item.type}" ${stateModel.form.resourceType === item.type ? "selected" : ""}>${item.label}</option>`).join("")}
        </select>

        <label class="student-admin-label">Google Drive file</label>
        ${selectedFileMarkup}

        <label class="student-admin-label" for="manage-resource-name">Resource name</label>
        <input id="manage-resource-name" type="text" value="${escapeAttribute(stateModel.form.name)}" autocomplete="off" />

        <label class="student-admin-label" for="manage-resource-subject">Subject</label>
        <select id="manage-resource-subject">
          <option value="">Choose subject</option>
          ${stateModel.options.subjects.map(item => `<option value="${escapeAttribute(item.subjectid)}" ${stateModel.form.subjectId === item.subjectid ? "selected" : ""}>${escapeHtml(item.subjectname)}</option>`).join("")}
        </select>

        <label class="student-admin-label" for="manage-resource-module">Module</label>
        <select id="manage-resource-module" ${subject ? "" : "disabled"}>
          <option value="">No module</option>
          ${(subject ? subject.modules : []).map(item => {
            const selectionKey = item.modulekey || item.moduleid;
            return `<option value="${escapeAttribute(selectionKey)}" ${stateModel.form.moduleId === selectionKey ? "selected" : ""}>${escapeHtml(item.modulename)}</option>`;
          }).join("")}
        </select>


        <label class="student-admin-label" for="manage-resource-group">Available to</label>
        <input id="manage-resource-group" type="text" value="${escapeAttribute(stateModel.form.groupNo)}" autocomplete="off" placeholder="ALL or group number" />


        <div class="student-admin-label">Status</div>
        <div class="student-edit-status-radio-group">
          <label class="student-edit-status-radio ${stateModel.form.active ? "is-selected" : ""}">
            <input type="radio" name="manage-resource-active" value="true" ${stateModel.form.active ? "checked" : ""} />
            <span>Active</span>
          </label>
          <label class="student-edit-status-radio ${stateModel.form.active ? "" : "is-selected"}">
            <input type="radio" name="manage-resource-active" value="false" ${stateModel.form.active ? "" : "checked"} />
            <span>Inactive</span>
          </label>
        </div>
      </section>
      <div class="student-admin-action-grid">
        <button type="button" data-manage-resource-action="${isEdit ? "save-edit" : "save-new"}" ${stateModel.submitting ? "disabled" : ""}>
          ${stateModel.submitting ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "Save Changes" : "Add Resource")}
        </button>
      </div>
    `;
  }

  function renderModifyList() {
    const subjectOptions = stateModel.options && Array.isArray(stateModel.options.subjects)
      ? stateModel.options.subjects
      : [];
    return `
      <div class="manage-resource-toolbar">
        <button type="button" class="small-btn" data-manage-resource-action="home">Back</button>
        <strong>Modify Resource</strong>
      </div>
      <section class="student-admin-card manage-resource-filter-card">
        <label class="student-admin-label" for="manage-resource-search">Search</label>
        <input id="manage-resource-search" type="search" value="${escapeAttribute(stateModel.search)}" autocomplete="off" placeholder="Name, ID, subject, module, or group" />
        <div class="manage-resource-filter-grid">
          <label>
            <span>Type</span>
            <select id="manage-resource-filter-type">
              <option value="ALL">All types</option>
              ${RESOURCE_TYPES.map(item => `<option value="${item.type}" ${stateModel.filters.type === item.type ? "selected" : ""}>${item.label}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Subject</span>
            <select id="manage-resource-filter-subject">
              <option value="ALL">All subjects</option>
              ${subjectOptions.map(item => `<option value="${escapeAttribute(item.subjectid)}" ${stateModel.filters.subjectId === item.subjectid ? "selected" : ""}>${escapeHtml(item.subjectname)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="student-admin-action-grid compact-actions">
          <button type="button" data-manage-resource-action="refresh-list" ${stateModel.resourcesLoading ? "disabled" : ""}>${stateModel.resourcesLoading ? "Loading..." : "Refresh List"}</button>
        </div>
      </section>
      <div id="manage-resource-list" class="managed-resource-list">${renderManagedResourceList()}</div>
    `;
  }

  function renderManagedResourceList() {
    if (stateModel.resourcesLoading && !stateModel.resources.length) {
      return '<p class="helper-text">Loading resources...</p>';
    }
    if (!stateModel.filteredResources.length) {
      return '<p class="helper-text">No matching resources found.</p>';
    }

    return stateModel.filteredResources.map(resource => `
      <button type="button" class="student-search-card managed-resource-row" data-manage-resource-action="select-resource" data-resource-type="${escapeAttribute(resource.type)}" data-resource-id="${escapeAttribute(resource.resourceid)}" data-sheet-row="${escapeAttribute(resource.sheetRow)}">
        <span class="managed-resource-type">${escapeHtml(resource.typeLabel || resource.type)}</span>
        <span class="student-search-main">
          <strong>${escapeHtml(resource.name)}</strong>
          <small>${escapeHtml(resource.subjectname || "Unassigned")}${resource.modulename ? ` · ${escapeHtml(resource.modulename)}` : ""} · ${escapeHtml(resource.groupno || "ALL")}</small>
        </span>
        <span class="student-status-badge ${resource.active ? "is-active" : "is-inactive"}">${resource.active ? "Active" : "Inactive"}</span>
      </button>
    `).join("");
  }

  function renderManagedResourceListOnly() {
    const list = document.getElementById("manage-resource-list");
    if (list) list.innerHTML = renderManagedResourceList();
  }

  function renderDriveBrowser() {
    const typeLabel = resourceTypeLabel(stateModel.form.resourceType);
    const breadcrumbs = stateModel.drive && Array.isArray(stateModel.drive.breadcrumbs)
      ? stateModel.drive.breadcrumbs
      : [];
    const items = stateModel.drive && Array.isArray(stateModel.drive.items)
      ? stateModel.drive.items
      : [];

    return `
      <div class="manage-resource-toolbar">
        <button type="button" class="small-btn" data-manage-resource-action="cancel-browser">Back</button>
        <strong>Choose ${escapeHtml(typeLabel)} File</strong>
      </div>
      <nav class="manage-drive-breadcrumbs" aria-label="Google Drive folder path">
        ${breadcrumbs.map((item, index) => `
          ${index ? '<span aria-hidden="true">›</span>' : ""}
          <button type="button" data-manage-resource-action="drive-breadcrumb" data-folder-id="${escapeAttribute(item.id)}">${escapeHtml(item.name)}</button>
        `).join("")}
      </nav>
      <div class="manage-drive-list">
        ${stateModel.driveLoading && !stateModel.drive ? '<p class="helper-text">Loading Google Drive...</p>' : ""}
        ${!stateModel.driveLoading && !items.length ? '<p class="helper-text">This folder is empty.</p>' : ""}
        ${items.map(item => renderDriveItem(item)).join("")}
      </div>
    `;
  }

  function renderDriveItem(item) {
    if (item.isFolder) {
      return `
        <button type="button" class="manage-drive-item is-folder" data-manage-resource-action="browse-folder" data-folder-id="${escapeAttribute(item.id)}">
          <span class="manage-drive-icon" aria-hidden="true">📁</span>
          <span><strong>${escapeHtml(item.name)}</strong><small>Folder</small></span>
        </button>
      `;
    }

    const supported = Array.isArray(item.supportedTypes) && item.supportedTypes.includes(stateModel.form.resourceType);
    const reason = item.isGoogleNative
      ? "Google-native files are not supported"
      : (supported ? `${item.format || "FILE"}${item.size ? ` · ${formatBytes(item.size)}` : ""}` : `Not supported as ${resourceTypeLabel(stateModel.form.resourceType)}`);
    return `
      <button type="button" class="manage-drive-item ${supported ? "" : "is-disabled"}" data-manage-resource-action="select-file" data-file-id="${escapeAttribute(item.id)}" ${supported ? "" : "disabled"}>
        <span class="manage-drive-icon" aria-hidden="true">📄</span>
        <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(reason)}</small></span>
      </button>
    `;
  }

  function renderResult() {
    const resource = stateModel.result || {};
    return `
      <section class="student-admin-result-card manage-resource-result-card">
        <div class="student-admin-card-title">Resource Added</div>
        <p><strong>${escapeHtml(resource.name || "Resource")}</strong></p>
        <p class="student-admin-help">${escapeHtml(resource.typeLabel || resource.type || "Resource")} · ${escapeHtml(resource.subjectname || "")}${resource.modulename ? ` · ${escapeHtml(resource.modulename)}` : ""}</p>
        <div class="student-admin-action-grid">
          <button type="button" data-manage-resource-action="add-another">Add Another Resource</button>
          <button type="button" data-manage-resource-action="view-library">Return to Library</button>
        </div>
      </section>
    `;
  }

  function renderFeedback() {
    if (!stateModel.feedback) return '<div id="manage-resources-feedback" class="student-admin-feedback"></div>';
    return `<div id="manage-resources-feedback" class="student-admin-feedback ${stateModel.feedbackError ? "is-error" : ""}">${escapeHtml(stateModel.feedback)}</div>`;
  }

  function setFeedback(message, isError) {
    stateModel.feedback = String(message || "");
    stateModel.feedbackError = isError === true;
    const element = document.getElementById("manage-resources-feedback");
    if (element) {
      element.textContent = stateModel.feedback;
      element.classList.toggle("is-error", stateModel.feedbackError);
    }
  }

  function getSelectedSubject() {
    return stateModel.options && Array.isArray(stateModel.options.subjects)
      ? stateModel.options.subjects.find(item => item.subjectid === stateModel.form.subjectId) || null
      : null;
  }

  function getSelectedModule(subject) {
    if (!subject || !stateModel.form.moduleId) return null;
    return subject.modules.find(item => (
      (item.modulekey || item.moduleid) === stateModel.form.moduleId ||
      item.moduleid === stateModel.form.moduleId
    )) || null;
  }

  function findModuleSelectionKey(subjectId, moduleId, moduleName) {
    const subject = stateModel.options && Array.isArray(stateModel.options.subjects)
      ? stateModel.options.subjects.find(item => item.subjectid === subjectId)
      : null;
    if (!subject) return "";
    const cleanModuleId = String(moduleId || "").trim();
    const cleanModuleName = String(moduleName || "").trim().toLowerCase();
    const match = subject.modules.find(item => (
      (cleanModuleId && item.moduleid === cleanModuleId) ||
      (cleanModuleName && String(item.modulename || "").trim().toLowerCase() === cleanModuleName)
    ));
    return match ? (match.modulekey || match.moduleid) : "";
  }

  function duplicateMessage(result) {
    if (!result || result.code !== "DUPLICATE_DRIVE_RESOURCE") return "";
    const existing = result.resource || {};
    return `This Drive file is already in the Library${existing.name ? ` as “${existing.name}”` : ""}.`;
  }

  function invalidateLibraryCache() {
    if (window.M4LResources && typeof window.M4LResources.invalidateCache === "function") {
      window.M4LResources.invalidateCache();
      return;
    }
    if (window.M4LCache && typeof window.M4LCache.remove === "function") {
      window.M4LCache.remove("resources:list:v2", { scope: "shared" });
    }
  }

  function resourceTypeLabel(type) {
    return RESOURCE_TYPES.find(item => item.type === type)?.label || "Resource";
  }

  function stripFileExtension(name) {
    return String(name || "").replace(/\.[^.]+$/, "") || String(name || "");
  }

  function formatBytes(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return "";
    if (number < 1024) return `${number} B`;
    if (number < 1024 * 1024) return `${(number / 1024).toFixed(1)} KB`;
    if (number < 1024 * 1024 * 1024) return `${(number / (1024 * 1024)).toFixed(1)} MB`;
    return `${(number / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  window.M4LManageResources = {
    show: showManageResources,
    syncAccess,
    reload: () => loadManagedResources(true)
  };
  window.showManageResources = showManageResources;

  function initialiseManageResources() {
    bindHandlers();
    syncAccess();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseManageResources, { once: true });
  } else {
    initialiseManageResources();
  }
})();
