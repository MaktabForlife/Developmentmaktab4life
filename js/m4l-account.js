/* M4L V102.6.2 - Unified account login, retry reset, context switching and Profile details. */
(function () {
  "use strict";

  const API_BASE = String(window.M4L_CONFIG?.API_BASE || "").replace(/\/$/, "");
  const TOKEN_KEY = "m4l_account_token";
  const CONTEXT_KEY = "m4l_account_context";
  const CONTEXTS_KEY = "m4l_account_contexts";
  const WORKSPACE_KEY = "m4l_account_workspace";
  const APP_TOKEN_KEY = "maktab_token";
  const APP_USER_TYPE_KEY = "maktab_user_type";
  const uniqueId = getUniqueIdFromPath();
  const switcherMode = new URLSearchParams(window.location.search).get("switch") === "1";
  const state = {
    token: localStorage.getItem(TOKEN_KEY) || "",
    account: null,
    context: null,
    contexts: [],
    busy: false,
    workspaceOpening: false
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    restrictPinInputs();
    if (!API_BASE || !uniqueId) {
      showInvalid("Use the complete personal link ending in /account/<uniqueid>.");
      return;
    }

    if (state.token) {
      const restored = await restoreSession();
      if (restored) return;
      clearStoredSession();
    }
    await checkAccount();
  }

  function bindEvents() {
    byId("login-form").addEventListener("submit", submitLogin);
    byId("setup-form").addEventListener("submit", submitSetup);
    byId("logout-button").addEventListener("click", logout);
    byId("open-workspace-button").addEventListener("click", () => openCurrentWorkspace());
    document.querySelectorAll("[data-toggle-pin]").forEach(button => {
      button.addEventListener("click", () => togglePin(button));
    });
  }

  function restrictPinInputs() {
    document.querySelectorAll('input[inputmode="numeric"]').forEach(input => {
      input.addEventListener("input", () => {
        input.value = String(input.value || "").replace(/\D/g, "").slice(0, 4);
      });
    });
  }

  async function restoreSession() {
    try {
      const result = await api("/api/account/session", {}, state.token);
      if (!result.success || normalize(result.account?.uniqueid) !== normalize(uniqueId)) return false;
      await acceptSession(result, false, { autoOpen: !switcherMode });
      return true;
    } catch (error) {
      return false;
    }
  }

  async function checkAccount() {
    showView("loading-view");
    try {
      const result = await api("/api/account/check", { uniqueid: uniqueId });
      state.account = result.account;
      const displayName = result.account.displayName || "Account holder";
      byId("login-name").textContent = displayName;
      byId("setup-name").textContent = displayName;
      showView(result.account.pinsetup ? "login-form" : "setup-form");
      window.setTimeout(() => {
        byId(result.account.pinsetup ? "login-pin" : "setup-pin").focus();
      }, 30);
    } catch (error) {
      showInvalid(error.message || "This account link could not be verified.");
    }
  }

  async function submitLogin(event) {
    event.preventDefault();
    if (state.busy) return;
    const pin = byId("login-pin").value;
    if (!/^\d{4}$/.test(pin)) {
      showFormError("login-error", "Enter your complete 4-digit PIN.");
      return;
    }
    setBusy(event.currentTarget, true);
    showFormError("login-error", "");
    let loginFailed = false;
    try {
      const result = await api("/api/account/login", { uniqueid: uniqueId, pin });
      await acceptSession(result, true, { autoOpen: !switcherMode });
    } catch (error) {
      showFormError("login-error", error.message);
      byId("login-pin").value = "";
      loginFailed = true;
    } finally {
      setBusy(event.currentTarget, false);
      if (loginFailed) {
        byId("login-pin").focus();
      }
    }
  }

  async function submitSetup(event) {
    event.preventDefault();
    if (state.busy) return;
    const pin = byId("setup-pin").value;
    const pinConfirmation = byId("setup-pin-confirmation").value;
    if (!/^\d{4}$/.test(pin)) {
      showFormError("setup-error", "Create a complete 4-digit PIN.");
      return;
    }
    if (pin !== pinConfirmation) {
      showFormError("setup-error", "The confirmation PIN does not match.");
      byId("setup-pin-confirmation").select();
      return;
    }
    setBusy(event.currentTarget, true);
    showFormError("setup-error", "");
    try {
      const result = await api("/api/account/setup-pin", {
        uniqueid: uniqueId,
        pin,
        pinConfirmation
      });
      await acceptSession(result, true, { autoOpen: !switcherMode });
    } catch (error) {
      showFormError("setup-error", error.message);
    } finally {
      setBusy(event.currentTarget, false);
    }
  }

  async function acceptSession(result, storeToken, options = {}) {
    const previousContext = readStoredContext();
    if (storeToken && result.token) {
      state.token = result.token;
      localStorage.setItem(TOKEN_KEY, result.token);
    }
    state.account = result.account;
    state.context = result.context;
    state.contexts = Array.isArray(result.contexts) ? result.contexts : [];
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(state.context));
    localStorage.setItem(CONTEXTS_KEY, JSON.stringify(state.contexts));
    if (previousContext && !sameContext(previousContext, state.context)) {
      clearCourseDataCaches();
    }
    renderContextView();
    if (options.autoOpen !== false && state.context?.scope === "COURSE") {
      await openCurrentWorkspace();
    }
  }

  function renderContextView() {
    byId("context-account-name").textContent = state.account?.displayName || "Account";
    byId("current-course").textContent = state.context?.courseName || "M4L Platform";
    byId("current-scope").textContent = state.context?.scope === "PLATFORM" ? "Platform" : "Course";
    byId("current-role").textContent = roleLabel(state.context?.role);
    byId("logout-button").classList.remove("hidden");
    byId("open-workspace-button").classList.toggle(
      "hidden",
      state.context?.scope !== "COURSE"
    );
    renderContextList();
    showView("context-view");
  }

  function renderContextList() {
    const list = byId("context-list");
    list.replaceChildren();
    state.contexts.forEach(context => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "account-context-button";
      const current = sameContext(context, state.context);
      if (current) {
        button.classList.add("is-current");
        button.disabled = true;
        button.setAttribute("aria-current", "true");
      }

      const label = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = context.courseName || "M4L Platform";
      const scope = document.createElement("small");
      scope.textContent = current
        ? `${context.scope === "PLATFORM" ? "Platform" : "Course"} · Current`
        : (context.scope === "PLATFORM" ? "Platform" : "Course");
      label.append(name, scope);

      const badge = document.createElement("span");
      badge.className = "account-role-badge";
      badge.textContent = roleLabel(context.role);
      button.append(label, badge);
      if (!current) button.addEventListener("click", () => switchContext(context, button));
      list.appendChild(button);
    });
  }

  async function switchContext(context, button) {
    if (state.busy) return;
    state.busy = true;
    button.disabled = true;
    showFormError("context-error", "");
    byId("service-message").textContent = "Validating the selected context…";
    try {
      const result = await api("/api/account/switch-context", {
        scope: context.scope,
        courseId: context.courseId,
        role: context.role
      }, state.token);
      await acceptSession(result, true, { autoOpen: false });
      if (state.context?.scope === "COURSE") {
        await openCurrentWorkspace();
      } else {
        byId("service-message").textContent = "Platform context selected securely.";
      }
    } catch (error) {
      showFormError("context-error", error.message);
      byId("service-message").textContent = "";
      button.disabled = false;
    } finally {
      state.busy = false;
    }
  }

  async function openCurrentWorkspace() {
    if (state.workspaceOpening || state.context?.scope !== "COURSE" || !state.token) return false;
    state.workspaceOpening = true;
    const openButton = byId("open-workspace-button");
    openButton.disabled = true;
    showFormError("context-error", "");
    byId("service-message").textContent = "Opening the selected course…";
    try {
      const result = await api("/api/account/workspace", {}, state.token);
      const path = String(result.workspace?.path || "").trim();
      const portalType = String(result.workspace?.portalType || "").trim().toLowerCase();
      if (!/^\/(admin|student)\/[A-Za-z0-9._~%-]+\/?$/.test(path)) {
        throw new Error("The course workspace route is invalid.");
      }
      if (!["admin", "student"].includes(portalType)) {
        throw new Error("The course workspace role is invalid.");
      }
      localStorage.setItem(APP_TOKEN_KEY, state.token);
      localStorage.setItem(APP_USER_TYPE_KEY, portalType);
      localStorage.setItem(WORKSPACE_KEY, "true");
      window.location.assign(path);
      return true;
    } catch (error) {
      showFormError("context-error", error.message || "The course workspace could not be opened.");
      byId("service-message").textContent = "";
      return false;
    } finally {
      state.workspaceOpening = false;
      openButton.disabled = false;
    }
  }

  async function api(path, payload, token = "") {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    let result = {};
    try {
      result = await response.json();
    } catch (error) {
      throw new Error("The account service returned an unreadable response.");
    }
    if (!response.ok || !result.success) {
      if (response.status === 401 && token) clearStoredSession();
      throw new Error(result.error || "The account request could not be completed.");
    }
    return result;
  }

  function logout() {
    clearStoredSession();
    window.location.reload();
  }

  function clearStoredSession() {
    state.token = "";
    state.context = null;
    state.contexts = [];
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CONTEXT_KEY);
    localStorage.removeItem(CONTEXTS_KEY);
    localStorage.removeItem(WORKSPACE_KEY);
    localStorage.removeItem(APP_TOKEN_KEY);
    localStorage.removeItem(APP_USER_TYPE_KEY);
    clearCourseDataCaches();
  }

  function readStoredContext() {
    try {
      const value = JSON.parse(localStorage.getItem(CONTEXT_KEY) || "null");
      return value && typeof value === "object" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function clearCourseDataCaches() {
    const prefixes = ["m4l_app_cache_", "maktab_timetable_cache_"];
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && prefixes.some(prefix => key.startsWith(prefix))) {
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

  function showView(id) {
    document.querySelectorAll(".account-view").forEach(view => view.classList.add("hidden"));
    byId(id).classList.remove("hidden");
    if (id !== "context-view") byId("logout-button").classList.add("hidden");
    byId("service-message").textContent = "";
  }

  function showInvalid(message) {
    byId("invalid-message").textContent = message;
    showView("invalid-view");
  }

  function setBusy(form, busy) {
    state.busy = busy;
    form.querySelectorAll("button, input").forEach(control => { control.disabled = busy; });
  }

  function showFormError(id, message) {
    byId(id).textContent = message || "";
  }

  function togglePin(button) {
    const input = byId(button.dataset.togglePin);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "Hide" : "Show";
    button.setAttribute("aria-label", `${show ? "Hide" : "Show"} PIN`);
    input.focus();
  }

  function sameContext(left, right) {
    return normalize(left?.scope) === normalize(right?.scope) &&
      normalize(left?.courseId) === normalize(right?.courseId) &&
      normalize(left?.role) === normalize(right?.role);
  }

  function roleLabel(role) {
    const normalized = normalize(role);
    if (normalized === "SENIOR") return "SENIOR TEACHER";
    return String(role || "").replace(/_/g, " ");
  }

  function getUniqueIdFromPath() {
    const match = /^\/account\/([^/?#]+)\/?$/i.exec(window.location.pathname);
    if (!match) return "";
    try {
      return decodeURIComponent(match[1]).trim();
    } catch (error) {
      return "";
    }
  }

  function normalize(value) {
    return String(value || "").trim().toUpperCase();
  }

  function byId(id) {
    return document.getElementById(id);
  }
})();
