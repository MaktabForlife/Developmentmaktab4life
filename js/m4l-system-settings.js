/* M4L V102.1 - ADMIN SystemConfig and central Platform Sheet validation. */
(function () {
  "use strict";

  const SCREEN_ID = "system-settings-screen";
  let handlersBound = false;
  let loading = false;

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
      const migrationState = result.readyForUnifiedLogin
        ? "Unified-login data is present."
        : "Ready for account migration; unified login is not active yet.";
      setPlatformValidationMessage(
        `Ready: ${tabCount} tabs, ${courseCount} active course${courseCount === 1 ? "" : "s"}, ` +
        `${accountCount} central account${accountCount === 1 ? "" : "s"}. ${migrationState}`,
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

    syncSystemSettingsAccess();
    return true;
  }

  window.M4LSystemSettings = Object.freeze({
    bind: bindSystemSettingsHandlers,
    syncAccess: syncSystemSettingsAccess,
    open: showSystemSettings,
    load: loadSystemSettings,
    save: saveSystemSettings,
    validatePlatform: validatePlatformSheet
  });
  window.showSystemSettings = showSystemSettings;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindSystemSettingsHandlers, { once: true });
  } else {
    bindSystemSettingsHandlers();
  }
})();
