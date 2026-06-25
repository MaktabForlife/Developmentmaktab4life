/* M4L v50 - Admin Academics / Curriculum module
   Load after /app.js, /js/m4l-auth.js, /js/m4l-shell.js, and /js/m4l-attendance.js.
   This is a classic script, not type=module, so existing onclick/global calls remain safe
   while the app is split gradually.
   Owns Admin menu preparation, placeholder screens, and Subjects/Curriculum management.
*/

let currentPlaceholderTitle = "";

function showPlaceholder(title) {
  currentPlaceholderTitle = String(title || "").trim();
  setDomText("placeholder-title", currentPlaceholderTitle || "Screen");
  showScreen("placeholder-screen");
}

function showAdminAcademics() {
  prepareAdminAcademicsScreen();
  showScreen("admin-academics");
}

function prepareAdminAcademicsScreen() {
  const screen = document.getElementById("admin-academics");
  if (!screen) return;

  const title = screen.querySelector("h2");
  if (title) {
    title.innerText = "Add or Modify";
  }

  screen.querySelectorAll("button").forEach(button => {
    const text = String(button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (text === "add / modify students" || text === "add/modify students") {
      button.textContent = "Students";
    }
  });
}

/* =========================
   SUBJECTS UI
========================= */

let adminSubjectUiHandlersBound = false;

function bindAdminSubjectUiHandlers(containerOrId) {
  if (adminSubjectUiHandlersBound !== true) {
    if (!document || typeof document.addEventListener !== "function") {
      return false;
    }

    adminSubjectUiHandlersBound = true;
    document.addEventListener("click", handleAdminSubjectUiClick);
    document.addEventListener("keydown", handleAdminSubjectUiKeydown);
    document.addEventListener("change", handleAdminSubjectUiChange);
  }

  return !containerOrId || !!getDomElement(containerOrId);
}

function getAdminSubjectActionElement(event) {
  const target = event && event.target;
  if (!target || typeof target.closest !== "function") return null;

  const actionEl = target.closest("[data-subject-action]");
  if (!actionEl) return null;

  const scope = actionEl.closest(
    "#subjects-screen, #subject-add-list, #modify-subject-box"
  );

  return scope ? actionEl : null;
}

function handleAdminSubjectUiClick(event) {
  const actionEl = getAdminSubjectActionElement(event);
  if (!actionEl || actionEl.disabled) return;

  const action = actionEl.dataset.subjectAction || "";
  if (!action) return;

  event.preventDefault();

  if (action === "add-pending") {
    addPendingSubject();
    return;
  }

  if (action === "remove-pending") {
    removePendingSubject(Number(actionEl.dataset.subjectIndex || -1));
    return;
  }

  if (action === "submit-pending") {
    submitPendingSubjects();
    return;
  }

  if (action === "toggle-status") {
    toggleSubjectStatusLocal();
    return;
  }

  if (action === "save-subject") {
    saveSubjectChanges();
  }
}

function handleAdminSubjectUiKeydown(event) {
  const target = event && event.target;
  if (!target) return;

  if (target.id === "new-subject-input" && event.key === "Enter") {
    event.preventDefault();
    addPendingSubject();
  }
}

function handleAdminSubjectUiChange(event) {
  const target = event && event.target;
  if (!target || target.id !== "modify-subject-select") return;
  selectSubjectToModify();
}

let allSubjects = [];
let pendingSubjects = [];
let selectedSubject = null;
let selectedSubjectDraftActive = null;

async function showSubjectsScreen() {
  const didShow = showScreen("subjects-screen");
  if (!didShow) return;

  bindAdminSubjectUiHandlers("subjects-screen");

  pendingSubjects = [];
  selectedSubject = null;
  selectedSubjectDraftActive = null;

  setDomText("subject-add-message", "");
  hideDomElement("modify-subject-box");

  renderSubjectAddRows();
  await loadSubjectsForModify();
}

function renderSubjectAddRows() {
  const container = getDomElement("subject-add-list");
  const submitBtn = getDomElement("submit-subjects-btn");

  if (!container) {
    console.warn("Missing subject add list container.");
    return;
  }

  let html = "";

  pendingSubjects.forEach((name, index) => {
    html += `
      <div class="pending-subject-chip">
        <span>${escapeHtml(name)}</span>
        <button type="button" data-subject-action="remove-pending" data-subject-index="${index}">Remove</button>
      </div>
    `;
  });

  if (pendingSubjects.length < 5) {
    html += `
      <div class="subject-add-row">
        <input
          id="new-subject-input"
          type="text"
          placeholder="add a new subject"
        />
        <button type="button" class="enter-btn" data-subject-action="add-pending">↵</button>
      </div>
    `;
  }

  setDomHtml(container, html);
  bindAdminSubjectUiHandlers(container);

  if (submitBtn) {
    submitBtn.classList.toggle("hidden", pendingSubjects.length === 0);
    submitBtn.type = "button";
    submitBtn.dataset.subjectAction = "submit-pending";
    submitBtn.removeAttribute("onclick");
  }
}

function handleSubjectInputKey(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    addPendingSubject();
  }
}

function addPendingSubject() {
  const input = document.getElementById("new-subject-input");
  const subjectName = input ? input.value.trim() : "";

  if (!subjectName) {
    alert("Enter a subject name.");
    return;
  }

  if (pendingSubjects.length >= 5) {
    alert("You can add up to 5 subjects at once.");
    return;
  }

  const normalizedNew = normalizeClientText(subjectName);

  const duplicatePending = pendingSubjects.some(
    name => normalizeClientText(name) === normalizedNew
  );

  if (duplicatePending) {
    alert("This subject is already in your pending list.");
    return;
  }

  const duplicateExisting = allSubjects.some(
    subject => normalizeClientText(subject.subjectname) === normalizedNew
  );

  if (duplicateExisting) {
    alert("This subject already exists.");
    return;
  }

  pendingSubjects.push(subjectName);
  renderSubjectAddRows();

  setTimeout(() => {
    const nextInput = document.getElementById("new-subject-input");
    if (nextInput) nextInput.focus();
  }, 50);
}

function removePendingSubject(index) {
  const safeIndex = Number(index);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= pendingSubjects.length) {
    return;
  }

  pendingSubjects.splice(safeIndex, 1);
  renderSubjectAddRows();
}

async function submitPendingSubjects() {
  if (pendingSubjects.length === 0) {
    return;
  }

  const added = [];
  const failed = [];

  for (const subjectName of pendingSubjects) {
    const result = await apiPost("/api/admin/subjects/create", {
      subjectName
    }, state.token);

    if (result.success) {
      added.push(result.subject.subjectname);
    } else {
      failed.push({
        subjectName,
        error: result.error || "Failed"
      });
    }
  }

  if (added.length > 0) {
    setDomText(
      "subject-add-message",
      `${added.join(", ")} ${added.length === 1 ? "has" : "have"} been added.`
    );
  }

  if (failed.length > 0) {
    alert(
      "Some subjects were not added:\n" +
      failed.map(f => `${f.subjectName}: ${f.error}`).join("\n")
    );
  }

  pendingSubjects = [];
  renderSubjectAddRows();
  await loadSubjectsForModify();
}

async function loadSubjectsForModify() {
  const select = getDomElement("modify-subject-select");

  if (!select) {
    console.warn("Missing modify subject select.");
    return;
  }

  select.removeAttribute("onchange");
  select.innerHTML = `<option value="">Loading subjects...</option>`;

  let result;
  try {
    result = await apiPost("/api/admin/subjects/list", {}, state.token);
  } catch (error) {
    console.error("Failed to load subjects:", error);
    select.innerHTML = `<option value="">Failed to load subjects</option>`;
    return;
  }

  if (!result.success) {
    select.innerHTML = `<option value="">Failed to load subjects</option>`;
    return;
  }

  allSubjects = result.subjects || [];

  select.innerHTML = `<option value="">Select subject...</option>`;

  allSubjects.forEach(subject => {
    const status = subject.active === true ? "ACTIVE" : "INACTIVE";

    const option = document.createElement("option");
    option.value = subject.subjectid;
    option.textContent = `${subject.subjectname} — ${status}`;

    select.appendChild(option);
  });
}

function selectSubjectToModify() {
  const select = getDomElement("modify-subject-select");
  const box = getDomElement("modify-subject-box");
  const nameInput = getDomElement("modify-subject-name");

  if (!select) {
    selectedSubject = null;
    selectedSubjectDraftActive = null;
    return;
  }

  const subjectid = select.value;
  selectedSubject = allSubjects.find(subject => subject.subjectid === subjectid);

  if (!selectedSubject) {
    if (box) box.classList.add("hidden");
    selectedSubjectDraftActive = null;
    return;
  }

  selectedSubjectDraftActive = selectedSubject.active === true;

  if (nameInput) {
    nameInput.value = selectedSubject.subjectname;
  }

  const statusBtn = getDomElement("toggle-subject-status-btn");
  if (statusBtn) {
    statusBtn.type = "button";
    statusBtn.dataset.subjectAction = "toggle-status";
    statusBtn.removeAttribute("onclick");
  }

  const saveBtn = getDomElement("save-subject-changes-btn");
  if (saveBtn) {
    saveBtn.type = "button";
    saveBtn.dataset.subjectAction = "save-subject";
    saveBtn.removeAttribute("onclick");
  }

  renderSelectedSubjectStatus();

  if (box) box.classList.remove("hidden");
}

function renderSelectedSubjectStatus() {
  const statusDisplay = getDomElement("selected-subject-status");
  const statusBtn = getDomElement("toggle-subject-status-btn");

  if (!selectedSubject) {
    if (statusDisplay) statusDisplay.innerText = "STATUS: -";
    if (statusBtn) statusBtn.innerText = "Change Status";
    return;
  }

  if (statusDisplay) {
    statusDisplay.innerText = selectedSubjectDraftActive
      ? "STATUS: ACTIVE"
      : "STATUS: INACTIVE";
  }

  if (statusBtn) {
    statusBtn.innerText = selectedSubjectDraftActive
      ? "Make Inactive"
      : "Make Active";
  }
}

function toggleSubjectStatusLocal() {
  if (!selectedSubject) {
    alert("Select a subject first.");
    return;
  }

  selectedSubjectDraftActive = !selectedSubjectDraftActive;
  renderSelectedSubjectStatus();
}

async function saveSubjectChanges() {
  if (!selectedSubject) {
    alert("Select a subject first.");
    return;
  }

  const nameInput = getDomElement("modify-subject-name");
  const subjectName = nameInput ? nameInput.value.trim() : "";

  if (!subjectName) {
    alert("Subject name cannot be empty.");
    return;
  }

  let result;
  try {
    result = await apiPost("/api/admin/subjects/update", {
      subjectid: selectedSubject.subjectid,
      subjectName,
      active: selectedSubjectDraftActive
    }, state.token);
  } catch (error) {
    console.error("Could not update subject:", error);
    alert("Could not update subject.");
    return;
  }

  if (!result.success) {
    alert(result.error || "Could not update subject.");
    return;
  }

  alert("Subject changes saved.");

  await loadSubjectsForModify();

  hideDomElement("modify-subject-box");
  selectedSubject = null;
  selectedSubjectDraftActive = null;
}

window.M4LAdminAcademics = {
  showPlaceholder,
  showAdminAcademics,
  prepareAdminAcademicsScreen,
  bindAdminSubjectUiHandlers,
  showSubjectsScreen,
  renderSubjectAddRows,
  handleSubjectInputKey,
  addPendingSubject,
  removePendingSubject,
  submitPendingSubjects,
  loadSubjectsForModify,
  selectSubjectToModify,
  renderSelectedSubjectStatus,
  toggleSubjectStatusLocal,
  saveSubjectChanges
};
