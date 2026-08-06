/* M4L V100.3 - ADMIN-only Admin account management. */
(function () {
  "use strict";

  const SCREEN_ID = "manage-admins-screen";
  const manageAdminsState = {
    mode: "register",
    admins: [],
    filteredAdmins: [],
    selectedAdmin: null,
    loading: false,
    submitting: false,
    registeredAdmin: null
  };
  let handlersBound = false;

  function getCurrentRole() {
    return String(typeof state !== "undefined" && state && state.user ? state.user.role || "" : "")
      .trim()
      .toUpperCase();
  }

  function isAllowed() {
    return getCurrentRole() === "ADMIN";
  }

  function syncAccess() {
    const button = document.getElementById("open-manage-admins-btn");
    const allowed = isAllowed();

    if (button) {
      button.classList.toggle("hidden", !allowed);
      button.disabled = !allowed;
      button.setAttribute("aria-hidden", allowed ? "false" : "true");
    }

    return allowed;
  }

  function showManageAdmins() {
    if (!syncAccess()) {
      alert("Admin account management is available to ADMIN accounts only.");
      return false;
    }

    manageAdminsState.mode = "register";
    manageAdminsState.selectedAdmin = null;
    manageAdminsState.registeredAdmin = null;
    manageAdminsState.submitting = false;

    if (typeof showScreen !== "function" || !showScreen(SCREEN_ID)) return false;
    bindHandlers();
    render();
    return true;
  }

  function bindHandlers() {
    if (handlersBound) return;
    handlersBound = true;

    document.addEventListener("click", async (event) => {
      const actionEl = event.target && typeof event.target.closest === "function"
        ? event.target.closest("[data-manage-admin-action]")
        : null;
      if (!actionEl) return;

      const scope = actionEl.closest(`#${SCREEN_ID}, #admin-academics`);
      if (!scope) return;

      const action = actionEl.dataset.manageAdminAction || "";
      if (!action) return;
      event.preventDefault();

      if (action === "open") return showManageAdmins();
      if (action === "close") return showScreen("admin-academics");
      if (action === "mode") return setMode(actionEl.dataset.mode || "register");
      if (action === "register") return registerAdmin();
      if (action === "load") return loadAdmins(true);
      if (action === "select") return selectAdmin(actionEl.dataset.adminid || "");
      if (action === "back-list") return backToList();
      if (action === "save") return saveAdmin();
      if (action === "reset-pin") return resetAdminPin();
      if (action === "copy-link") return copyText(actionEl.dataset.loginUrl || "");
      if (action === "register-another") {
        manageAdminsState.registeredAdmin = null;
        render();
      }
    });

    document.addEventListener("input", (event) => {
      if (event.target && event.target.id === "admin-account-search") {
        filterAdmins(event.target.value);
      }
    });
  }

  function setMode(mode) {
    manageAdminsState.mode = mode === "modify" ? "modify" : "register";
    manageAdminsState.selectedAdmin = null;
    manageAdminsState.registeredAdmin = null;
    render();
    if (manageAdminsState.mode === "modify") loadAdmins(false);
  }

  function render() {
    const content = document.getElementById("manage-admins-content");
    if (!content) return;

    const registerMode = manageAdminsState.mode === "register";
    content.innerHTML = `
      <div class="student-admin-mode-toggle" role="tablist" aria-label="Admin management mode">
        <button type="button" class="student-admin-mode-btn ${registerMode ? "is-active" : ""}" data-manage-admin-action="mode" data-mode="register">Register</button>
        <button type="button" class="student-admin-mode-btn ${registerMode ? "" : "is-active"}" data-manage-admin-action="mode" data-mode="modify">Modify</button>
      </div>
      ${registerMode ? renderRegisterPanel() : renderModifyPanel()}
    `;
  }

  function renderRegisterPanel() {
    if (manageAdminsState.registeredAdmin) {
      const admin = manageAdminsState.registeredAdmin;
      const loginUrl = buildAdminLoginUrl(admin.uniqueid);
      return `
        <section class="student-admin-result-card">
          <div class="student-admin-card-title">Admin Created</div>
          <p><strong>${escapeHtml(admin.username)}</strong></p>
          <p class="student-admin-help">${escapeHtml(admin.role)} · Group ${escapeHtml(admin.assignedgroup)}</p>
          <div class="student-link-box student-icon-field">
            <span class="student-link-text">${escapeHtml(loginUrl)}</span>
            <button type="button" class="student-copy-icon-btn" data-manage-admin-action="copy-link" data-login-url="${escapeAttribute(loginUrl)}" aria-label="Copy admin login link" title="Copy link">
              <img class="student-copy-icon" src="/icons/copy.svg?v=100.3.0" alt="" aria-hidden="true" />
            </button>
          </div>
          <p class="student-admin-help">The new admin creates and confirms a four-digit PIN when opening this link.</p>
          <div class="student-admin-action-grid">
            <button type="button" data-manage-admin-action="register-another">Register Another Admin</button>
          </div>
        </section>
      `;
    }

    return `
      <section class="student-admin-card">
        <div class="student-admin-card-title">Register Admin</div>
        <label class="student-admin-label" for="admin-register-name">Name</label>
        <input id="admin-register-name" type="text" autocomplete="off" placeholder="Admin name" />

        <label class="student-admin-label" for="admin-register-role">Role</label>
        <select id="admin-register-role">
          <option value="TEACHER">TEACHER</option>
          <option value="SENIOR">SENIOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <label class="student-admin-label" for="admin-register-group">Assigned Group</label>
        <input id="admin-register-group" type="text" value="ALL" autocomplete="off" placeholder="ALL or group number" />
        <p class="student-admin-help">Only ADMIN accounts can create or modify AdminRecords.</p>
      </section>
      <div class="student-admin-action-grid">
        <button type="button" data-manage-admin-action="register" ${manageAdminsState.submitting ? "disabled" : ""}>${manageAdminsState.submitting ? "Registering..." : "Register Admin"}</button>
      </div>
      <div id="manage-admins-feedback" class="student-admin-feedback"></div>
    `;
  }

  function renderModifyPanel() {
    if (manageAdminsState.selectedAdmin) return renderEditPanel(manageAdminsState.selectedAdmin);

    return `
      <section class="student-admin-card student-search-panel">
        <div class="student-admin-card-title">Modify Admin</div>
        <label class="student-admin-label" for="admin-account-search">Search</label>
        <input id="admin-account-search" type="search" autocomplete="off" placeholder="Name, ID, role, or group" />
        <div class="student-admin-action-grid compact-actions">
          <button type="button" data-manage-admin-action="load" ${manageAdminsState.loading ? "disabled" : ""}>${manageAdminsState.loading ? "Loading..." : "Refresh Admin List"}</button>
        </div>
        <p class="student-admin-help">Role, group, active status, and PIN changes invalidate affected sessions on the next authenticated request.</p>
      </section>
      <div id="manage-admins-list" class="managed-admin-list">${renderAdminList()}</div>
      <div id="manage-admins-feedback" class="student-admin-feedback"></div>
    `;
  }

  function renderAdminList() {
    if (manageAdminsState.loading && manageAdminsState.admins.length === 0) {
      return '<p class="helper-text">Loading AdminRecords...</p>';
    }

    const admins = manageAdminsState.filteredAdmins;
    if (!admins.length) {
      return '<p class="helper-text">No admin accounts found.</p>';
    }

    return admins.map((admin) => `
      <button type="button" class="student-search-card managed-admin-row" data-manage-admin-action="select" data-adminid="${escapeAttribute(admin.adminid)}">
        <span class="managed-admin-role">${escapeHtml(admin.role)}</span>
        <span class="student-search-main">
          <strong>${escapeHtml(admin.username)}${admin.isSelf ? " (You)" : ""}</strong>
          <small>${escapeHtml(admin.adminid)} · Group ${escapeHtml(admin.assignedgroup)}</small>
        </span>
        <span class="student-status-badge ${admin.active ? "is-active" : "is-inactive"}">${admin.active ? "Active" : "Inactive"}</span>
      </button>
    `).join("");
  }

  function renderEditPanel(admin) {
    const selfNote = admin.isSelf
      ? '<p class="student-admin-help admin-self-note">For safety, you can change only your own display name here.</p>'
      : '';
    const securityDisabled = admin.isSelf ? "disabled" : "";

    return `
      <section class="student-admin-card">
        <div class="selected-student-heading compact-selected-student-heading">
          <div><strong>${escapeHtml(admin.username)}</strong><small>${escapeHtml(admin.adminid)} · ${escapeHtml(admin.role)}</small></div>
        </div>
        ${selfNote}
        <label class="student-admin-label" for="admin-edit-name">Name</label>
        <input id="admin-edit-name" class="student-prefilled-input" type="text" value="${escapeAttribute(admin.username)}" />

        <label class="student-admin-label" for="admin-edit-role">Role</label>
        <select id="admin-edit-role" ${securityDisabled}>
          ${["ADMIN", "SENIOR", "TEACHER"].map(role => `<option value="${role}" ${admin.role === role ? "selected" : ""}>${role}</option>`).join("")}
        </select>

        <label class="student-admin-label" for="admin-edit-group">Assigned Group</label>
        <input id="admin-edit-group" class="student-prefilled-input" type="text" value="${escapeAttribute(admin.assignedgroup)}" ${securityDisabled} />

        <div class="student-admin-label">Status</div>
        <div class="student-edit-status-radio-group">
          <label class="student-edit-status-radio ${admin.active ? "is-selected" : ""}">
            <input type="radio" name="admin-edit-active" value="true" ${admin.active ? "checked" : ""} ${securityDisabled} />
            <span>Active</span>
          </label>
          <label class="student-edit-status-radio ${admin.active ? "" : "is-selected"}">
            <input type="radio" name="admin-edit-active" value="false" ${admin.active ? "" : "checked"} ${securityDisabled} />
            <span>Inactive</span>
          </label>
        </div>
      </section>
      <div class="student-admin-action-grid two-col">
        <button type="button" data-manage-admin-action="back-list">Back to List</button>
        <button type="button" data-manage-admin-action="save" ${manageAdminsState.submitting ? "disabled" : ""}>${manageAdminsState.submitting ? "Saving..." : "Save"}</button>
      </div>
      ${admin.isSelf ? "" : `
        <div class="student-admin-action-grid">
          <button type="button" class="admin-danger-action" data-manage-admin-action="reset-pin" ${manageAdminsState.submitting ? "disabled" : ""}>Reset PIN</button>
        </div>
      `}
      <div class="student-link-box student-icon-field">
        <span class="student-link-text">${escapeHtml(buildAdminLoginUrl(admin.uniqueid))}</span>
        <button type="button" class="student-copy-icon-btn" data-manage-admin-action="copy-link" data-login-url="${escapeAttribute(buildAdminLoginUrl(admin.uniqueid))}" aria-label="Copy admin login link" title="Copy link">
          <img class="student-copy-icon" src="/icons/copy.svg?v=100.3.0" alt="" aria-hidden="true" />
        </button>
      </div>
      <div id="manage-admins-feedback" class="student-admin-feedback"></div>
    `;
  }

  async function registerAdmin() {
    if (manageAdminsState.submitting) return;
    const username = value("admin-register-name");
    const role = value("admin-register-role");
    const assignedgroup = value("admin-register-group");

    if (!username || !assignedgroup) return setFeedback("Enter the admin name and assigned group.", true);

    manageAdminsState.submitting = true;
    render();
    try {
      const result = await apiPost("/api/admin/register-admin", { username, role, assignedgroup }, state.token);
      if (!result.success) throw new Error(result.error || "Unable to register admin");
      manageAdminsState.registeredAdmin = result.admin;
      manageAdminsState.admins = [];
      manageAdminsState.filteredAdmins = [];
      render();
    } catch (error) {
      manageAdminsState.submitting = false;
      render();
      setFeedback(error.message || "Unable to register admin.", true);
    }
  }

  async function loadAdmins(force) {
    if (manageAdminsState.loading) return;
    if (!force && manageAdminsState.admins.length) {
      filterAdmins("");
      return;
    }

    manageAdminsState.loading = true;
    render();
    try {
      const result = await apiPost("/api/admin/admins/search", { listAll: true }, state.token);
      if (!result.success) throw new Error(result.error || "Unable to load admins");
      manageAdminsState.admins = Array.isArray(result.admins) ? result.admins : [];
      manageAdminsState.filteredAdmins = manageAdminsState.admins.slice();
    } catch (error) {
      manageAdminsState.admins = [];
      manageAdminsState.filteredAdmins = [];
      setTimeout(() => setFeedback(error.message || "Unable to load admins.", true), 0);
    } finally {
      manageAdminsState.loading = false;
      render();
    }
  }

  function filterAdmins(query) {
    const text = String(query || "").trim().toLowerCase();
    manageAdminsState.filteredAdmins = !text
      ? manageAdminsState.admins.slice()
      : manageAdminsState.admins.filter(admin => `${admin.username} ${admin.adminid} ${admin.role} ${admin.assignedgroup}`.toLowerCase().includes(text));
    const list = document.getElementById("manage-admins-list");
    if (list) list.innerHTML = renderAdminList();
  }

  function selectAdmin(adminid) {
    manageAdminsState.selectedAdmin = manageAdminsState.admins.find(admin => admin.adminid === adminid) || null;
    render();
  }

  function backToList() {
    manageAdminsState.selectedAdmin = null;
    render();
  }

  async function saveAdmin() {
    const admin = manageAdminsState.selectedAdmin;
    if (!admin || manageAdminsState.submitting) return;

    const payload = { adminid: admin.adminid, username: value("admin-edit-name") };
    if (!payload.username) return setFeedback("Admin name cannot be empty.", true);

    if (!admin.isSelf) {
      payload.role = value("admin-edit-role");
      payload.assignedgroup = value("admin-edit-group");
      const active = document.querySelector('input[name="admin-edit-active"]:checked');
      payload.active = !active || active.value === "true";
    }

    manageAdminsState.submitting = true;
    render();
    try {
      const result = await apiPost("/api/admin/update-admin", payload, state.token);
      if (!result.success) throw new Error(result.error || "Unable to update admin");
      replaceAdmin(result.admin);
      manageAdminsState.selectedAdmin = result.admin;
      manageAdminsState.submitting = false;
      render();
      setFeedback(result.message || "Admin updated.", false);
    } catch (error) {
      manageAdminsState.submitting = false;
      render();
      setFeedback(error.message || "Unable to update admin.", true);
    }
  }

  async function resetAdminPin() {
    const admin = manageAdminsState.selectedAdmin;
    if (!admin || admin.isSelf || manageAdminsState.submitting) return;
    if (!confirm(`Reset the PIN for ${admin.username}? Their existing sessions will stop working.`)) return;

    manageAdminsState.submitting = true;
    render();
    try {
      const result = await apiPost("/api/admin/reset-admin-pin", { adminid: admin.adminid }, state.token);
      if (!result.success) throw new Error(result.error || "Unable to reset PIN");
      const updated = { ...admin, pinsetup: false };
      replaceAdmin(updated);
      manageAdminsState.selectedAdmin = updated;
      manageAdminsState.submitting = false;
      render();
      setFeedback(result.message || "Admin PIN reset.", false);
    } catch (error) {
      manageAdminsState.submitting = false;
      render();
      setFeedback(error.message || "Unable to reset PIN.", true);
    }
  }

  function replaceAdmin(admin) {
    manageAdminsState.admins = manageAdminsState.admins.map(item => item.adminid === admin.adminid ? admin : item);
    manageAdminsState.filteredAdmins = manageAdminsState.filteredAdmins.map(item => item.adminid === admin.adminid ? admin : item);
  }

  function buildAdminLoginUrl(uniqueid) {
    return `${window.location.origin}/admin/${encodeURIComponent(String(uniqueid || ""))}`;
  }

  async function copyText(text) {
    const valueToCopy = String(text || "");
    if (!valueToCopy) return;
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setFeedback("Admin login link copied.", false);
    } catch (error) {
      const input = document.createElement("textarea");
      input.value = valueToCopy;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      setFeedback("Admin login link copied.", false);
    }
  }

  function value(id) {
    const element = document.getElementById(id);
    return element ? String(element.value || "").trim() : "";
  }

  function setFeedback(message, isError) {
    const element = document.getElementById("manage-admins-feedback");
    if (!element) return;
    element.textContent = String(message || "");
    element.classList.toggle("is-error", isError === true);
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

  window.M4LManageAdmins = {
    show: showManageAdmins,
    syncAccess,
    load: loadAdmins
  };
  window.showManageAdmins = showManageAdmins;

 function initialiseManageAdmins() {
  bindHandlers();
  syncAccess();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialiseManageAdmins,
    { once: true }
  );
} else {
  initialiseManageAdmins();
}
})();
