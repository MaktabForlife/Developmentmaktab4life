/* M4L V102.7 - ADMIN settings, Platform validation and account migration. */
(function () {
  "use strict";

  const SCREEN_ID = "system-settings-screen";
  let handlersBound = false;
  let loading = false;
  let accountMigrationPreview = null;

  function getActiveAdminRole() {
    if (typeof state === "undefined" || !state || !state.user) return "";
    return String(state.user.role || "").trim().toUpperCase();
  }

  function isSystemSettingsAdmin() {
    return getActiveAdminRole() === "ADMIN";
  }

  function syncSystemSettingsAccess() {
    const button = document.getElementById("open-system-settings-btn");
    const allowed = isSystemSettingsAdmin();

    if (button) {
      button.classList.toggle("hidden", !allowed);
      button.disabled = !allowed;
      button.setAttribute("aria-hidden", allowed ? "false" : "true");
    }

    return allowed;
  }

  async function showSystemSettings() {
    if (!syncSystemSettingsAccess()) {
      alert("System Settings are available to ADMIN accounts only.");
      return false;
    }

    if (typeof showScreen !== "function" || !showScreen(SCREEN_ID)) {
      return false;
    }

    await loadSystemSettings();
    return true;
  }

  async function loadSystemSettings() {
    if (loading || !isSystemSettingsAdmin()) return false;

    loading = true;
    setSystemSettingsBusy(true);
    setSystemSettingsMessage("Loading settings...", "loading");

    try {
      const result = await postSystemSettings("/api/admin/system-settings/get", {});

      if (!result.success) {
        throw new Error(result.error || "Unable to load System Settings");
      }

      renderSystemSettings(result.settings || {});

      const configured = result.settings && result.settings.configured
        ? result.settings.configured
        : {};
      const allConfigured = configured.studentLoginBaseUrl === true &&
        configured.weeklyPlannerDriveFolderId === true &&
        configured.weeklyPlannerDriveFolderLabel === true &&
        configured.globalZoomLink === true;

      setSystemSettingsMessage(
        allConfigured
          ? "Settings loaded from SystemConfig."
          : "Complete and save these settings to store them in SystemConfig.",
        allConfigured ? "success" : "warning"
      );
      return true;
    } catch (error) {
      console.error("Could not load System Settings", error);
      setSystemSettingsMessage(
        error && error.message ? error.message : "Unable to load System Settings.",
        "error"
      );
      return false;
    } finally {
      loading = false;
      setSystemSettingsBusy(false);
    }
  }

  async function saveSystemSettings() {
    if (loading || !isSystemSettingsAdmin()) return false;

    const studentLoginBaseUrl = getInputValue("system-settings-student-login-url");
    const weeklyPlannerDriveFolder = getInputValue("system-settings-drive-folder");
    const weeklyPlannerDriveFolderLabel = getInputValue("system-settings-drive-label");
    const globalZoomLink = getInputValue("system-settings-global-zoom-link");

    if (!studentLoginBaseUrl || !weeklyPlannerDriveFolder) {
      setSystemSettingsMessage(
        "Enter the Student login URL and Weekly Planner Google Drive folder.",
        "error"
      );
      return false;
    }

    loading = true;
    setSystemSettingsBusy(true);
    setSystemSettingsMessage("Saving settings...", "loading");

    try {
      const result = await postSystemSettings("/api/admin/system-settings/save", {
        studentLoginBaseUrl,
        weeklyPlannerDriveFolder,
        weeklyPlannerDriveFolderLabel,
        globalZoomLink
      });

      if (!result.success) {
        throw new Error(result.error || "Unable to save System Settings");
      }

      renderSystemSettings(result.settings || {});
      setSystemSettingsMessage("System Settings saved.", "success");
      return true;
    } catch (error) {
      console.error("Could not save System Settings", error);
      setSystemSettingsMessage(
        error && error.message ? error.message : "Unable to save System Settings.",
        "error"
      );
      return false;
    } finally {
      loading = false;
      setSystemSettingsBusy(false);
    }
  }

  async function validatePlatformSheet() {
    if (loading || !isSystemSettingsAdmin()) return false;

    loading = true;
    setSystemSettingsBusy(true);
    setPlatformValidationMessage("Validating Platform Sheet...", "loading");

    try {
      const result = await postSystemSettings("/api/admin/platform/validate", {});
      if (!result.success) {
        throw new Error(result.detail || result.error || "Platform Sheet validation failed");
      }

      const tabCount = Number(result.tabCount || 0);
      const courseCount = Number(result.activeCourseCount || 0);
      const accountCount = Number(result.accountCount || 0);
      const globalSubjectCount = Number(result.globalSubjectCount || 0);
      const subjectAccessCount = Number(result.globalSubjectAccessCount || 0);
      const globalResourceDriveState = result.globalResourceDriveConfigured
        ? "Global Resources folder is configured."
        : "Global Resources folder is not configured.";
      const migrationState = result.readyForUnifiedLogin
        ? "Unified-login data is present."
        : "Ready for account migration; unified login is not active yet.";
      setPlatformValidationMessage(
        `Ready: ${tabCount} required tabs, ${courseCount} active course${courseCount === 1 ? "" : "s"}, ` +
        `${accountCount} central account${accountCount === 1 ? "" : "s"}, ` +
        `${globalSubjectCount} global subject${globalSubjectCount === 1 ? "" : "s"}, ` +
        `${subjectAccessCount} global-subject subscription${subjectAccessCount === 1 ? "" : "s"}. ` +
        `${globalResourceDriveState} ${migrationState}`,
        "success"
      );
      return true;
    } catch (error) {
      console.error("Could not validate Platform Sheet", error);
      setPlatformValidationMessage(
        error && error.message ? error.message : "Platform Sheet validation failed.",
        "error"
      );
      return false;
    } finally {
      loading = false;
      setSystemSettingsBusy(false);
    }
  }

  async function previewAccountMigration() {
    if (loading || !isSystemSettingsAdmin()) return false;

    clearAccountMigrationPreview();
    loading = true;
    setSystemSettingsBusy(true);
    setAccountMigrationMessage("Checking current course accounts...", "loading");

    try {
      const result = await postSystemSettings("/api/admin/platform/accounts/migrate", {
        action: "PREVIEW",
        grantGlobalAdmin: isGlobalAdminGrantSelected()
      });
      if (!result.success) {
        throw new Error(result.detail || result.error || "Unable to preview account migration");
      }

      renderAccountMigrationPreview(result);
      setAccountMigrationMessage(
        result.migrationCurrent
          ? "No migration writes are needed; this course's central accounts and memberships are already present."
          : result.canCommit
          ? `Preview ready. Enter ${result.confirmationText} to enable the migration.`
          : `${Number(result.blockerCount || 0)} blocking issue${Number(result.blockerCount || 0) === 1 ? "" : "s"} must be corrected before migration.`,
        result.migrationCurrent || result.canCommit ? "success" : "error"
      );
      return true;
    } catch (error) {
      console.error("Could not preview central account migration", error);
      setAccountMigrationMessage(
        error && error.message ? error.message : "Unable to preview account migration.",
        "error"
      );
      return false;
    } finally {
      loading = false;
      setSystemSettingsBusy(false);
    }
  }

  async function commitAccountMigration() {
    if (loading || !isSystemSettingsAdmin() || !accountMigrationPreview) return false;

    const confirmationText = getInputValue("system-settings-migration-confirm").toUpperCase();
    if (confirmationText !== accountMigrationPreview.confirmationText) {
      setAccountMigrationMessage(
        `Enter ${accountMigrationPreview.confirmationText} exactly before migrating.`,
        "error"
      );
      return false;
    }

    const confirmed = typeof window.confirm !== "function" || window.confirm(
      "Create the previewed central accounts and course memberships? Existing login routes will remain active."
    );
    if (!confirmed) return false;

    loading = true;
    setSystemSettingsBusy(true);
    setAccountMigrationMessage("Migrating central accounts...", "loading");

    try {
      const result = await postSystemSettings("/api/admin/platform/accounts/migrate", {
        action: "COMMIT",
        grantGlobalAdmin: accountMigrationPreview.grantGlobalAdmin,
        previewToken: accountMigrationPreview.previewToken,
        confirmationText
      });
      if (!result.success) {
        throw new Error(result.detail || result.error || "Central account migration failed");
      }

      clearAccountMigrationPreview();
      setAccountMigrationMessage(
        `Migration completed: ${Number(result.accountsCreated || 0)} accounts and ` +
        `${Number(result.courseAccessCreated || 0)} course memberships created. Existing logins remain active.`,
        "success"
      );
      return true;
    } catch (error) {
      console.error("Could not migrate central accounts", error);
      setAccountMigrationMessage(
        error && error.message ? error.message : "Central account migration failed.",
        "error"
      );
      return false;
    } finally {
      loading = false;
      setSystemSettingsBusy(false);
    }
  }

  function renderAccountMigrationPreview(result) {
    const summary = document.getElementById("system-settings-migration-summary");
    if (!summary) return;

    summary.replaceChildren();
    summary.classList.remove("hidden");
    const counts = document.createElement("p");
    counts.className = "system-settings-migration-counts";
    counts.textContent =
      `${Number(result.sourceCounts?.staff || 0)} staff, ` +
      `${Number(result.sourceCounts?.students || 0)} students; ` +
      `${Number(result.plannedWrites?.userAccounts || 0)} accounts and ` +
      `${Number(result.plannedWrites?.courseAccess || 0)} memberships planned.`;
    summary.appendChild(counts);

    appendMigrationIssues(summary, "Blocking issues", result.blockers, "error");
    appendMigrationIssues(summary, "Warnings", result.warnings, "warning");

    const canCommit = result.canCommit === true && Boolean(result.previewToken);
    accountMigrationPreview = canCommit ? {
      previewToken: String(result.previewToken),
      confirmationText: String(result.confirmationText || "").toUpperCase(),
      grantGlobalAdmin: isGlobalAdminGrantSelected()
    } : null;
    const label = document.getElementById("system-settings-migration-confirm-label");
    const button = document.querySelector('[data-system-settings-action="commit-account-migration"]');
    const prompt = document.getElementById("system-settings-migration-confirm-prompt");
    if (label) label.classList.toggle("hidden", !canCommit);
    if (button) button.classList.toggle("hidden", !canCommit);
    if (prompt && canCommit) prompt.textContent = `Type ${accountMigrationPreview.confirmationText} to confirm`;
  }

  function appendMigrationIssues(container, heading, issues, kind) {
    if (!Array.isArray(issues) || issues.length === 0) return;
    const section = document.createElement("section");
    section.className = `system-settings-migration-issues system-settings-migration-issues--${kind}`;
    const title = document.createElement("h5");
    title.textContent = heading;
    const list = document.createElement("ul");
    for (const issue of issues) {
      const item = document.createElement("li");
      item.textContent = String(issue && issue.message ? issue.message : "Migration issue");
      list.appendChild(item);
    }
    section.append(title, list);
    container.appendChild(section);
  }

  function clearAccountMigrationPreview() {
    accountMigrationPreview = null;
    const summary = document.getElementById("system-settings-migration-summary");
    const label = document.getElementById("system-settings-migration-confirm-label");
    const button = document.querySelector('[data-system-settings-action="commit-account-migration"]');
    const input = document.getElementById("system-settings-migration-confirm");
    if (summary) {
      summary.replaceChildren();
      summary.classList.add("hidden");
    }
    if (label) label.classList.add("hidden");
    if (button) button.classList.add("hidden");
    if (input) input.value = "";
  }

  function isGlobalAdminGrantSelected() {
    const checkbox = document.getElementById("system-settings-grant-global-admin");
    return Boolean(checkbox && checkbox.checked);
  }

  function renderSystemSettings(settings) {
    setInputValue("system-settings-student-login-url", settings.studentLoginBaseUrl || "");
    setInputValue(
      "system-settings-drive-folder",
      settings.weeklyPlannerDriveFolderUrl || settings.weeklyPlannerDriveFolderId || ""
    );
    setInputValue(
      "system-settings-drive-label",
      settings.weeklyPlannerDriveFolderLabel || "Weekly Planner"
    );
    setInputValue("system-settings-global-zoom-link", settings.globalZoomLink || "");

    const destination = document.getElementById("system-settings-drive-destination");
    if (destination) {
      destination.textContent = settings.weeklyPlannerDriveFolderUrl
        ? `Current destination: ${settings.weeklyPlannerDriveFolderUrl}`
        : "No Weekly Planner Drive folder is currently stored in SystemConfig.";
    }
  }

  function setSystemSettingsBusy(isBusy) {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;

    screen.setAttribute("aria-busy", isBusy ? "true" : "false");
    screen.querySelectorAll("input, button[data-system-settings-action]").forEach(control => {
      control.disabled = isBusy;
    });
  }

  function setSystemSettingsMessage(message, kind) {
    const element = document.getElementById("system-settings-message");
    if (!element) return;

    element.textContent = String(message || "");
    element.dataset.kind = String(kind || "");
  }

  function setPlatformValidationMessage(message, kind) {
    const element = document.getElementById("system-settings-platform-status");
    if (!element) return;

    element.textContent = String(message || "");
    element.dataset.kind = String(kind || "");
  }

  function setAccountMigrationMessage(message, kind) {
    const element = document.getElementById("system-settings-migration-status");
    if (!element) return;

    element.textContent = String(message || "");
    element.dataset.kind = String(kind || "");
  }

  function getInputValue(id) {
    const input = document.getElementById(id);
    return input ? String(input.value || "").trim() : "";
  }

  function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = String(value || "");
  }

  async function postSystemSettings(path, body) {
    if (!window.M4LAuth || typeof window.M4LAuth.apiPost !== "function") {
      throw new Error("The authenticated API client is unavailable");
    }

    const token = typeof state !== "undefined" && state ? state.token : "";
    return window.M4LAuth.apiPost(path, body, token);
  }

  function handleSystemSettingsClick(event) {
    const button = event.target && event.target.closest
      ? event.target.closest("[data-system-settings-action]")
      : null;

    if (!button || button.disabled) return;

    const action = String(button.dataset.systemSettingsAction || "");
    if (!action) return;

    event.preventDefault();

    if (action === "open") {
      showSystemSettings();
    } else if (action === "reload") {
      loadSystemSettings();
    } else if (action === "save") {
      saveSystemSettings();
    } else if (action === "validate-platform") {
      validatePlatformSheet();
    } else if (action === "preview-account-migration") {
      previewAccountMigration();
    } else if (action === "commit-account-migration") {
      commitAccountMigration();
    }
  }

  function bindSystemSettingsHandlers() {
    if (handlersBound || typeof document === "undefined") return false;

    handlersBound = true;
    document.addEventListener("click", handleSystemSettingsClick);

    const form = document.getElementById("system-settings-form");
    if (form) {
      form.addEventListener("submit", event => {
        event.preventDefault();
        saveSystemSettings();
      });
    }

    const globalAdminGrant = document.getElementById("system-settings-grant-global-admin");
    if (globalAdminGrant) {
      globalAdminGrant.addEventListener("change", () => {
        clearAccountMigrationPreview();
        setAccountMigrationMessage("Run the preview again after changing GLOBAL_ADMIN authority.", "warning");
      });
    }

    syncSystemSettingsAccess();
    return true;
  }

  window.M4LSystemSettings = Object.freeze({
    bind: bindSystemSettingsHandlers,
    syncAccess: syncSystemSettingsAccess,
    open: showSystemSettings,
    load: loadSystemSettings,
    save: saveSystemSettings,
    validatePlatform: validatePlatformSheet,
    previewAccountMigration,
    commitAccountMigration
  });
  window.showSystemSettings = showSystemSettings;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindSystemSettingsHandlers, { once: true });
  } else {
    bindSystemSettingsHandlers();
  }
})();
