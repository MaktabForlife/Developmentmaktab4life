/* M4L V102.12.1 - Unified account login with Academy timetable and calendar context. */
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
    workspaceOpening: false,
    academyWeekStart: "",
    academyTimezone: "",
    academyLoading: false
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
    byId("academy-prev-week").addEventListener("click", () => moveAcademyWeek(-7));
    byId("academy-next-week").addEventListener("click", () => moveAcademyWeek(7));
    byId("academy-current-week").addEventListener("click", () => loadAcademyTimetable({ resetWeek: true, force: true }));
    byId("academy-refresh").addEventListener("click", () => loadAcademyTimetable({ force: true }));
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
      await acceptSession(result, false, { autoOpen: false });
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
    const form = event.currentTarget;
    const pin = byId("login-pin").value;
    if (!/^\d{4}$/.test(pin)) {
      showFormError("login-error", "Enter your complete 4-digit PIN.");
      return;
    }
    setBusy(form, true);
    showFormError("login-error", "");
    let loginFailed = false;
    try {
      const result = await api("/api/account/login", { uniqueid: uniqueId, pin });
      await acceptSession(result, true, { autoOpen: false });
    } catch (error) {
      showFormError("login-error", error.message);
      byId("login-pin").value = "";
      loginFailed = true;
    } finally {
      setBusy(form, false);
      if (loginFailed) {
        byId("login-pin").focus();
      }
    }
  }

  async function submitSetup(event) {
    event.preventDefault();
    if (state.busy) return;
    const form = event.currentTarget;
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
    setBusy(form, true);
    showFormError("setup-error", "");
    try {
      const result = await api("/api/account/setup-pin", {
        uniqueid: uniqueId,
        pin,
        pinConfirmation
      });
      await acceptSession(result, true, { autoOpen: false });
    } catch (error) {
      showFormError("setup-error", error.message);
    } finally {
      setBusy(form, false);
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
    await loadAcademyTimetable({ resetWeek: true });
    if (options.autoOpen === true && ["COURSE", "GLOBAL"].includes(state.context?.scope)) {
      await openCurrentWorkspace();
    }
  }

  function renderContextView() {
    byId("context-account-name").textContent = state.account?.displayName || "Account";
    byId("current-course").textContent = state.context?.courseName || "M4L Platform";
    byId("current-scope").textContent = contextScopeLabel(state.context?.scope);
    byId("current-role").textContent = roleLabel(state.context?.role);
    byId("logout-button").classList.remove("hidden");
    const openWorkspaceButton = byId("open-workspace-button");
    openWorkspaceButton.classList.toggle(
      "hidden",
      !["COURSE", "GLOBAL"].includes(state.context?.scope)
    );
    openWorkspaceButton.textContent = state.context?.scope === "GLOBAL"
      ? "Open Global Library"
      : `Open ${state.context?.courseName || "selected Program"}`;
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
        ? `${contextScopeLabel(context.scope)} · Current`
        : contextScopeLabel(context.scope);
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
      byId("service-message").textContent = ["COURSE", "GLOBAL"].includes(state.context?.scope)
        ? "Program or access context selected."
        : "Platform context selected securely.";
    } catch (error) {
      showFormError("context-error", error.message);
      byId("service-message").textContent = "";
      button.disabled = false;
    } finally {
      state.busy = false;
    }
  }

  async function openCurrentWorkspace() {
    if (state.workspaceOpening || !["COURSE", "GLOBAL"].includes(state.context?.scope) || !state.token) return false;
    state.workspaceOpening = true;
    const openButton = byId("open-workspace-button");
    openButton.disabled = true;
    showFormError("context-error", "");
    byId("service-message").textContent = "Opening the selected workspace…";
    try {
      const endpoint = state.context?.scope === "GLOBAL"
        ? "/api/account/global-workspace"
        : "/api/account/workspace";
      const result = await api(endpoint, {}, state.token);
      const path = String(result.workspace?.path || "").trim();
      const portalType = String(result.workspace?.portalType || "").trim().toLowerCase();
      if (!/^\/(admin|student)\/[A-Za-z0-9._~%-]+\/?(?:\?[^\s]*)?$/.test(path)) {
        throw new Error("The selected workspace route is invalid.");
      }
      if (!["admin", "student"].includes(portalType)) {
        throw new Error("The program workspace role is invalid.");
      }
      localStorage.setItem(APP_TOKEN_KEY, state.token);
      localStorage.setItem(APP_USER_TYPE_KEY, portalType);
      localStorage.setItem(WORKSPACE_KEY, "true");
      window.location.assign(path);
      return true;
    } catch (error) {
      showFormError("context-error", error.message || "The program workspace could not be opened.");
      byId("service-message").textContent = "";
      return false;
    } finally {
      state.workspaceOpening = false;
      openButton.disabled = false;
    }
  }


  async function loadAcademyTimetable(options = {}) {
    if (!state.token || state.academyLoading) return false;
    state.academyLoading = true;
    const container = byId("academy-timetable");
    const message = byId("academy-timetable-message");
    if (options.resetWeek === true) state.academyWeekStart = "";
    message.textContent = "Loading timetable…";
    byId("academy-refresh").disabled = true;
    try {
      const result = await api("/api/academy/timetable", {
        ...(state.academyWeekStart ? { startDate: state.academyWeekStart } : {})
      }, state.token);
      state.academyWeekStart = String(result.weekStart || "").trim();
      state.academyTimezone = String(result.timezone || "").trim();
      renderAcademyTimetable(result);
      const warnings = Array.isArray(result.warnings) ? result.warnings.length : 0;
      message.textContent = warnings
        ? `${warnings} Program timetable${warnings === 1 ? " is" : "s are"} temporarily unavailable.`
        : "";
      return true;
    } catch (error) {
      container.replaceChildren(createAcademyEmptyState("Timetable unavailable", error.message || "Please refresh and try again."));
      message.textContent = "";
      return false;
    } finally {
      state.academyLoading = false;
      byId("academy-refresh").disabled = false;
    }
  }

  function renderAcademyTimetable(result) {
    const container = byId("academy-timetable");
    const sessions = Array.isArray(result.sessions) ? result.sessions : [];
    const calendarEvents = Array.isArray(result.calendarEvents) ? result.calendarEvents : [];
    const weekStart = String(result.weekStart || state.academyWeekStart || "").trim();
    const weekEnd = String(result.weekEnd || "").trim();
    const today = String(result.today || "").trim();
    byId("academy-week-label").textContent = `${formatAcademyDate(weekStart, { month: "short", day: "numeric" })} – ${formatAcademyDate(weekEnd, { month: "short", day: "numeric", year: "numeric" })}`;
    renderAcademyWeekContext(calendarEvents, weekStart, weekEnd);
    container.replaceChildren();

    for (let offset = 0; offset < 7; offset += 1) {
      const date = addAcademyDays(weekStart, offset);
      const day = document.createElement("section");
      day.className = "academy-day";
      if (date === today) day.classList.add("is-today");

      const heading = document.createElement("header");
      heading.className = "academy-day-heading";
      const dayName = document.createElement("strong");
      dayName.textContent = formatAcademyDate(date, { weekday: "short" });
      const dayDate = document.createElement("span");
      dayDate.textContent = formatAcademyDate(date, { day: "2-digit", month: "short" });
      heading.append(dayName, dayDate);
      day.appendChild(heading);
      const dayEvents = calendarEvents.filter(event => String(event.startDate || "") <= date && String(event.endDate || "") >= date);
      const daySpecificEvents = dayEvents.filter(event => ["PUBLIC_HOLIDAY", "ISLAMIC_DAY"].includes(String(event.eventType || "").toUpperCase()));
      if (daySpecificEvents.length) {
        const badges = document.createElement("div");
        badges.className = "academy-calendar-day-badges";
        daySpecificEvents.forEach(event => badges.appendChild(createAcademyCalendarBadge(event)));
        day.appendChild(badges);
      }

      const daySessions = sessions.filter(session => String(session.date || "") === date);
      if (!daySessions.length) {
        const empty = document.createElement("p");
        empty.className = "academy-day-empty";
        empty.textContent = "No classes";
        day.appendChild(empty);
      } else {
        daySessions.forEach(session => day.appendChild(createAcademySessionCard(session)));
      }
      container.appendChild(day);
    }
  }


  function renderAcademyWeekContext(events, weekStart, weekEnd) {
    const root = byId("academy-week-context");
    if (!root) return;
    root.replaceChildren();
    const context = (Array.isArray(events) ? events : []).filter(event => {
      const type = String(event.eventType || "").toUpperCase();
      return ["TERM", "RELIGIOUS_PERIOD"].includes(type) && String(event.startDate || "") <= weekEnd && String(event.endDate || "") >= weekStart;
    });
    context.forEach(event => root.appendChild(createAcademyCalendarBadge(event)));
    root.classList.toggle("hidden", context.length === 0);
  }

  function createAcademyCalendarBadge(event) {
    const badge = document.createElement("span");
    const type = String(event.eventType || "EVENT").toUpperCase();
    badge.className = `academy-calendar-badge is-${type.toLowerCase().replace(/_/g, "-")}`;
    badge.textContent = String(event.description || "Calendar");
    if (String(event.teachingImpact || "").toUpperCase() === "NO_TEACHING") badge.classList.add("is-no-teaching");
    return badge;
  }

  function createAcademySessionCard(session) {
    const card = document.createElement("article");
    card.className = `academy-session ${session.relevant ? "is-relevant" : "is-academy"}`;
    if (String(session.visibilityLevel || "").toUpperCase() === "LABEL") card.classList.add("is-label-only");
    if (String(session.status || "").toUpperCase() === "CANCELLED") card.classList.add("is-cancelled");

    const meta = document.createElement("div");
    meta.className = "academy-session-meta";
    const time = document.createElement("strong");
    time.textContent = formatAcademyTimeRange(session.startTime, session.endTime);
    const kind = document.createElement("span");
    kind.className = "academy-session-kind";
    kind.textContent = String(session.kind || "").toUpperCase() === "GLOBAL" ? "GLOBAL COURSE" : "PROGRAM";
    meta.append(time, kind);

    const title = document.createElement("h3");
    title.textContent = String(session.title || "Class");
    card.append(meta, title);

    if (String(session.visibilityLevel || "").toUpperCase() === "DETAIL") {
      const contextName = String(session.programName || session.globalCourseName || "").trim();
      const detail = [contextName && contextName !== title.textContent ? contextName : "", session.moduleName].filter(Boolean).join(" · ");
      if (detail) {
        const line = document.createElement("p");
        line.className = "academy-session-detail";
        line.textContent = detail;
        card.appendChild(line);
      }
      const secondary = [session.group ? `Group ${session.group}` : "", session.teacherName].filter(Boolean).join(" · ");
      if (secondary) {
        const line = document.createElement("p");
        line.className = "academy-session-secondary";
        line.textContent = secondary;
        card.appendChild(line);
      }
    }

    const status = String(session.status || "SCHEDULED").toUpperCase();
    if (status !== "SCHEDULED") {
      const badge = document.createElement("span");
      badge.className = "academy-session-status";
      badge.textContent = status;
      card.appendChild(badge);
    }

    if (session.canOpenZoom && session.zoomLink) {
      const zoom = document.createElement("a");
      zoom.className = "academy-zoom-link";
      zoom.href = String(session.zoomLink);
      zoom.target = "_blank";
      zoom.rel = "noopener noreferrer";
      zoom.textContent = "Join Zoom";
      card.appendChild(zoom);
    }
    return card;
  }

  function createAcademyEmptyState(titleText, detailText) {
    const wrapper = document.createElement("div");
    wrapper.className = "academy-empty-state";
    const title = document.createElement("strong");
    title.textContent = titleText;
    const detail = document.createElement("span");
    detail.textContent = detailText;
    wrapper.append(title, detail);
    return wrapper;
  }

  function moveAcademyWeek(days) {
    if (!state.academyWeekStart) return loadAcademyTimetable({ resetWeek: true, force: true });
    state.academyWeekStart = addAcademyDays(state.academyWeekStart, days);
    return loadAcademyTimetable({ force: true });
  }

  function formatAcademyTime(value) {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(value || "").trim());
    if (!match) return String(value || "").trim();
    return `${String(Number(match[1])).padStart(2, "0")}h${match[2]}`;
  }

  function formatAcademyTimeRange(start, end) {
    const startText = formatAcademyTime(start);
    const endText = formatAcademyTime(end);
    return endText ? `${startText}–${endText}` : startText;
  }

  function formatAcademyDate(value, options) {
    const date = parseAcademyDate(value);
    if (!date) return String(value || "");
    return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(date);
  }

  function addAcademyDays(value, amount) {
    const date = parseAcademyDate(value);
    if (!date) return String(value || "");
    date.setUTCDate(date.getUTCDate() + Number(amount || 0));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function parseAcademyDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isFinite(date.getTime()) ? date : null;
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
    const homeActive = id === "context-view";
    document.body.classList.toggle("account-home-active", homeActive);
    document.querySelector(".account-shell")?.classList.toggle("is-home", homeActive);
    if (!homeActive) byId("logout-button").classList.add("hidden");
    byId("service-message").textContent = "";
  }

  function showInvalid(message) {
    byId("invalid-message").textContent = message;
    showView("invalid-view");
  }

  function setBusy(form, busy) {
    state.busy = busy;
    if (!form) return;
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

  function contextScopeLabel(scope) {
    const normalized = String(scope || "").trim().toUpperCase();
    if (normalized === "PLATFORM") return "Platform";
    if (normalized === "GLOBAL") return "Global Library";
    return "Program";
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
