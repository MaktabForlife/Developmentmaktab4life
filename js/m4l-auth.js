/* M4L V100.2 - Auth / PIN / API module
   Load after /app.js and before the window load event fires.
   This is a classic script, not type=module, so functions remain globally available
   for the existing app while we split gradually.
*/

function setError(message) {
  setDomText("auth-error", message || "");
}

function setupPinDigitBoxes() {
  document.querySelectorAll(".pin-digit-row").forEach(row => {
    const groupId = row.dataset.pinGroup;
    const inputs = Array.from(row.querySelectorAll(".pin-digit"));
    const hiddenInput = document.getElementById(groupId);

    if (!groupId || inputs.length === 0) return;

    const syncHiddenInput = () => {
      if (hiddenInput) {
        hiddenInput.value = inputs.map(input => input.value.replace(/\D/g, "")).join("");
      }
    };

    const fillDigits = (digits, startIndex = 0) => {
      const cleanDigits = String(digits || "").replace(/\D/g, "").slice(0, inputs.length);

      if (!cleanDigits) {
        syncHiddenInput();
        return;
      }

      const fillFrom = cleanDigits.length >= inputs.length ? 0 : startIndex;

      cleanDigits.split("").forEach((digit, offset) => {
        const target = inputs[fillFrom + offset];
        if (target) {
          target.value = digit;
        }
      });

      if (groupId === "setup-pin") {
        const confirmationBox = document.getElementById("setup-pin-confirm-box");
        if (confirmationBox && !confirmationBox.classList.contains("hidden")) {
          clearPinValue("setup-pin-confirm");
        }
      }

      syncHiddenInput();
      maybeAutoSubmitPin(groupId);

      const nextIndex = Math.min(fillFrom + cleanDigits.length, inputs.length - 1);
      inputs[nextIndex].focus();
    };

    inputs.forEach((input, index) => {
      input.addEventListener("input", () => {
        const digits = input.value.replace(/\D/g, "");

        if (digits.length > 1) {
          fillDigits(digits, index);
          setError("");
          return;
        }

        input.value = digits;

        if (digits && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }

        if (groupId === "setup-pin") {
          const confirmationBox = document.getElementById("setup-pin-confirm-box");
          if (confirmationBox && !confirmationBox.classList.contains("hidden")) {
            clearPinValue("setup-pin-confirm");
          }
        }

        syncHiddenInput();
        setError("");
        maybeAutoSubmitPin(groupId);
      });

      input.addEventListener("keydown", event => {
        if (event.key === "Backspace" && !input.value && index > 0) {
          inputs[index - 1].value = "";
          inputs[index - 1].focus();
          syncHiddenInput();
          maybeAutoSubmitPin(groupId);
        }

        if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          inputs[index - 1].focus();
        }

        if (event.key === "ArrowRight" && index < inputs.length - 1) {
          event.preventDefault();
          inputs[index + 1].focus();
        }

        if (event.key === "Enter") {
          event.preventDefault();

          if (groupId === "setup-pin") {
            revealSetupPinConfirmation();
          } else if (groupId === "setup-pin-confirm") {
            submitSetupPin();
          } else if (groupId === "login-pin") {
            submitLogin();
          }
        }
      });

      input.addEventListener("paste", event => {
        event.preventDefault();
        const pastedDigits = (event.clipboardData || window.clipboardData)
          .getData("text")
          .replace(/\D/g, "");

        fillDigits(pastedDigits, index);
        setError("");
      });
    });
  });
}

function getPinValue(groupId) {
  const row = document.querySelector(`.pin-digit-row[data-pin-group="${groupId}"]`);
  const digitInputs = row ? Array.from(row.querySelectorAll(".pin-digit")) : [];

  if (digitInputs.length) {
    return digitInputs.map(input => input.value.replace(/\D/g, "")).join("");
  }

  const fallbackInput = document.getElementById(groupId);
  return fallbackInput ? fallbackInput.value.trim() : "";
}

function clearPinValue(groupId) {
  const row = document.querySelector(`.pin-digit-row[data-pin-group="${groupId}"]`);
  const digitInputs = row ? Array.from(row.querySelectorAll(".pin-digit")) : [];
  const hiddenInput = document.getElementById(groupId);

  digitInputs.forEach(input => {
    input.value = "";
  });

  if (hiddenInput) {
    hiddenInput.value = "";
  }
}

function focusFirstPinDigit(groupId) {
  const firstInput = document.querySelector(`.pin-digit-row[data-pin-group="${groupId}"] .pin-digit`);

  if (!firstInput) return;

  const focusInput = () => {
    try {
      firstInput.focus({ preventScroll: true });
    } catch (err) {
      firstInput.focus();
    }

    if (typeof firstInput.select === "function") {
      firstInput.select();
    }
  };

  setTimeout(focusInput, 80);
  setTimeout(focusInput, 260);
}

function maybeAutoSubmitPin(groupId) {
  if (groupId === "setup-pin") {
    const setupBox = document.getElementById("setup-pin-box");
    if (setupBox && setupBox.classList.contains("hidden")) return;

    const pin = getPinValue("setup-pin");

    if (/^\d{4}$/.test(pin)) {
      revealSetupPinConfirmation();
    } else {
      hideSetupPinConfirmation();
    }

    return;
  }

  if (groupId === "setup-pin-confirm") {
    const confirmationBox = document.getElementById("setup-pin-confirm-box");
    if (confirmationBox && confirmationBox.classList.contains("hidden")) return;

    const confirmationPin = getPinValue("setup-pin-confirm");
    if (/^\d{4}$/.test(confirmationPin)) {
      window.setTimeout(() => submitSetupPin(), 0);
    }

    return;
  }

  if (groupId !== "login-pin") return;

  const loginBox = document.getElementById("login-pin-box");
  if (loginBox && loginBox.classList.contains("hidden")) return;

  const pin = getPinValue("login-pin");
  if (/^\d{4}$/.test(pin)) {
    window.setTimeout(() => submitLogin(), 0);
  }
}

function hideSetupPinConfirmation() {
  clearPinValue("setup-pin-confirm");
  hideDomElement("setup-pin-confirm-box");
}

function revealSetupPinConfirmation() {
  const pin = getPinValue("setup-pin");

  if (!/^\d{4}$/.test(pin)) {
    hideSetupPinConfirmation();
    setError("PIN must be 4 digits.");
    focusFirstPinDigit("setup-pin");
    return false;
  }

  showDomElement("setup-pin-confirm-box");
  setError("");

  if (!/^\d{4}$/.test(getPinValue("setup-pin-confirm"))) {
    focusFirstPinDigit("setup-pin-confirm");
  }

  return true;
}

function resetSetupPinCreationFlow() {
  clearPinValue("setup-pin");
  hideSetupPinConfirmation();
  state.setupPinSubmitting = false;
}


function hasUnifiedAccountWorkspaceSession() {
  try {
    const workspace = localStorage.getItem("m4l_account_workspace") === "true";
    const accountToken = String(localStorage.getItem("m4l_account_token") || "");
    const appToken = String(localStorage.getItem("maktab_token") || "");
    return workspace && !!accountToken && accountToken === appToken;
  } catch (error) {
    return false;
  }
}

function getUnifiedAccountPath(options = {}) {
  const uniqueId = String(state.uniqueid || "").trim();
  const suffix = options.switcher === true ? "?switch=1" : "";
  return uniqueId ? `/account/${encodeURIComponent(uniqueId)}${suffix}` : "/";
}

function clearUnifiedAccountStorage() {
  localStorage.removeItem("m4l_account_token");
  localStorage.removeItem("m4l_account_context");
  localStorage.removeItem("m4l_account_contexts");
  localStorage.removeItem("m4l_account_workspace");
}

function invalidateActiveSession() {
  const unifiedAccount = hasUnifiedAccountWorkspaceSession() || state.authMode === "account";
  localStorage.removeItem("maktab_token");
  localStorage.removeItem("maktab_user_type");
  if (unifiedAccount) clearUnifiedAccountStorage();
  state.token = "";
  state.userType = "";

  setError("Your session is no longer valid. Please log in again.");

  window.setTimeout(() => {
    if (unifiedAccount) {
      window.location.replace(getUnifiedAccountPath());
    } else {
      location.reload();
    }
  }, 80);
}

async function apiPost(path, body = {}, token = "") {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  let result;

  try {
    result = await response.json();
  } catch (error) {
    result = {
      success: false,
      error: "The server returned an invalid response."
    };
  }

  if (token && response.status === 401) {
    invalidateActiveSession();
    return {
      ...result,
      success: false,
      sessionInvalidated: true
    };
  }

  return result;
}

/* =========================
   AUTH
========================= */

function updateAuthWelcomeBanner(username) {
  const displayName = String(username || "").trim();
  const bannerText = displayName ? `Ahlan wa Sahlan ${displayName}` : "Ahlan wa Sahlan";

  setDomText("auth-welcome-banner", bannerText);
  showDomElement("auth-welcome-banner");
}

function updateAuthLoginLabel(type) {
  const titleText = type === "admin" ? "Admin Login" : "Student Login";
  const subtitleText = "";

  setDomText("portal-title", titleText);
  setDomText("portal-subtitle", subtitleText);
}

async function checkStudent() {
  try {
    const result = await apiPost("/api/check-student", {
      uniqueid: state.uniqueid
    });

    if (!result.success) {
      setError(result.error || "Invalid student link");
      return;
    }

    state.user = result.student;

    updateAuthWelcomeBanner(result.student.username);
    updateAuthLoginLabel("student");

    if (result.student.pinsetup === true) {
      showDomElement("login-pin-box");
      hideDomElement("setup-pin-box");
      resetSetupPinCreationFlow();
      focusFirstPinDigit("login-pin");
    } else {
      hideDomElement("login-pin-box");
      showDomElement("setup-pin-box");
      resetSetupPinCreationFlow();
      focusFirstPinDigit("setup-pin");
    }
  } catch (err) {
    setError("Unable to connect. Please try again.");
  }
}

async function checkAdmin() {
  try {
    const result = await apiPost("/api/admin/check-admin", {
      uniqueid: state.uniqueid
    });

    if (!result.success) {
      setError(result.error || "Invalid admin link");
      return;
    }

    state.user = result.admin;

    updateAuthWelcomeBanner(result.admin.username);
    updateAuthLoginLabel("admin");

    document.body.classList.add("admin-body");

    if (result.admin.pinsetup === true) {
      showDomElement("login-pin-box");
      hideDomElement("setup-pin-box");
      resetSetupPinCreationFlow();
      focusFirstPinDigit("login-pin");
    } else {
      hideDomElement("login-pin-box");
      showDomElement("setup-pin-box");
      resetSetupPinCreationFlow();
      focusFirstPinDigit("setup-pin");
    }
  } catch (err) {
    setError("Unable to connect. Please try again.");
  }
}

async function submitSetupPin() {
  if (state.setupPinSubmitting) return;

  const pin = getPinValue("setup-pin");
  const pinConfirmation = getPinValue("setup-pin-confirm");

  if (!/^\d{4}$/.test(pin)) {
    setError("PIN must be 4 digits.");
    hideSetupPinConfirmation();
    focusFirstPinDigit("setup-pin");
    return;
  }

  if (!/^\d{4}$/.test(pinConfirmation)) {
    showDomElement("setup-pin-confirm-box");
    setError("Confirm your 4-digit PIN.");
    focusFirstPinDigit("setup-pin-confirm");
    return;
  }

  if (pin !== pinConfirmation) {
    clearPinValue("setup-pin");
    hideSetupPinConfirmation();
    setError("PINs did not match. Please create your PIN again.");
    focusFirstPinDigit("setup-pin");
    return;
  }

  const path = state.portalType === "admin"
    ? "/api/admin/setup-pin"
    : "/api/setup-pin";
  const loginPath = state.portalType === "admin"
    ? "/api/admin/login"
    : "/api/login";

  state.setupPinSubmitting = true;

  try {
    let result = await apiPost(path, {
      uniqueid: state.uniqueid,
      pin,
      pinConfirmation
    });

    if (!result.success) {
      setError(result.error || "Could not set PIN.");
      return;
    }

    // V100.1+ setup endpoints return a session token. The fallback keeps a
    // frontend-first deployment compatible with the previous V100 Worker.
    if (!result.token) {
      result = await apiPost(loginPath, {
        uniqueid: state.uniqueid,
        pin
      });
    }

    if (!result.success || !result.token) {
      setError(result.error || "PIN created, but automatic login failed. Please reload and log in.");
      return;
    }

    clearPinValue("setup-pin");
    clearPinValue("setup-pin-confirm");
    clearPinValue("login-pin");
    setError("");
    completeAuthenticatedSession(result);
  } catch (err) {
    setError("Unable to connect. Please try again.");
  } finally {
    state.setupPinSubmitting = false;
  }
}

function beginAuthInitialDataStatus() {
  if (window.M4LShell && typeof window.M4LShell.beginAppStatus === "function") {
    return window.M4LShell.beginAppStatus("Loading data...", { kind: "loading" });
  }

  return null;
}

function finishAuthInitialDataStatus(token, success = true) {
  if (!token || !window.M4LShell) {
    return false;
  }

  const finish = () => {
    if (success && typeof window.M4LShell.endAppStatus === "function") {
      window.M4LShell.endAppStatus(token, "Ready");
      return;
    }

    if (!success && typeof window.M4LShell.failAppStatus === "function") {
      window.M4LShell.failAppStatus(token, "Data loading failed");
    }
  };

  if (typeof window.setTimeout === "function") {
    window.setTimeout(finish, 950);
  } else {
    finish();
  }

  return true;
}

function completeAuthenticatedSession(result) {
  state.token = result.token;
  state.userType = String(result.workspace?.portalType || state.portalType || "").toLowerCase();
  state.user = state.userType === "admin" ? result.admin : result.student;
  state.authMode = result.sessionType === "account" ? "account" : "legacy";
  state.accountContext = result.context || null;

  localStorage.setItem("maktab_token", state.token);
  localStorage.setItem("maktab_user_type", state.userType);

  clearPinValue("login-pin");
  setError("");

  const initialDataStatusToken = beginAuthInitialDataStatus();

  const isGlobalLibraryContext = String(state.accountContext?.scope || "").trim().toUpperCase() === "GLOBAL";

  if (state.userType === "admin") {
    const adminWelcome = document.getElementById("admin-welcome");
    if (adminWelcome) {
      adminWelcome.innerText = "";
    }
    showScreen("admin-home");
  } else if (isGlobalLibraryContext) {
    showScreen("student-resources-subjects");
    window.setTimeout(() => {
      if (typeof showStudentResources === "function") {
        showStudentResources({ force: true }).catch(error => {
          console.error("Global Library opening failed:", error);
        });
      }
    }, 0);
  } else {
    const studentHomeTitle = document.getElementById("student-home-title");
    if (studentHomeTitle) {
      studentHomeTitle.innerText = "Home";
    }

    const studentWelcome = document.getElementById("student-welcome");
    if (studentWelcome) {
      studentWelcome.innerText = "";
    }

    showScreen("student-home");
  }

  finishAuthInitialDataStatus(initialDataStatusToken, true);
}

async function restoreUnifiedAccountWorkspace(route = {}) {
  if (!hasUnifiedAccountWorkspaceSession()) return false;

  try {
    let storedContext = null;
    try {
      storedContext = JSON.parse(localStorage.getItem("m4l_account_context") || "null");
    } catch (error) {}
    const workspaceEndpoint = String(storedContext?.scope || "").trim().toUpperCase() === "GLOBAL"
      ? "/api/account/global-workspace"
      : "/api/account/workspace";
    const result = await apiPost(workspaceEndpoint, {}, state.token);
    if (!result.success || !result.token && !state.token) {
      if (!result.sessionInvalidated) {
        setError(result.error || "The selected course workspace could not be opened.");
        showScreen("auth-screen");
      }
      return true;
    }

    const expectedUniqueId = String(result.account?.uniqueid || "").trim().toUpperCase();
    const routeUniqueId = String(route.uniqueid || state.uniqueid || "").trim().toUpperCase();
    const portalType = String(result.workspace?.portalType || "").trim().toLowerCase();
    if (!expectedUniqueId || expectedUniqueId !== routeUniqueId) {
      clearUnifiedAccountStorage();
      localStorage.removeItem("maktab_token");
      localStorage.removeItem("maktab_user_type");
      setError("This course workspace does not match the signed-in account.");
      showScreen("auth-screen");
      return true;
    }
    if (!["admin", "student"].includes(portalType)) {
      throw new Error("The selected course role does not have an operational workspace.");
    }
    if (portalType !== String(route.portalType || state.portalType || "").toLowerCase()) {
      window.location.replace(String(result.workspace.path || getUnifiedAccountPath({ switcher: true })));
      return true;
    }

    completeAuthenticatedSession({
      ...result,
      token: state.token,
      sessionType: "account"
    });
    return true;
  } catch (error) {
    setError(error.message || "The selected course workspace could not be opened.");
    showScreen("auth-screen");
    return true;
  }
}

function openUnifiedAccountSwitcher() {
  if (!hasUnifiedAccountWorkspaceSession() && state.authMode !== "account") return false;
  window.location.assign(getUnifiedAccountPath({ switcher: true }));
  return true;
}

async function switchUnifiedAccountContext(context) {
  if (!hasUnifiedAccountWorkspaceSession() && state.authMode !== "account") {
    throw new Error("The unified account session is not active.");
  }

  const accountToken = String(localStorage.getItem("m4l_account_token") || state.token || "");
  const requested = context && typeof context === "object" ? context : {};
  const scope = String(requested.scope || "COURSE").trim().toUpperCase();
  const courseId = String(requested.courseId || requested.courseid || "").trim();
  const role = String(requested.role || "").trim().toUpperCase();
  if (!accountToken || !scope || !role || (scope === "COURSE" && !courseId)) {
    throw new Error("The selected course or role is incomplete.");
  }

  const previousContext = state.accountContext || null;
  const result = await apiPost("/api/account/switch-context", {
    scope,
    courseId,
    role
  }, accountToken);
  if (!result.success || !result.token) {
    throw new Error(result.error || "The selected course or role could not be opened.");
  }

  state.token = result.token;
  state.accountContext = result.context || null;
  localStorage.setItem("m4l_account_token", result.token);
  localStorage.setItem("maktab_token", result.token);
  localStorage.setItem("m4l_account_context", JSON.stringify(state.accountContext));
  localStorage.setItem("m4l_account_contexts", JSON.stringify(
    Array.isArray(result.contexts) ? result.contexts : []
  ));

  if (!sameUnifiedAccountContext(previousContext, state.accountContext)) {
    clearUnifiedAccountCourseCaches();
  }

  if (String(state.accountContext?.scope || "").toUpperCase() === "PLATFORM") {
    localStorage.removeItem("m4l_account_workspace");
    localStorage.removeItem("maktab_user_type");
    window.location.assign(getUnifiedAccountPath({ switcher: true }));
    return true;
  }

  const workspacePath = String(state.accountContext?.scope || "").toUpperCase() === "GLOBAL"
    ? "/api/account/global-workspace"
    : "/api/account/workspace";
  const workspace = await apiPost(workspacePath, {}, result.token);
  const path = String(workspace.workspace?.path || "").trim();
  const portalType = String(workspace.workspace?.portalType || "").trim().toLowerCase();
  if (!workspace.success || !/^\/(admin|student)\/[A-Za-z0-9._~%-]+\/?(?:\?[^\s]*)?$/.test(path)) {
    throw new Error(workspace.error || "The selected workspace route is invalid.");
  }
  if (!["admin", "student"].includes(portalType)) {
    throw new Error("The selected workspace role is invalid.");
  }

  localStorage.setItem("maktab_user_type", portalType);
  localStorage.setItem("m4l_account_workspace", "true");
  window.location.assign(path);
  return true;
}

function sameUnifiedAccountContext(left, right) {
  const normalize = value => String(value || "").trim().toUpperCase();
  return normalize(left?.scope) === normalize(right?.scope) &&
    normalize(left?.courseId || left?.courseid) === normalize(right?.courseId || right?.courseid) &&
    normalize(left?.role) === normalize(right?.role);
}

function clearUnifiedAccountCourseCaches() {
  try {
    if (window.M4LResources && typeof window.M4LResources.invalidateCache === "function") {
      window.M4LResources.invalidateCache();
    }
  } catch (error) {}
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && ["m4l_app_cache_", "maktab_timetable_cache_"].some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {}
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key && key.startsWith("m4l_admin_progress_dashboard_")) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (error) {}
}

async function refreshUnifiedAccountProfile() {
  if (!hasUnifiedAccountWorkspaceSession() && state.authMode !== "account") {
    return { account: null, context: state.accountContext || null, contexts: [] };
  }

  const result = await apiPost("/api/account/session", {}, state.token);
  if (!result.success) {
    throw new Error(result.error || "Unable to load account Profile.");
  }

  state.accountContext = result.context || state.accountContext || null;
  const contexts = Array.isArray(result.contexts) ? result.contexts : [];
  localStorage.setItem("m4l_account_context", JSON.stringify(state.accountContext));
  localStorage.setItem("m4l_account_contexts", JSON.stringify(contexts));

  return {
    account: result.account || null,
    context: state.accountContext,
    contexts
  };
}

async function submitLogin() {
  if (state.loginSubmitting) return;

  const pin = getPinValue("login-pin");

  if (!/^\d{4}$/.test(pin)) {
    setError("PIN must be 4 digits.");
    return;
  }

  const path = state.portalType === "admin"
    ? "/api/admin/login"
    : "/api/login";

  state.loginSubmitting = true;

  try {
    const result = await apiPost(path, {
      uniqueid: state.uniqueid,
      pin
    });

    if (!result.success) {
      const message = result.code === "AUTH_RATE_LIMITED"
        ? (result.error || "Too many login attempts. Please wait one minute and try again.")
        : "Incorrect PIN. Re-enter PIN or contact web admin to reset PIN.";

      setError(message);
      clearPinValue("login-pin");
      focusFirstPinDigit("login-pin");
      return;
    }

    completeAuthenticatedSession(result);
  } catch (err) {
    setError("Unable to connect. Please try again.");
  } finally {
    state.loginSubmitting = false;
  }
}

function logout() {
  const unifiedAccount = hasUnifiedAccountWorkspaceSession() || state.authMode === "account";
  localStorage.removeItem("maktab_token");
  localStorage.removeItem("maktab_user_type");
  if (unifiedAccount) {
    clearUnifiedAccountStorage();
    window.location.replace(getUnifiedAccountPath());
    return;
  }
  location.reload();
}

function goHome() {
  if (state.userType === "admin" || state.portalType === "admin") {
    showScreen("admin-home");
  } else {
    showScreen("student-home");
  }
}

window.M4LAuth = {
  apiPost,
  invalidateActiveSession,
  setError,
  setupPinDigitBoxes,
  getPinValue,
  clearPinValue,
  focusFirstPinDigit,
  maybeAutoSubmitPin,
  hideSetupPinConfirmation,
  revealSetupPinConfirmation,
  resetSetupPinCreationFlow,
  updateAuthWelcomeBanner,
  updateAuthLoginLabel,
  beginAuthInitialDataStatus,
  finishAuthInitialDataStatus,
  completeAuthenticatedSession,
  hasUnifiedAccountWorkspaceSession,
  restoreUnifiedAccountWorkspace,
  openUnifiedAccountSwitcher,
  switchUnifiedAccountContext,
  refreshUnifiedAccountProfile,
  checkStudent,
  checkAdmin,
  submitSetupPin,
  submitLogin,
  logout,
  goHome
};

window.hasUnifiedAccountWorkspaceSession = hasUnifiedAccountWorkspaceSession;
window.restoreUnifiedAccountWorkspace = restoreUnifiedAccountWorkspace;
window.openUnifiedAccountSwitcher = openUnifiedAccountSwitcher;
window.switchUnifiedAccountContext = switchUnifiedAccountContext;
