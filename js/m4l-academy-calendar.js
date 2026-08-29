/* M4L V102.12.1 - Academy Calendar administration UI. */
(function () {
  "use strict";

  const model = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    events: [],
    storedEvents: [],
    loaded: false,
    loading: false
  };
  let bound = false;

  function role() {
    return String(typeof state !== "undefined" && state?.user?.role || "").trim().toUpperCase();
  }
  function allowed() { return ["ADMIN", "GLOBAL_ADMIN"].includes(role()); }

  function syncAccess() {
    const button = document.getElementById("open-academy-calendar-btn");
    const ok = allowed();
    if (button) {
      button.classList.toggle("hidden", !ok);
      button.disabled = !ok;
      button.setAttribute("aria-hidden", ok ? "false" : "true");
    }
    return ok;
  }

  async function show() {
    if (!syncAccess()) {
      alert("Academy Calendar is available to ADMIN and GLOBAL_ADMIN accounts only.");
      return false;
    }
    bind();
    if (typeof showScreen !== "function" || !showScreen("academy-calendar-screen")) return false;
    await load(true);
    return true;
  }

  function bind() {
    if (bound) return;
    bound = true;
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
  }

  async function handleClick(event) {
    const target = event.target?.closest?.("[data-academy-calendar-action]");
    if (!target || target.disabled) return;
    const action = target.dataset.academyCalendarAction || "";
    if (action === "open") { event.preventDefault(); return show(); }
    if (!target.closest("#academy-calendar-screen")) return;
    event.preventDefault();
    if (action === "reload") return load(true);
    if (action === "prev-month") return moveMonth(-1);
    if (action === "next-month") return moveMonth(1);
    if (action === "today") return goToday();
    if (action === "new-term") return renderTermEditor(null, true);
    if (action === "edit-term") return renderTermEditor(storedById(target.dataset.eventId), true);
    if (action === "edit-islamic") return renderIslamicEditor(storedById(target.dataset.eventId), true);
    if (action === "cancel-editor") return renderEditorPlaceholder();
    if (action === "save-term") return saveEditor(target, "TERM");
    if (action === "save-islamic") return saveEditor(target, "ISLAMIC_DAY");
  }

  function handleChange(event) {
    if (!event.target?.closest?.("#academy-calendar-screen")) return;
    if (event.target.id === "academy-calendar-year") {
      model.year = Number(event.target.value) || new Date().getFullYear();
      void load(true);
    }
  }

  async function load(force) {
    if (model.loading || !allowed()) return false;
    if (model.loaded && !force) { render(); return true; }
    model.loading = true;
    setMessage("Loading Academy Calendar…", "");
    setContent('<p class="helper-text">Loading Academy Calendar…</p>');
    try {
      const result = await apiPost("/api/admin/platform/calendar/get", { year: model.year });
      if (!result.success) throw new Error(result.detail || result.error || "Unable to load Academy Calendar");
      model.events = array(result.events);
      model.storedEvents = array(result.storedEvents);
      model.loaded = true;
      render();
      setMessage("", "");
      return true;
    } catch (error) {
      setMessage(error.message || "Academy Calendar unavailable.", "error");
      setContent('<div class="academy-calendar-empty"><strong>Academy Calendar unavailable</strong><button type="button" data-academy-calendar-action="reload">Try again</button></div>');
      return false;
    } finally {
      model.loading = false;
    }
  }

  function render() {
    setContent(`
      <div class="academy-calendar-shell">
        <div class="academy-calendar-toolbar">
          <div class="academy-calendar-month-actions">
            <button type="button" class="academy-calendar-icon-button" data-academy-calendar-action="prev-month" aria-label="Previous month" title="Previous month">‹</button>
            <strong>${html(monthName(model.month))} ${model.year}</strong>
            <button type="button" class="academy-calendar-icon-button" data-academy-calendar-action="next-month" aria-label="Next month" title="Next month">›</button>
            <button type="button" class="academy-calendar-today-button" data-academy-calendar-action="today">Today</button>
          </div>
          <label class="academy-calendar-year-field"><span>Year</span><input id="academy-calendar-year" type="number" min="2025" max="2100" value="${model.year}" /></label>
        </div>
        ${monthGrid()}
        <div class="academy-calendar-admin-grid">
          ${termsPanel()}
          ${islamicPanel()}
        </div>
        <section class="academy-calendar-panel academy-calendar-public-panel">
          <h3>Public Holidays</h3>
          <div class="academy-calendar-public-list">${publicHolidayRows()}</div>
        </section>
        <section id="academy-calendar-editor" class="academy-calendar-panel academy-calendar-editor"></section>
      </div>
    `);
    renderEditorPlaceholder();
  }

  function monthGrid() {
    const first = new Date(Date.UTC(model.year, model.month, 1));
    const daysInMonth = new Date(Date.UTC(model.year, model.month + 1, 0)).getUTCDate();
    const firstMondayIndex = (first.getUTCDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < firstMondayIndex; i += 1) cells.push('<div class="academy-calendar-day is-blank" aria-hidden="true"></div>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = iso(model.year, model.month + 1, day);
      const events = eventsOn(date);
      const today = date === todayIso();
      cells.push(`<div class="academy-calendar-day ${today ? "is-today" : ""}">
        <span class="academy-calendar-day-number">${day}</span>
        <div class="academy-calendar-day-events">${events.map(calendarChip).join("")}</div>
      </div>`);
    }
    return `<section class="academy-calendar-panel academy-calendar-month">
      <div class="academy-calendar-weekdays">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => `<span>${day}</span>`).join("")}</div>
      <div class="academy-calendar-grid">${cells.join("")}</div>
    </section>`;
  }

  function calendarChip(event) {
    const cls = `is-${String(event.eventType || "event").toLowerCase().replace(/_/g,"-")}`;
    return `<span class="academy-calendar-chip ${cls}" title="${attr(event.description)}">${html(event.description)}</span>`;
  }

  function termsPanel() {
    const terms = model.storedEvents.filter(event => event.eventType === "TERM" && overlapsYear(event));
    return `<section class="academy-calendar-panel">
      <div class="academy-calendar-panel-heading"><h3>Terms</h3><button type="button" class="academy-calendar-secondary" data-academy-calendar-action="new-term">New term</button></div>
      <div class="academy-calendar-table-wrap"><table class="academy-calendar-table"><thead><tr><th>Term</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead><tbody>
        ${terms.length ? terms.map(event => `<tr><td>${html(event.description)}</td><td>${html(formatDate(event.startDate))}</td><td>${html(formatDate(event.endDate))}</td><td>${eventActive(event.id) ? "ACTIVE" : "INACTIVE"}</td><td><button type="button" class="academy-calendar-edit-button" data-academy-calendar-action="edit-term" data-event-id="${attr(event.id)}">Edit</button></td></tr>`).join("") : '<tr><td colspan="5">No terms have been set up for this year.</td></tr>'}
      </tbody></table></div>
    </section>`;
  }

  function islamicPanel() {
    const events = model.storedEvents.filter(event => event.eventType === "ISLAMIC_DAY" && String(event.startDate).startsWith(`${model.year}-`));
    return `<section class="academy-calendar-panel">
      <div class="academy-calendar-panel-heading"><h3>Islamic Days</h3></div>
      <div class="academy-calendar-table-wrap"><table class="academy-calendar-table"><thead><tr><th>Description</th><th>Date</th><th>Alternate</th><th></th></tr></thead><tbody>
        ${events.length ? events.map(event => `<tr><td>${html(event.description)}</td><td>${html(formatDate(event.startDate))}</td><td>${html(formatDate(event.alternateDate))}</td><td><button type="button" class="academy-calendar-edit-button" data-academy-calendar-action="edit-islamic" data-event-id="${attr(event.id)}">Edit</button></td></tr>`).join("") : '<tr><td colspan="4">No Islamic reference dates are stored for this year.</td></tr>'}
      </tbody></table></div>
    </section>`;
  }

  function publicHolidayRows() {
    const events = model.events.filter(event => event.eventType === "PUBLIC_HOLIDAY" && String(event.startDate).startsWith(`${model.year}-`));
    return events.map(event => `<span><strong>${html(formatDate(event.startDate))}</strong><em>Public Holiday</em></span>`).join("") || "—";
  }

  function renderTermEditor(event, focus) {
    const root = document.getElementById("academy-calendar-editor");
    if (!root) return;
    root.innerHTML = `<div class="academy-calendar-panel-heading"><h3>${event ? "Modify term" : "Set up a term"}</h3></div>
      <div class="academy-calendar-editor-row">
        ${field("Term", `<input id="academy-calendar-description" type="text" maxlength="120" value="${attr(event?.description || "")}" />`)}
        ${field("Start date", `<input id="academy-calendar-start" type="date" value="${attr(event?.startDate || "")}" />`)}
        ${field("End date", `<input id="academy-calendar-end" type="date" value="${attr(event?.endDate || "")}" />`)}
        ${field("Status", `<select id="academy-calendar-active"><option value="TRUE" ${eventActive(event?.id) ? "selected" : ""}>ACTIVE</option><option value="FALSE" ${event && !eventActive(event.id) ? "selected" : ""}>INACTIVE</option></select>`)}
        ${saveButton("Save term", "save-term", event?.id || "")}
        <button type="button" class="academy-calendar-icon-button" data-academy-calendar-action="cancel-editor" aria-label="Close" title="Close">×</button>
      </div>`;
    if (focus) requestAnimationFrame(() => document.getElementById("academy-calendar-description")?.focus());
  }

  function renderIslamicEditor(event, focus) {
    if (!event) return;
    const root = document.getElementById("academy-calendar-editor");
    if (!root) return;
    root.innerHTML = `<div class="academy-calendar-panel-heading"><h3>${html(event.description)}</h3></div>
      <div class="academy-calendar-editor-row">
        ${field("Date", `<input id="academy-calendar-start" type="date" value="${attr(event.startDate)}" />`)}
        ${field("Alternate date", `<input id="academy-calendar-alternate" type="date" value="${attr(event.alternateDate)}" />`)}
        ${field("Teaching", `<select id="academy-calendar-impact"><option value="INFORMATION" ${event.teachingImpact === "INFORMATION" ? "selected" : ""}>INFORMATION</option><option value="NO_TEACHING" ${event.teachingImpact === "NO_TEACHING" ? "selected" : ""}>NO TEACHING</option></select>`)}
        ${field("Status", `<select id="academy-calendar-active"><option value="TRUE" ${eventActive(event.id) ? "selected" : ""}>ACTIVE</option><option value="FALSE" ${eventActive(event.id) ? "" : "selected"}>INACTIVE</option></select>`)}
        ${saveButton("Save Islamic date", "save-islamic", event.id)}
        <button type="button" class="academy-calendar-icon-button" data-academy-calendar-action="cancel-editor" aria-label="Close" title="Close">×</button>
      </div>`;
    if (focus) requestAnimationFrame(() => document.getElementById("academy-calendar-start")?.focus());
  }

  function renderEditorPlaceholder() {
    const root = document.getElementById("academy-calendar-editor");
    if (root) root.innerHTML = '<span class="academy-calendar-editor-placeholder">Select an Islamic date to adjust it, or set up a term.</span>';
  }

  async function saveEditor(button, type) {
    const eventId = String(button.dataset.eventId || "");
    const existing = storedById(eventId);
    const payload = {
      eventId,
      eventType: type,
      description: type === "TERM" ? value("academy-calendar-description") : existing?.description,
      startDate: value("academy-calendar-start"),
      endDate: type === "TERM" ? value("academy-calendar-end") : value("academy-calendar-start"),
      alternateDate: type === "ISLAMIC_DAY" ? value("academy-calendar-alternate") : "",
      teachingImpact: type === "ISLAMIC_DAY" ? value("academy-calendar-impact") : "INFORMATION",
      active: value("academy-calendar-active") === "TRUE"
    };
    button.disabled = true;
    try {
      const result = await apiPost("/api/admin/platform/calendar/save", payload);
      if (!result.success) throw new Error(result.detail || result.error || "Unable to save Academy Calendar event");
      model.loaded = false;
      await load(true);
      setMessage(type === "TERM" ? "Term saved." : "Islamic date saved.", "success");
    } catch (error) {
      setMessage(error.message || "Unable to save Academy Calendar event.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function moveMonth(delta) {
    let month = model.month + delta;
    let year = model.year;
    if (month < 0) { month = 11; year -= 1; }
    if (month > 11) { month = 0; year += 1; }
    model.month = month; model.year = year;
    void load(true);
  }
  function goToday() { const now = new Date(); model.year = now.getFullYear(); model.month = now.getMonth(); void load(true); }

  function eventActive(id) {
    const event = model.events.find(item => item.id === id);
    if (!event) return true;
    const stored = model.storedEvents.find(item => item.id === id);
    return stored ? stored.active !== false : true;
  }
  function storedById(id) { return model.storedEvents.find(item => item.id === String(id || "")) || null; }
  function overlapsYear(event) { return String(event.startDate || "") <= `${model.year}-12-31` && String(event.endDate || "") >= `${model.year}-01-01`; }
  function eventsOn(date) { return model.events.filter(event => event.startDate <= date && event.endDate >= date); }
  function field(label, control) { return `<label class="academy-calendar-field"><span>${html(label)}</span>${control}</label>`; }
  function saveButton(label, action, id) { return `<button type="button" class="global-save-icon-button academy-calendar-save" data-academy-calendar-action="${action}" data-event-id="${attr(id)}" aria-label="${attr(label)}" title="${attr(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l2 2v16H5V3Zm2 2v5h8V5H7Zm0 14h10v-7H7v7Zm2-12h4V5H9v2Z" fill="currentColor"/></svg></button>`; }
  async function apiPost(path, body) { const token = typeof state !== "undefined" && state?.token || ""; return window.M4LAuth.apiPost(path, body, token); }
  function setContent(markup) { const root = document.getElementById("academy-calendar-content"); if (root) root.innerHTML = markup; }
  function setMessage(text, type) { const root = document.getElementById("academy-calendar-message"); if (!root) return; root.textContent = text || ""; root.classList.toggle("is-error", type === "error"); root.classList.toggle("is-success", type === "success"); }
  function value(id) { return String(document.getElementById(id)?.value || "").trim(); }
  function array(value) { return Array.isArray(value) ? value : []; }
  function monthName(index) { return ["January","February","March","April","May","June","July","August","September","October","November","December"][index] || ""; }
  function iso(year, month, day) { return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`; }
  function todayIso() { const d = new Date(); return iso(d.getFullYear(), d.getMonth()+1, d.getDate()); }
  function formatDate(value) { const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||"")); return m ? `${m[3]} ${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m[2])]} ${m[1]}` : String(value||""); }
  function html(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
  function attr(value) { return html(value); }

  bind();
  window.M4LAcademyCalendar = Object.freeze({ show, load, syncAccess });
})();
