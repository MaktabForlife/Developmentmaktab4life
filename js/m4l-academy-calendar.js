/* M4L V102.12.5 - Academic Calendar refreshed inline administration UI. */
(function () {
  "use strict";

  const model = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    events: [],
    storedEvents: [],
    loaded: false,
    loading: false,
    newTerm: false,
    newPublicHoliday: false
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
      alert("Academic Calendar is available to ADMIN and GLOBAL_ADMIN accounts only.");
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
    if (action === "add-term") { model.newTerm = true; return render(); }
    if (action === "cancel-new-term") { model.newTerm = false; return render(); }
    if (action === "save-term") return saveInlineTerm(target);
    if (action === "save-islamic") return saveInlineIslamic(target);
    if (action === "add-public") { model.newPublicHoliday = true; return render(); }
    if (action === "cancel-new-public") { model.newPublicHoliday = false; return render(); }
    if (action === "save-public") return saveInlinePublicHoliday(target);
    if (action === "delete-public") return deleteInlinePublicHoliday(target);
  }

  function handleChange(event) {
    if (!event.target?.closest?.("#academy-calendar-screen")) return;
    if (event.target.id === "academy-calendar-year") {
      model.year = Number(event.target.value) || new Date().getFullYear();
      model.newTerm = false;
      model.newPublicHoliday = false;
      void load(true);
    }
  }

  async function load(force) {
    if (model.loading || !allowed()) return false;
    if (model.loaded && !force) { render(); return true; }
    model.loading = true;
    setMessage("Loading Academic Calendar…", "");
    setContent('<p class="helper-text">Loading Academic Calendar…</p>');
    try {
      const result = await apiPost("/api/admin/platform/calendar/get", { year: model.year });
      if (!result.success) throw new Error(result.detail || result.error || "Unable to load Academic Calendar");
      model.events = array(result.events);
      model.storedEvents = array(result.storedEvents);
      model.loaded = true;
      render();
      setMessage("", "");
      return true;
    } catch (error) {
      setMessage(error.message || "Academic Calendar unavailable.", "error");
      setContent('<div class="academy-calendar-empty"><strong>Academic Calendar unavailable</strong><button type="button" data-academy-calendar-action="reload">Try again</button></div>');
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
        ${termsPanel()}
        <div class="academy-calendar-reference-grid">
          ${islamicPanel()}
          ${publicHolidayPanel()}
        </div>
      </div>
    `);
    if (model.newTerm) requestAnimationFrame(() => document.querySelector('[data-new-calendar-row="term"] [data-field="description"]')?.focus());
    if (model.newPublicHoliday) requestAnimationFrame(() => document.querySelector('[data-new-calendar-row="public"] [data-field="startDate"]')?.focus());
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
    return `<section class="academy-calendar-panel academy-calendar-month academy-calendar-full-width">
      <div class="academy-calendar-weekdays">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => `<span>${day}</span>`).join("")}</div>
      <div class="academy-calendar-grid">${cells.join("")}</div>
    </section>`;
  }

  function calendarChip(event) {
    const cls = `is-${String(event.eventType || "event").toLowerCase().replace(/_/g,"-")}`;
    const secondary = String(event.eventType || "").toUpperCase() === "ISLAMIC_DAY" && event.islamicDate
      ? `<small>${html(event.islamicDate)}</small>` : "";
    return `<span class="academy-calendar-chip ${cls}" title="${attr(event.description)}"><span>${html(event.description)}</span>${secondary}</span>`;
  }

  function termsPanel() {
    const terms = model.storedEvents
      .filter(event => event.eventType === "TERM" && overlapsYear(event))
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
    const rows = terms.map(termRow).join("");
    const newRow = model.newTerm ? termRow({ id: "", description: "", startDate: "", endDate: "", active: true }, true) : "";
    return `<section class="academy-calendar-panel academy-calendar-terms academy-calendar-full-width">
      <div class="academy-calendar-panel-heading">
        <h3>Terms</h3>
        <button type="button" class="academy-calendar-icon-button" data-academy-calendar-action="add-term" aria-label="Add term" title="Add term">+</button>
      </div>
      <div class="academy-calendar-table-wrap"><table class="academy-calendar-table academy-calendar-inline-table"><thead><tr><th>Term</th><th>Start</th><th>End</th><th>Status</th><th class="academy-calendar-action-column"></th></tr></thead><tbody>
        ${rows || (!model.newTerm ? '<tr><td colspan="5" class="academy-calendar-empty-row">No terms have been set up for this year.</td></tr>' : "")}${newRow}
      </tbody></table></div>
    </section>`;
  }

  function termRow(event, isNew) {
    return `<tr data-calendar-row data-event-type="TERM" data-event-id="${attr(event.id || "")}" ${isNew ? 'data-new-calendar-row="term"' : ""}>
      <td><input class="academy-calendar-inline-input" data-field="description" type="text" maxlength="120" value="${attr(event.description || "")}" aria-label="Term name" /></td>
      <td><input class="academy-calendar-inline-input" data-field="startDate" type="date" value="${attr(event.startDate || "")}" aria-label="Term start date" /></td>
      <td><input class="academy-calendar-inline-input" data-field="endDate" type="date" value="${attr(event.endDate || "")}" aria-label="Term end date" /></td>
      <td>${activeSelect(event.active !== false)}</td>
      <td class="academy-calendar-inline-actions">${saveButton("Save term", "save-term", event.id || "")}${isNew ? iconButton("×", "cancel-new-term", "Cancel new term") : ""}</td>
    </tr>`;
  }

  function islamicPanel() {
    const events = model.storedEvents
      .filter(event => event.eventType === "ISLAMIC_DAY" && event.description !== "First Fast" && String(event.startDate).startsWith(`${model.year}-`))
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
    return `<section class="academy-calendar-panel academy-calendar-islamic-panel">
      <div class="academy-calendar-panel-heading"><h3>Islamic Dates</h3></div>
      <div class="academy-calendar-inline-list">
        ${events.length ? events.map(islamicRow).join("") : '<div class="academy-calendar-empty-row">No Islamic reference dates are stored for this year.</div>'}
      </div>
    </section>`;
  }

  function islamicRow(event) {
    return `<div class="academy-calendar-inline-item academy-calendar-islamic-row" data-calendar-row data-event-type="ISLAMIC_DAY" data-event-id="${attr(event.id)}">
      <div class="academy-calendar-islamic-name">
        <strong>${html(event.description)}</strong>
        ${event.islamicDate ? `<small>${html(event.islamicDate)}</small>` : ""}
      </div>
      <div class="academy-calendar-islamic-fields">
        ${compactField("Date", `<input data-field="startDate" type="date" value="${attr(event.startDate)}" />`)}
        ${compactField("Status", activeSelect(event.active !== false, true))}
      </div>
      <div class="academy-calendar-inline-actions">${saveButton("Save Islamic date", "save-islamic", event.id)}</div>
    </div>`;
  }

  function publicHolidayPanel() {
    const events = model.events
      .filter(event => event.eventType === "PUBLIC_HOLIDAY" && String(event.startDate).startsWith(`${model.year}-`))
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
    const newRow = model.newPublicHoliday ? publicHolidayRow({ id: "", description: "Public Holiday", startDate: "" }, true) : "";
    return `<section class="academy-calendar-panel academy-calendar-public-panel">
      <div class="academy-calendar-panel-heading"><h3>Holidays</h3></div>
      <div class="academy-calendar-inline-list academy-calendar-public-list">
        ${events.length ? events.map(event => publicHolidayRow(event, false)).join("") : (!model.newPublicHoliday ? '<div class="academy-calendar-empty-row">No Holidays are active for this year.</div>' : "")}
        ${newRow}
      </div>
      <button type="button" class="academy-calendar-add-after-list" data-academy-calendar-action="add-public" aria-label="Add Holiday" title="Add Holiday">+</button>
    </section>`;
  }

  function publicHolidayRow(event, isNew) {
    return `<div class="academy-calendar-inline-item academy-calendar-public-row" data-calendar-row data-event-type="PUBLIC_HOLIDAY" data-event-id="${attr(event.id || "")}" data-original-date="${attr(event.startDate || "")}" ${isNew ? 'data-new-calendar-row="public"' : ""}>
      <input class="academy-calendar-inline-input" data-field="description" type="text" maxlength="120" value="${attr(event.description || "Public Holiday")}" aria-label="Holiday description" />
      <input class="academy-calendar-inline-input" data-field="startDate" type="date" value="${attr(event.startDate || "")}" aria-label="Holiday date" />
      <div class="academy-calendar-inline-actions">
        ${saveButton("Save Holiday", "save-public", event.id || "")}
        ${iconButton("×", isNew ? "cancel-new-public" : "delete-public", isNew ? "Cancel new Holiday" : "Delete Holiday", event.id || "")}
      </div>
    </div>`;
  }

  async function saveInlineTerm(button) {
    const row = button.closest("[data-calendar-row]");
    if (!row) return;
    return saveRow(button, {
      eventId: row.dataset.eventId || "",
      eventType: "TERM",
      description: rowValue(row, "description"),
      startDate: rowValue(row, "startDate"),
      endDate: rowValue(row, "endDate"),
      teachingImpact: "INFORMATION",
      active: rowValue(row, "active") === "TRUE"
    }, "Term saved.", () => { model.newTerm = false; });
  }

  async function saveInlineIslamic(button) {
    const row = button.closest("[data-calendar-row]");
    if (!row) return;
    return saveRow(button, {
      eventId: row.dataset.eventId || "",
      eventType: "ISLAMIC_DAY",
      startDate: rowValue(row, "startDate"),
      teachingImpact: "INFORMATION",
      active: rowValue(row, "active") === "TRUE"
    }, "Islamic date saved.");
  }

  async function saveInlinePublicHoliday(button) {
    const row = button.closest("[data-calendar-row]");
    if (!row) return;
    return saveRow(button, {
      eventId: row.dataset.eventId || "",
      eventType: "PUBLIC_HOLIDAY",
      originalDate: row.dataset.originalDate || "",
      description: rowValue(row, "description") || "Public Holiday",
      startDate: rowValue(row, "startDate"),
      endDate: rowValue(row, "startDate"),
      teachingImpact: "NO_TEACHING",
      active: true
    }, "Holiday saved.", () => { model.newPublicHoliday = false; });
  }

  async function deleteInlinePublicHoliday(button) {
    const row = button.closest("[data-calendar-row]");
    if (!row) return;
    button.disabled = true;
    try {
      const result = await apiPost("/api/admin/platform/calendar/save", {
        eventId: row.dataset.eventId || "",
        eventType: "PUBLIC_HOLIDAY",
        originalDate: row.dataset.originalDate || "",
        startDate: row.dataset.originalDate || rowValue(row, "startDate"),
        active: false
      });
      if (!result.success) throw new Error(result.detail || result.error || "Unable to delete Holiday");
      model.loaded = false;
      await load(true);
      setMessage("Holiday removed.", "success");
    } catch (error) {
      setMessage(error.message || "Unable to delete Holiday.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function saveRow(button, payload, successMessage, onSuccess) {
    button.disabled = true;
    try {
      const result = await apiPost("/api/admin/platform/calendar/save", payload);
      if (!result.success) throw new Error(result.detail || result.error || "Unable to save Academic Calendar event");
      if (typeof onSuccess === "function") onSuccess();
      model.loaded = false;
      await load(true);
      setMessage(successMessage, "success");
    } catch (error) {
      setMessage(error.message || "Unable to save Academic Calendar event.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function moveMonth(delta) {
    let month = model.month + delta;
    let year = model.year;
    if (month < 0) { month = 11; year -= 1; }
    if (month > 11) { month = 0; year += 1; }
    model.month = month;
    model.year = year;
    model.newTerm = false;
    model.newPublicHoliday = false;
    void load(true);
  }

  function goToday() {
    const now = new Date();
    model.year = now.getFullYear();
    model.month = now.getMonth();
    model.newTerm = false;
    model.newPublicHoliday = false;
    void load(true);
  }

  function activeSelect(active, compact) {
    return `<select ${compact ? "" : 'class="academy-calendar-inline-select"'} data-field="active" aria-label="Status"><option value="TRUE" ${active ? "selected" : ""}>ACTIVE</option><option value="FALSE" ${active ? "" : "selected"}>INACTIVE</option></select>`;
  }

  function compactField(label, control) {
    return `<label class="academy-calendar-compact-field"><span>${html(label)}</span>${control}</label>`;
  }

  function saveButton(label, action, id) {
    return `<button type="button" class="global-save-icon-button academy-calendar-save" data-academy-calendar-action="${action}" data-event-id="${attr(id)}" aria-label="${attr(label)}" title="${attr(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l2 2v16H5V3Zm2 2v5h8V5H7Zm0 14h10v-7H7v7Zm2-12h4V5H9v2Z" fill="currentColor"/></svg></button>`;
  }

  function iconButton(glyph, action, label, id) {
    return `<button type="button" class="academy-calendar-icon-button" data-academy-calendar-action="${action}" data-event-id="${attr(id || "")}" aria-label="${attr(label)}" title="${attr(label)}">${html(glyph)}</button>`;
  }

  function rowValue(row, name) {
    return String(row.querySelector(`[data-field="${name}"]`)?.value || "").trim();
  }
  function eventsOn(date) { return model.events.filter(event => event.startDate <= date && event.endDate >= date); }
  function overlapsYear(event) { return String(event.startDate || "") <= `${model.year}-12-31` && String(event.endDate || "") >= `${model.year}-01-01`; }
  async function apiPost(path, body) { const token = typeof state !== "undefined" && state?.token || ""; return window.M4LAuth.apiPost(path, body, token); }
  function setContent(markup) { const root = document.getElementById("academy-calendar-content"); if (root) root.innerHTML = markup; }
  function setMessage(text, type) { const root = document.getElementById("academy-calendar-message"); if (!root) return; root.textContent = text || ""; root.classList.toggle("is-error", type === "error"); root.classList.toggle("is-success", type === "success"); }
  function array(value) { return Array.isArray(value) ? value : []; }
  function monthName(index) { return ["January","February","March","April","May","June","July","August","September","October","November","December"][index] || ""; }
  function iso(year, month, day) { return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`; }
  function todayIso() { const d = new Date(); return iso(d.getFullYear(), d.getMonth()+1, d.getDate()); }
  function html(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
  function attr(value) { return html(value); }

  bind();
  window.M4LAcademyCalendar = Object.freeze({ show, load, syncAccess });
})();
