/* M4L v41 - Resources / Media module
   Load after /app.js, /js/m4l-auth.js, /js/m4l-shell.js, and /js/m4l-timetable.js.
   This is a classic script, not type=module, so existing global function calls remain safe
   while the app is split gradually.
   Owns Library/Resources drilldown plus PDF/audio/video resource viewing.
*/

/* =========================
   STUDENT RESOURCE VIEW
========================= */

let studentResourceSubjects = [];
let studentResourceGroupsByType = {};
let currentStudentResourceMode = "";
let currentStudentResourceSubjectKey = "";
let currentStudentResourceSubjectName = "";
let currentStudentResourceSubjectCategoryCounts = {};
let currentStudentResourceModuleKey = "";
let currentStudentResourceModuleName = "";
let currentStudentResourceDetailReturnScreen = "";
let studentResourceViewMode = "student";
const PDFJS_VIEWER_PATH = "/pdf-viewer/web/viewer.html";

let previousPdfScreenId = "";
let currentPdfDirectLink = "";

const STUDENT_RESOURCE_CATEGORIES = [
  {
    key: "VIDEO",
    label: "Video",
    subtitle: "Movie and video resources"
  },
  {
    key: "AUDIO",
    label: "Audio",
    subtitle: "Listening resources"
  },
  {
    key: "EBOOKS",
    label: "eBooks",
    subtitle: "Books and reading resources"
  },
  {
    key: "PRINTABLES",
    label: "Printables",
    subtitle: "Worksheets and printable files"
  },
  {
    key: "OTHER",
    label: "Other",
    subtitle: "Images, links, text and other files"
  }
];

function resetStudentResourceSelection() {
  currentStudentResourceMode = "";
  currentStudentResourceSubjectKey = "";
  currentStudentResourceSubjectName = "";
  currentStudentResourceSubjectCategoryCounts = {};
  currentStudentResourceModuleKey = "";
  currentStudentResourceModuleName = "";
  currentStudentResourceDetailReturnScreen = "";
  closeStudentResourceModulePicker();
}

async function showStudentResources() {
  studentResourceViewMode = "student";
  resetStudentResourceSelection();
  setResourceScreensForStudent();
  await loadResourceCategories("/api/resources/list", {});
}

async function showAdminResources() {
  studentResourceViewMode = "admin";
  resetStudentResourceSelection();
  setResourceScreensForAdmin();
  await loadResourceCategories("/api/resources/list", {});
}

function setResourceScreensForStudent() {
  ["student-resources-subjects", "student-resources-media", "student-resources-modules", "student-resources-detail"].forEach(id => {
    const screen = document.getElementById(id);
    if (!screen) return;
    screen.classList.remove("admin-theme");
    screen.classList.add("student-theme");
  });

  const listTitle = document.querySelector("#student-resources-subjects h2");
  if (listTitle) listTitle.innerText = "Library";

  const listBackButton = document.querySelector("#student-resources-subjects .small-btn");
  setHomeIconButton(listBackButton, "showScreen('student-home')");

  const mediaBackButton = document.querySelector("#student-resources-media .small-btn");
  setBackIconButton(mediaBackButton, "showScreen('student-resources-subjects')");

  const moduleBackButton = document.querySelector("#student-resources-modules .small-btn");
  setBackIconButton(moduleBackButton, "showScreen('student-resources-media')");

  const detailBackButton = document.querySelector("#student-resources-detail .small-btn");
  setBackIconButton(detailBackButton, "goBackFromStudentResourceDetail()");
}

function setResourceScreensForAdmin() {
  ["student-resources-subjects", "student-resources-media", "student-resources-modules", "student-resources-detail"].forEach(id => {
    const screen = document.getElementById(id);
    if (!screen) return;
    screen.classList.remove("student-theme");
    screen.classList.add("admin-theme");
  });

  const listTitle = document.querySelector("#student-resources-subjects h2");
  if (listTitle) listTitle.innerText = "Resources";

  const listBackButton = document.querySelector("#student-resources-subjects .small-btn");
  setHomeIconButton(listBackButton, "showScreen('admin-home')");

  const mediaBackButton = document.querySelector("#student-resources-media .small-btn");
  setBackIconButton(mediaBackButton, "showScreen('student-resources-subjects')");

  const moduleBackButton = document.querySelector("#student-resources-modules .small-btn");
  setBackIconButton(moduleBackButton, "showScreen('student-resources-media')");

  const detailBackButton = document.querySelector("#student-resources-detail .small-btn");
  setBackIconButton(detailBackButton, "goBackFromStudentResourceDetail()");
}

async function fetchResourceCategories(apiPath, body = {}) {
  let result = await apiPost(apiPath, body, state.token);

  // Temporary compatibility fallback while the Worker routes are being stabilised.
  // Resources are now common to students and staff, so all resource routes should return the same library.
  if (!result.success && String(result.error || "").toLowerCase() === "not found") {
    const fallbackPaths = [
      "/api/resources/list",
      "/api/student/resources/list",
      "/api/admin/resources/list"
    ].filter(path => path !== apiPath);

    for (const fallbackPath of fallbackPaths) {
      const fallbackResult = await apiPost(fallbackPath, body, state.token);
      if (fallbackResult && fallbackResult.success) {
        result = fallbackResult;
        break;
      }
    }
  }

  if (!result.success) {
    throw new Error(result.error || "Failed to load resources");
  }

  // New backend response is grouped by media type: result.groups.
  // Older response shape used result.subjects. Keep both supported for safety.
  studentResourceSubjects = Array.isArray(result.subjects) ? result.subjects : [];
  studentResourceGroupsByType = normalizeStudentResourceGroups(result);

  return result;
}

async function loadResourceCategories(apiPath, body = {}) {
  if (!showScreen("student-resources-subjects")) {
    console.warn("Resources screen is missing; resource categories were not shown.");
    return;
  }

  const container = getDomElement("student-resource-subject-list");

  if (!container) {
    console.warn("Missing resource subject list container.");
    return;
  }

  setDomHtml(container, `<p class="helper-text">Loading resources...</p>`);

  try {
    await fetchResourceCategories(apiPath, body);
    renderStudentResourceSubjects();
  } catch (err) {
    setDomHtml(container, `<p class="error-message">${escapeHtml(err.message || "Unable to load resources. Please try again.")}</p>`);
  }
}

async function openStudentResourceDirect(categoryKey) {
  const category = STUDENT_RESOURCE_CATEGORIES.find(item => item.key === String(categoryKey || "").toUpperCase());

  if (!category) {
    alert("Resource category not found. Please reload resources.");
    return;
  }

  studentResourceViewMode = "student";
  setResourceScreensForStudent();
  currentStudentResourceMode = category.key;
  currentStudentResourceSubjectKey = "";
  currentStudentResourceSubjectName = "";
  currentStudentResourceSubjectCategoryCounts = {};
  currentStudentResourceModuleKey = "";
  currentStudentResourceModuleName = "";

  const container = getDomElement("student-resource-detail-content");

  setDomText("student-resource-detail-title", category.label);
  setDomHtml(container, `<p class="helper-text">Loading ${escapeHtml(category.label)} resources...</p>`);

  if (!showScreen("student-resources-detail")) {
    console.warn("Resource detail screen is missing.");
    return;
  }

  try {
    await fetchResourceCategories("/api/resources/list", {});
    renderStudentResourceCategoryDetail(category);
  } catch (err) {
    setDomHtml(container, `<p class="error-message">${escapeHtml(err.message || "Unable to load resources. Please try again.")}</p>`);
  }
}

function normalizeStudentResourceGroups(result) {
  const map = {};

  function addGroup(group, fallbackType) {
    if (!group) return;

    const type = String(group.type || group.key || fallbackType || "").trim().toUpperCase();
    if (!type) return;

    const subjects = Array.isArray(group.subjects) ? group.subjects : [];

    map[type] = {
      type,
      label: group.label || getCategoryLabel(type),
      count: Number(group.count || 0),
      subjects
    };
  }

  if (Array.isArray(result.groups)) {
    result.groups.forEach(group => addGroup(group));
  }

  addGroup(result.ebooks, "EBOOKS");
  addGroup(result.printables, "PRINTABLES");
  addGroup(result.audio, "AUDIO");
  addGroup(result.video, "VIDEO");
  addGroup(result.other, "OTHER");

  // Backward compatibility if an older backend still sends PDF instead of eBooks/Printables.
  addGroup(result.pdf, "EBOOKS");

  Object.keys(map).forEach(type => {
    const calculatedCount = countResourcesInSubjects(map[type].subjects);

    if (!map[type].count && calculatedCount) {
      map[type].count = calculatedCount;
    }
  });

  return map;
}

function getCategoryLabel(type) {
  const category = STUDENT_RESOURCE_CATEGORIES.find(item => item.key === String(type || "").toUpperCase());
  return category ? category.label : String(type || "Resources");
}

function getResourceCategoryIconPath(categoryKey) {
  const key = String(categoryKey || "").trim().toUpperCase();
  const iconMap = {
    EBOOKS: "/icons/ebook.svg",
    PRINTABLES: "/icons/printables.svg",
    AUDIO: "/icons/audio.svg",
    VIDEO: "/icons/video.svg",
    OTHER: "/icons/other.svg"
  };

  return iconMap[key] || "/icons/resources.svg";
}

function getDirectMediaGroup(category) {
  if (!category) return null;
  const key = String(category.key || "").trim().toUpperCase();
  return studentResourceGroupsByType[key] || null;
}

function getDirectSubjectResources(subject) {
  if (!subject) return [];

  if (Array.isArray(subject.resources)) return subject.resources;
  if (Array.isArray(subject.Resources)) return subject.Resources;
  if (Array.isArray(subject.resourceList)) return subject.resourceList;
  if (Array.isArray(subject.items)) return subject.items;

  return [];
}

function getSubjectModules(subject) {
  if (!subject) return [];

  if (Array.isArray(subject.modules)) return subject.modules;
  if (Array.isArray(subject.Modules)) return subject.Modules;
  if (Array.isArray(subject.moduleList)) return subject.moduleList;

  const directResources = getDirectSubjectResources(subject);
  if (directResources.length > 0) {
    const moduleMap = new Map();

    directResources.forEach(resource => {
      const moduleId = String(
        resource.moduleid ||
        resource.moduleId ||
        resource.ModuleId ||
        resource.ModuleID ||
        resource.Moduleld ||
        subject.moduleid ||
        subject.moduleId ||
        subject.ModuleId ||
        subject.ModuleID ||
        ""
      ).trim();

      const moduleName = String(
        resource.modulename ||
        resource.moduleName ||
        resource.ModuleName ||
        subject.modulename ||
        subject.moduleName ||
        subject.ModuleName ||
        "General"
      ).trim() || "General";

      const moduleKey = moduleId ? `id:${moduleId.toUpperCase()}` : `name:${moduleName.toUpperCase()}`;

      const moduleSortOrder = getResourceModuleSortOrder(resource);

      if (!moduleMap.has(moduleKey)) {
        moduleMap.set(moduleKey, {
          moduleid: moduleId,
          modulename: moduleName,
          modulesortorder: moduleSortOrder,
          resources: []
        });
      } else {
        const existing = moduleMap.get(moduleKey);
        existing.modulesortorder = Math.min(existing.modulesortorder, moduleSortOrder);
      }

      moduleMap.get(moduleKey).resources.push(resource);
    });

    return Array.from(moduleMap.values()).sort((a, b) => compareResourceModuleGroups(a, b));
  }

  return [];
}

function getModuleResources(module) {
  if (!module) return [];

  if (Array.isArray(module.resources)) return module.resources;
  if (Array.isArray(module.Resources)) return module.Resources;
  if (Array.isArray(module.resourceList)) return module.resourceList;
  if (Array.isArray(module.items)) return module.items;

  return [];
}

function countResourcesInSubjects(subjects) {
  if (!Array.isArray(subjects)) return 0;

  return subjects.reduce((subjectTotal, subject) => {
    const moduleTotal = getSubjectModules(subject).reduce((sum, module) => {
      return sum + getModuleResources(module).length;
    }, 0);

    return subjectTotal + moduleTotal;
  }, 0);
}



function compareResourceIds(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function getResourceSubjectId(subjectGroup) {
  return String(subjectGroup && (
    subjectGroup.subjectid ||
    subjectGroup.subjectId ||
    subjectGroup.SubjectId ||
    subjectGroup.SubjectID ||
    subjectGroup.id
  ) || "").trim();
}

function getResourceSubjectKey(subjectGroup) {
  const id = getResourceSubjectId(subjectGroup);
  const name = getResourceSubjectName(subjectGroup);
  return id ? `id:${id.toUpperCase()}` : `name:${name.toUpperCase()}`;
}

function getResourceSubjectName(subjectGroup) {
  return String(subjectGroup && (subjectGroup.subjectname || subjectGroup.SubjectName || subjectGroup.name) || "Subject").trim() || "Subject";
}

function getResourceModuleId(moduleGroup) {
  return String(moduleGroup && (
    moduleGroup.moduleid ||
    moduleGroup.moduleId ||
    moduleGroup.ModuleId ||
    moduleGroup.ModuleID ||
    moduleGroup.id
  ) || "").trim();
}

function getResourceModuleSortOrder(moduleGroup) {
  if (!moduleGroup) {
    return Number.MAX_SAFE_INTEGER;
  }

  const possibleValues = [
    moduleGroup.modulesortorder,
    moduleGroup.moduleSortOrder,
    moduleGroup.ModuleSortOrder,
    moduleGroup.ModuleSortorder,
    moduleGroup.modulesort,
    moduleGroup.moduleSort,
    moduleGroup.ModuleSort,
    moduleGroup.sortorder,
    moduleGroup.sortOrder,
    moduleGroup.SortOrder,
    moduleGroup.moduleorder,
    moduleGroup.moduleOrder,
    moduleGroup.ModuleOrder
  ];

  const raw = possibleValues.find(value => value !== undefined && value !== null && String(value).trim() !== "");
  const numberValue = Number(raw);

  if (Number.isFinite(numberValue)) {
    return numberValue;
  }

  return Number.MAX_SAFE_INTEGER;
}

function getResourceModuleIdFromRows(rows) {
  for (const row of rows || []) {
    const id = getResourceModuleId(row && row.module) || getResourceModuleId(row && row.resource);
    if (id) return id;
  }

  return "";
}

function getResourceModuleSortOrderFromRows(rows) {
  let sortOrder = Number.MAX_SAFE_INTEGER;

  (rows || []).forEach(row => {
    sortOrder = Math.min(sortOrder, getResourceModuleSortOrder(row && row.module));
    sortOrder = Math.min(sortOrder, getResourceModuleSortOrder(row && row.resource));
  });

  return sortOrder;
}

function compareResourceModuleGroups(a, b) {
  const sortA = getResourceModuleSortOrder(a);
  const sortB = getResourceModuleSortOrder(b);

  if (sortA !== sortB) {
    return sortA - sortB;
  }

  const idA = getResourceModuleId(a);
  const idB = getResourceModuleId(b);

  if (idA || idB) {
    return compareResourceIds(idA, idB);
  }

  return String(getResourceModuleName(a) || "").localeCompare(String(getResourceModuleName(b) || ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function countDistinctModuleIdsForCurrentResourceCategory(category) {
  const moduleIds = new Set();

  getCurrentSubjectGroupsForCategory(category).forEach(subjectGroup => {
    (subjectGroup.modules || []).forEach(moduleGroup => {
      const moduleId = getResourceModuleId(moduleGroup) || getResourceModuleIdFromRows(moduleGroup.rows);

      if (moduleId) {
        moduleIds.add(moduleId.toUpperCase());
      }
    });
  });

  return moduleIds.size;
}

function buildStudentResourceSubjectSummaries() {
  const subjectMap = new Map();

  STUDENT_RESOURCE_CATEGORIES.forEach(category => {
    buildMediaResourceGroups(category).forEach(subjectGroup => {
      const key = getResourceSubjectKey(subjectGroup);
      const name = getResourceSubjectName(subjectGroup);
      const count = (subjectGroup.modules || []).reduce((sum, moduleGroup) => {
        return sum + ((moduleGroup.rows || []).length);
      }, 0);

      const subjectid = getResourceSubjectId(subjectGroup);

      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          key,
          subjectid,
          name,
          total: 0,
          categoryCounts: {}
        });
      }

      const summary = subjectMap.get(key);
      summary.total += count;
      summary.categoryCounts[category.key] = (summary.categoryCounts[category.key] || 0) + count;
    });
  });

  return Array.from(subjectMap.values()).sort((a, b) => {
    const idA = a.subjectid || "";
    const idB = b.subjectid || "";

    if (idA || idB) {
      return compareResourceIds(idA, idB);
    }

    return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
}

function renderStudentResourceSubjects() {
  const container = getDomElement("student-resource-subject-list");
  if (!container) return;

  currentStudentResourceMode = "";
  currentStudentResourceSubjectKey = "";
  currentStudentResourceSubjectName = "";
  currentStudentResourceSubjectCategoryCounts = {};
  currentStudentResourceModuleKey = "";
  currentStudentResourceModuleName = "";
  currentStudentResourceDetailReturnScreen = "";
  closeStudentResourceModulePicker();

  const subjects = buildStudentResourceSubjectSummaries();

  if (subjects.length === 0) {
    setDomHtml(container, `<p class="helper-text">No resources are available yet.</p>`);
    return;
  }

  const visibleCategories = STUDENT_RESOURCE_CATEGORIES.filter(category => {
    return subjects.some(subject => Number(subject.categoryCounts[category.key] || 0) > 0);
  });

  if (visibleCategories.length === 0) {
    setDomHtml(container, `<p class="helper-text">No resources are available yet.</p>`);
    return;
  }

  const columnStyle = `--resource-media-columns: ${visibleCategories.length};`;

  setDomHtml(container, `
    <div class="resource-media-matrix-wrap" style="${columnStyle}">
      <div class="resource-media-matrix" role="table" aria-label="Resources by subject and media type">
        <div class="resource-media-row resource-media-header" role="row">
          <div class="resource-media-subject-cell" role="columnheader">Subject</div>
          ${visibleCategories.map(category => `
            <div class="resource-media-cell resource-media-heading-cell" role="columnheader">
              ${escapeHtml(category.label)}
            </div>
          `).join("")}
        </div>

        ${subjects.map(subject => `
          <div class="resource-media-row" role="row">
            <div class="resource-media-subject-cell" role="cell">
              <span class="resource-media-subject-name">${escapeHtml(subject.name)}</span>
            </div>
            ${visibleCategories.map(category => {
              const count = Number(subject.categoryCounts[category.key] || 0);

              if (count <= 0) {
                return `<div class="resource-media-cell resource-media-cell-empty" role="cell" aria-label="No ${escapeForAttribute(category.label)} resources"></div>`;
              }

              return `
                <div class="resource-media-cell" role="cell">
                  <button
                    type="button"
                    class="resource-media-icon-button"
                    data-resource-action="matrix-selection"
                    data-resource-subject-key="${escapeForAttribute(subject.key)}"
                    data-resource-category-key="${escapeForAttribute(category.key)}"
                    aria-label="Open ${escapeForAttribute(category.label)} resources for ${escapeForAttribute(subject.name)}"
                    title="${escapeForAttribute(category.label)}"
                  >
                    <span
                      class="resource-media-icon"
                      style="--resource-media-icon: url('${getResourceCategoryIconPath(category.key)}')"
                      aria-hidden="true"
                    ></span>
                  </button>
                </div>
              `;
            }).join("")}
          </div>
        `).join("")}
      </div>
    </div>
  `);

  bindResourceUiHandlers(container);
}

function openStudentResourceMatrixSelection(subjectKey, categoryKey) {
  const subjects = buildStudentResourceSubjectSummaries();
  const selectedSubject = subjects.find(subject => subject.key === subjectKey);
  const category = STUDENT_RESOURCE_CATEGORIES.find(item => item.key === String(categoryKey || "").toUpperCase());

  if (!selectedSubject || !category) {
    alert("Resource selection not found. Please reload resources.");
    return;
  }

  currentStudentResourceSubjectKey = selectedSubject.key;
  currentStudentResourceSubjectName = selectedSubject.name;
  currentStudentResourceSubjectCategoryCounts = { ...(selectedSubject.categoryCounts || {}) };
  currentStudentResourceMode = category.key;
  currentStudentResourceModuleKey = "";
  currentStudentResourceModuleName = "";
  currentStudentResourceDetailReturnScreen = "student-resources-subjects";

  const modules = buildCurrentResourceModuleSummaries(category);

  if (modules.length > 1) {
    showStudentResourceModulePicker(category, modules);
    return;
  }

  if (modules.length === 1) {
    currentStudentResourceModuleKey = modules[0].key;
    currentStudentResourceModuleName = modules[0].name;
  }

  setDomText("student-resource-detail-title", `${selectedSubject.name} - ${category.label}`);

  if (!showScreen("student-resources-detail")) {
    console.warn("Resource detail screen is missing.");
    return;
  }

  renderStudentResourceCategoryDetail(category);
}

function getStudentResourceModulePickerElement() {
  if (!document.body) {
    console.warn("Resource module picker could not be created because document.body is missing.");
    return null;
  }

  let picker = document.getElementById("resource-module-picker");

  if (!picker) {
    picker = document.createElement("div");
    picker.id = "resource-module-picker";
    picker.className = "resource-module-picker hidden";
    picker.setAttribute("aria-hidden", "true");
    document.body.appendChild(picker);
  }

  return picker;
}


function showStudentResourceModulePicker(category, modules) {
  const picker = getStudentResourceModulePickerElement();
  const safeModules = Array.isArray(modules) ? modules : [];

  if (!picker) {
    return;
  }

  const subjectName = currentStudentResourceSubjectName || "Subject";

  setDomHtml(picker, `
    <div class="resource-module-picker__backdrop" data-resource-action="close-module-picker"></div>
    <div class="resource-module-picker__panel" role="dialog" aria-modal="true" aria-labelledby="resource-module-picker-title">
      <div class="resource-module-picker__header">
        <div>
          <h3 id="resource-module-picker-title">Choose Module</h3>
          <p class="mini-text">${escapeHtml(subjectName)} - ${escapeHtml(category.label)}</p>
        </div>
        <button type="button" class="resource-module-picker__close" data-resource-action="close-module-picker" aria-label="Close module picker">×</button>
      </div>
      <div class="resource-module-picker__list">
        ${safeModules.map(module => `
          <button
            type="button"
            class="resource-module-picker__option"
            data-resource-action="module"
            data-resource-module-key="${escapeForAttribute(module.key)}"
            data-resource-return-screen="student-resources-subjects"
          >
            <span>${escapeHtml(module.name)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `);

  bindResourceUiHandlers(picker);
  picker.classList.remove("hidden");
  picker.setAttribute("aria-hidden", "false");
  if (document.body) {
    document.body.classList.add("resource-module-picker-open");
  }
}

function closeStudentResourceModulePicker() {
  const picker = document.getElementById("resource-module-picker");

  if (!picker) return;

  picker.classList.add("hidden");
  picker.setAttribute("aria-hidden", "true");
  setDomHtml(picker, "");
  if (document.body) {
    document.body.classList.remove("resource-module-picker-open");
  }
}

function bindResourceUiHandlers(containerOrId) {
  const container = getDomElement(containerOrId);

  if (!container || typeof container.querySelectorAll !== "function") {
    return false;
  }

  container.querySelectorAll("[data-resource-action]").forEach(button => {
    if (button.dataset.resourceBound === "true") {
      return;
    }

    button.dataset.resourceBound = "true";
    button.addEventListener("click", handleResourceUiAction);
  });

  return true;
}

function handleResourceUiAction(event) {
  const button = event.target && event.target.closest
    ? event.target.closest("[data-resource-action]")
    : null;

  if (!button || button.disabled) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const action = button.getAttribute("data-resource-action") || "";

  if (action === "matrix-selection") {
    openStudentResourceMatrixSelection(
      button.getAttribute("data-resource-subject-key") || "",
      button.getAttribute("data-resource-category-key") || ""
    );
    return;
  }

  if (action === "category") {
    openStudentResourceCategory(
      button.getAttribute("data-resource-category-key") || "",
      Number(button.getAttribute("data-resource-count") || 0)
    );
    return;
  }

  if (action === "module") {
    openStudentResourceModule(
      button.getAttribute("data-resource-module-key") || "",
      button.getAttribute("data-resource-return-screen") || "student-resources-modules"
    );
    return;
  }

  if (action === "close-module-picker") {
    closeStudentResourceModulePicker();
    return;
  }

  if (action === "toggle-preview") {
    toggleInlineResourcePreview(
      button.getAttribute("data-resource-preview-id") || "",
      button.getAttribute("data-resource-link") || "",
      button.getAttribute("data-resource-type") || ""
    );
    return;
  }

  if (action === "open-link") {
    openStudentResourceLink(
      button.getAttribute("data-resource-link") || "",
      button.getAttribute("data-resource-type") || "",
      button.getAttribute("data-resource-title") || "PDF Viewer"
    );
  }
}


function openStudentResourceSubject(subjectKey) {
  const subjects = buildStudentResourceSubjectSummaries();
  const selectedSubject = subjects.find(subject => subject.key === subjectKey);

  if (!selectedSubject) {
    alert("Subject not found. Please reload resources.");
    return;
  }

  currentStudentResourceSubjectKey = selectedSubject.key;
  currentStudentResourceSubjectName = selectedSubject.name;
  currentStudentResourceSubjectCategoryCounts = { ...(selectedSubject.categoryCounts || {}) };
  currentStudentResourceMode = "";
  currentStudentResourceModuleKey = "";
  currentStudentResourceModuleName = "";

  setDomText("student-resource-media-title", selectedSubject.name);

  if (!showScreen("student-resources-media")) {
    console.warn("Resource media screen is missing.");
    return;
  }

  renderStudentResourceCategories(selectedSubject);
}

function renderStudentResourceCategories(selectedSubject = null) {
  const container = selectedSubject ? getDomElement("student-resource-media-list") : getDomElement("student-resource-subject-list");

  if (!container) return;

  const categoryButtons = STUDENT_RESOURCE_CATEGORIES.map(category => {
    const count = selectedSubject ? (selectedSubject.categoryCounts[category.key] || 0) : countResourcesForCategory(category);
    const disabledClass = count === 0 ? " is-empty" : "";
    const disabledAttr = count === 0 ? " disabled" : "";

    return `
      <button
        type="button"
        class="resource-category-button${disabledClass}"
        data-resource-action="category"
        data-resource-category-key="${escapeForAttribute(category.key)}"
        data-resource-count="${Number(count) || 0}"
        ${disabledAttr}
      >
        <span class="resource-category-main">
          <span class="resource-category-title">${escapeHtml(category.label)}</span>
          <span class="resource-category-subtitle">${escapeHtml(category.subtitle)}</span>
        </span>
      </button>
    `;
  }).join("");

  const total = STUDENT_RESOURCE_CATEGORIES.reduce((sum, category) => sum + (selectedSubject ? (selectedSubject.categoryCounts[category.key] || 0) : countResourcesForCategory(category)), 0);

  setDomHtml(container, `
    <div class="resource-category-grid">
      ${categoryButtons}
    </div>
    ${total === 0 ? `<p class="helper-text">No resources are available yet.</p>` : ""}
  `);

  bindResourceUiHandlers(container);
}

function openStudentResourceCategory(categoryKey, knownCount = null) {
  const category = STUDENT_RESOURCE_CATEGORIES.find(item => item.key === categoryKey);

  if (!category) {
    alert("Resource category not found. Please reload resources.");
    return;
  }

  currentStudentResourceMode = categoryKey;
  currentStudentResourceModuleKey = "";
  currentStudentResourceModuleName = "";
  currentStudentResourceDetailReturnScreen = currentStudentResourceSubjectKey ? "student-resources-media" : "";

  const availableModules = buildCurrentResourceModuleSummaries(category);

  if (availableModules.length > 1) {
    setDomText("student-resource-module-title", currentStudentResourceSubjectName ? `${currentStudentResourceSubjectName} - ${category.label}` : category.label);

    if (!showScreen("student-resources-modules")) {
      console.warn("Resource modules screen is missing.");
      return;
    }

    renderStudentResourceModules(category);
    return;
  }

  setDomText("student-resource-detail-title", currentStudentResourceSubjectName ? `${currentStudentResourceSubjectName} - ${category.label}` : category.label);

  if (!showScreen("student-resources-detail")) {
    console.warn("Resource detail screen is missing.");
    return;
  }

  renderStudentResourceCategoryDetail(category);
}

function filterResourceGroupsByCurrentSubject(subjectGroups) {
  if (!currentStudentResourceSubjectKey) return subjectGroups;

  return (subjectGroups || []).filter(subjectGroup => {
    return getResourceSubjectKey(subjectGroup) === currentStudentResourceSubjectKey;
  });
}

function getCurrentSubjectGroupsForCategory(category) {
  return filterResourceGroupsByCurrentSubject(buildMediaResourceGroups(category));
}

function countRowsInResourceSubjectGroups(subjectGroups) {
  return (subjectGroups || []).reduce((subjectTotal, subjectGroup) => {
    return subjectTotal + (subjectGroup.modules || []).reduce((moduleTotal, moduleGroup) => {
      return moduleTotal + ((moduleGroup.rows || []).length);
    }, 0);
  }, 0);
}

function getResourceModuleKey(moduleGroup) {
  const id = getResourceModuleId(moduleGroup);
  const name = getResourceModuleName(moduleGroup);
  return id ? `id:${id.toUpperCase()}` : `name:${name.toUpperCase()}`;
}

function getResourceModuleName(moduleGroup) {
  return String(moduleGroup && (moduleGroup.modulename || moduleGroup.ModuleName || moduleGroup.name) || "General").trim() || "General";
}

function buildCurrentResourceModuleSummaries(category) {
  const moduleMap = new Map();

  getCurrentSubjectGroupsForCategory(category).forEach(subjectGroup => {
    (subjectGroup.modules || []).forEach(moduleGroup => {
      const rows = moduleGroup.rows || [];
      if (rows.length === 0) return;

      const key = getResourceModuleKey(moduleGroup);
      const name = getResourceModuleName(moduleGroup);

      const moduleid = getResourceModuleId(moduleGroup) || getResourceModuleIdFromRows(rows);
      const modulesortorder = Math.min(
        getResourceModuleSortOrder(moduleGroup),
        getResourceModuleSortOrderFromRows(rows)
      );

      if (!moduleMap.has(key)) {
        moduleMap.set(key, {
          key,
          moduleid,
          name,
          modulesortorder,
          total: 0
        });
      } else {
        const existing = moduleMap.get(key);

        if (!existing.moduleid && moduleid) {
          existing.moduleid = moduleid;
        }

        existing.modulesortorder = Math.min(existing.modulesortorder, modulesortorder);
      }

      moduleMap.get(key).total += rows.length;
    });
  });

  return Array.from(moduleMap.values()).sort((a, b) => compareResourceModuleGroups(a, b));
}

function renderStudentResourceModules(category) {
  const container = getDomElement("student-resource-module-list");
  if (!container) return;

  const modules = buildCurrentResourceModuleSummaries(category);

  if (modules.length === 0) {
    setDomHtml(container, `<p class="helper-text">No modules are available for this media type.</p>`);
    return;
  }

  setDomHtml(container, `
    <div class="resource-subject-button-grid">
      ${modules.map(module => `
        <button
          type="button"
          class="resource-subject-drill-button"
          data-resource-action="module"
          data-resource-module-key="${escapeForAttribute(module.key)}"
          data-resource-return-screen="student-resources-modules"
        >
          <span class="resource-subject-button-title">${escapeHtml(module.name)}</span>
        </button>
      `).join("")}
    </div>
  `);

  bindResourceUiHandlers(container);
}

function openStudentResourceModule(moduleKey, returnScreen = "student-resources-modules") {
  closeStudentResourceModulePicker();

  const category = STUDENT_RESOURCE_CATEGORIES.find(item => item.key === currentStudentResourceMode);

  if (!category) {
    alert("Resource category not found. Please reload resources.");
    return;
  }

  const selectedModule = buildCurrentResourceModuleSummaries(category).find(module => module.key === moduleKey);

  if (!selectedModule) {
    alert("Module not found. Please reload resources.");
    return;
  }

  currentStudentResourceModuleKey = selectedModule.key;
  currentStudentResourceModuleName = selectedModule.name;
  currentStudentResourceDetailReturnScreen = returnScreen;

  setDomText("student-resource-detail-title", `${selectedModule.name} - ${category.label}`);

  if (!showScreen("student-resources-detail")) {
    console.warn("Resource detail screen is missing.");
    return;
  }

  renderStudentResourceCategoryDetail(category);
}

function goBackFromStudentResourceDetail() {
  closeStudentResourceModulePicker();

  if (currentStudentResourceDetailReturnScreen) {
    showScreen(currentStudentResourceDetailReturnScreen);
    return;
  }

  if (currentStudentResourceModuleKey) {
    showScreen("student-resources-modules");
    return;
  }

  if (!currentStudentResourceSubjectKey) {
    if (studentResourceViewMode === "admin") {
      showAdminResources();
    } else {
      showStudentResources();
    }
    return;
  }

  showScreen("student-resources-media");
}

function renderStudentResourceCategoryDetail(category) {
  const container = getDomElement("student-resource-detail-content");
  if (!container) return;

  const subjectGroups = getCurrentSubjectGroupsForCategory(category);

  if (subjectGroups.length === 0) {
    setDomHtml(container, `<p class="helper-text">No ${escapeHtml(category.label)} resources are available yet.</p>`);
    return;
  }

  const filteredSubjectGroups = subjectGroups.map(subjectGroup => {
    const modules = (subjectGroup.modules || []).filter(moduleGroup => {
      return !currentStudentResourceModuleKey || getResourceModuleKey(moduleGroup) === currentStudentResourceModuleKey;
    });

    return {
      ...subjectGroup,
      modules
    };
  }).filter(subjectGroup => subjectGroup.modules.length > 0);

  if (filteredSubjectGroups.length === 0) {
    setDomHtml(container, `<p class="helper-text">No ${escapeHtml(category.label)} resources are available for this module.</p>`);
    return;
  }

  setDomHtml(container, filteredSubjectGroups.map(subjectGroup => `
    <div class="resource-section resource-subject-group">
      ${currentStudentResourceModuleKey ? "" : `<h3>${escapeHtml(subjectGroup.subjectname || "Subject")}</h3>`}
      ${subjectGroup.modules.map(moduleGroup => `
        <div class="resource-module-block">
          ${currentStudentResourceModuleKey ? "" : `<div class="resource-module-heading">${escapeHtml(moduleGroup.modulename || "General")}</div>`}
          <div class="resource-task-list">
            ${moduleGroup.rows.map(row => renderStudentResourceRow(row)).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `).join(""));

  bindResourceUiHandlers(container);
}

function buildMediaResourceGroups(category) {
  const directGroup = getDirectMediaGroup(category);

  // Preferred new shape from Apps Script:
  // { groups: [{ type: "AUDIO", subjects: [{ subjectname, modules: [{ modulename, resources: [...] }] }] }] }
  if (directGroup) {
    const subjectGroups = [];

    (directGroup.subjects || []).forEach(subject => {
      const moduleGroups = [];

      getSubjectModules(subject).forEach(module => {
        const rows = [];
        const seenRows = new Set();

        getModuleResources(module).forEach(resource => {
          const type = getResourceType(resource, category.key);
          const link = getResourceLink(resource);
          const format = getResourceFormat(resource, type);
          const label = getResourceName(resource);

          addUniqueResourceRow(rows, seenRows, {
            subject,
            module,
            task: null,
            resource,
            taskid: resource.taskid || resource.taskId || "",
            taskname: label,
            label,
            sublabel: format,
            format,
            link,
            type,
            source: resource.source || category.key || "RESOURCE"
          });
        });

        rows.sort(resourceRowSorter);

        if (rows.length > 0) {
          moduleGroups.push({
            moduleid: getResourceModuleId(module) || getResourceModuleIdFromRows(rows),
            modulename: module.modulename || module.ModuleName || module.name || "General",
            modulesortorder: Math.min(
              getResourceModuleSortOrder(module),
              getResourceModuleSortOrderFromRows(rows)
            ),
            rows
          });
        }
      });

      moduleGroups.sort((a, b) => compareResourceModuleGroups(a, b));

      if (moduleGroups.length > 0) {
        subjectGroups.push({
          subjectid: subject.subjectid || subject.subjectId || subject.SubjectId || subject.SubjectID || "",
          subjectname: subject.subjectname || subject.SubjectName || subject.name || "Subject",
          modules: moduleGroups
        });
      }
    });

    subjectGroups.sort((a, b) => {
      const idA = getResourceSubjectId(a);
      const idB = getResourceSubjectId(b);

      if (idA || idB) {
        return compareResourceIds(idA, idB);
      }

      return String(a.subjectname || "").localeCompare(String(b.subjectname || ""), undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });

    return subjectGroups;
  }

  // Backward-compatible fallback for the older subject/task response shape.
  const subjectGroups = [];
  const allowedTypes = new Set((category.types || [category.key]).map(type => String(type).toUpperCase()));

  getSortedResourceSubjects().forEach(subject => {
    const rows = [];
    const seenRows = new Set();

    getSubjectResourceArray(subject).forEach(resource => {
      const type = getResourceType(resource, category.key);

      if (!allowedTypes.has(type) && !allowedTypes.has(category.key)) {
        return;
      }

      addUniqueResourceRow(rows, seenRows, {
        subject,
        module: null,
        task: null,
        resource,
        taskid: "",
        taskname: "Subject Resource",
        label: getResourceName(resource),
        sublabel: getResourceFormat(resource, type),
        format: getResourceFormat(resource, type),
        link: getResourceLink(resource),
        type,
        source: "SUBJECT"
      });
    });

    
    getTaskGroups(subject).forEach(task => {
      getTaskResourceArray(task).forEach(resource => {
        const type = getResourceType(resource, category.key);

        if (!allowedTypes.has(type) && !allowedTypes.has(category.key)) {
          return;
        }

        addUniqueResourceRow(rows, seenRows, {
          subject,
          module: null,
          task,
          resource,
          taskid: task.taskid,
          taskname: task.taskname || getResourceName(resource),
          label: task.taskname || getResourceName(resource),
          sublabel: getResourceFormat(resource, type),
          format: getResourceFormat(resource, type),
          link: getResourceLink(resource),
          type,
          source: "TASK"
        });
      });
    });

    rows.sort(resourceRowSorter);

    if (rows.length > 0) {
      subjectGroups.push({
        subjectid: subject.subjectid,
        subjectname: subject.subjectname || "Subject",
        modules: [{
          moduleid: "",
          modulename: "General",
          modulesortorder: Number.MAX_SAFE_INTEGER,
          rows
        }]
      });
    }
  });

  return subjectGroups;
}

function addUniqueResourceRow(rows, seenRows, row) {
  const key = getResourceDedupeKey(row);

  if (seenRows.has(key)) {
    return;
  }

  seenRows.add(key);
  rows.push(row);
}

function getResourceDedupeKey(row) {
  const subjectId = String(row.subject && (row.subject.subjectid || row.subject.subjectId || row.subject.SubjectId || row.subject.SubjectID) || "").trim().toUpperCase();
  const moduleId = String(row.module && (row.module.moduleid || row.module.moduleId || row.module.ModuleId || row.module.ModuleID) || "").trim().toUpperCase();
  const taskId = String(row.taskid || "").trim().toUpperCase();
  const resource = row.resource || {};
  const resourceId = String(
    resource.id ||
    resource.resourceid ||
    resource.resourceId ||
    resource.ResourceId ||
    resource.taskresourceid ||
    resource.taskResourceId ||
    resource.VideoId ||
    resource.videoId ||
    resource.videoid ||
    resource.AudioId ||
    resource.audioId ||
    resource.audioid ||
    resource.EbookId ||
    resource.eBookId ||
    resource.ebookId ||
    resource.ebookid ||
    resource.PrintableId ||
    resource.printableId ||
    resource.printableid ||
    resource.OtherResourceId ||
    resource.otherResourceId ||
    resource.otherresourceid ||
    ""
  ).trim().toUpperCase();
  const type = String(row.type || "").trim().toUpperCase();
  const link = String(row.link || "").trim();
  const label = String(row.label || "").trim().toUpperCase();
  const source = String(row.source || "").trim().toUpperCase();

  if (resourceId) {
    return [source, subjectId, moduleId, taskId, resourceId].join("|");
  }

  return [source, subjectId, moduleId, taskId, type, link, label].join("|");
}

function renderStudentResourceRow(row) {
  const link = row.link || "";
  const type = String(row.type || "LINK").toUpperCase();
  const title = row.label || row.name || "Resource";
  const disabled = link ? "" : " disabled";
  const buttonLabel = getSmallResourceButtonLabel(type);
  const rowId = makeResourceRowId(row);
  const format = row.format || row.sublabel || getDisplayResourceType(type);
  const isAudio = type === "AUDIO";
  const isVideo = type === "VIDEO";

  const actionIconPath = getResourceCategoryIconPath(type);
  const actionIconMarkup = `<span class="resource-type-icon resource-action-icon" style="--app-icon-url: url('${actionIconPath}')" aria-hidden="true"></span>`;

  const actionHtml = (isAudio || isVideo)
    ? `
      <button
        type="button"
        class="resource-arrow-btn"
        data-resource-action="toggle-preview"
        data-resource-preview-id="${escapeForAttribute(rowId)}"
        data-resource-link="${escapeForAttribute(link)}"
        data-resource-type="${escapeForAttribute(type)}"
        ${disabled}
        aria-label="${escapeForAttribute(buttonLabel)}"
      >
        ${actionIconMarkup}
      </button>
    `
    : `
      <button
        type="button"
        class="resource-arrow-btn"
        data-resource-action="open-link"
        data-resource-link="${escapeForAttribute(link)}"
        data-resource-type="${escapeForAttribute(type)}"
        data-resource-title="${escapeForAttribute(title)}"
        ${disabled}
        aria-label="${escapeForAttribute(buttonLabel)}"
      >
        ${actionIconMarkup}
      </button>
    `;

  const previewHtml = (isAudio || isVideo)
    ? `<div id="${escapeForAttribute(rowId)}" class="inline-resource-preview hidden"></div>`
    : "";

  return `
    <div class="student-resource-row">
      <div class="student-resource-row-main">
        <div class="student-resource-title">${escapeHtml(title)}</div>
        ${format ? `<div class="student-resource-meta"><span class="resource-format-text">${escapeHtml(format)}</span></div>` : ""}
        ${previewHtml}
      </div>
      ${actionHtml}
    </div>
  `;
}

function makeResourceRowId(row) {
  const raw = [
    row.source || "resource",
    row.subject && (row.subject.subjectname || row.subject.SubjectName) || "subject",
    row.module && (row.module.modulename || row.module.ModuleName) || "module",
    row.label || row.name || "item",
    row.link || "link"
  ].join("-");

  return "resource-preview-" + raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getDisplayResourceType(type) {
  const resourceType = String(type || "").toUpperCase();

  if (resourceType === "EBOOKS" || resourceType === "EBOOK") return "EBOOK";
  if (resourceType === "PRINTABLES" || resourceType === "PRINTABLE") return "PRINT";
  if (resourceType === "AUDIO") return "AUDIO";
  if (resourceType === "VIDEO") return "VIDEO";
  if (resourceType === "OTHER") return "OTHER";

  return resourceType || "LINK";
}

function clearInlineResourcePreviews(exceptPlayerId = "") {
  if (!document || typeof document.querySelectorAll !== "function") {
    return;
  }

  document.querySelectorAll(".inline-resource-preview, .inline-audio-player").forEach(player => {
    if (!player || player.id === exceptPlayerId) {
      return;
    }

    try {
      player.querySelectorAll("audio, video").forEach(media => {
        try {
          media.pause();
          media.removeAttribute("src");
          media.querySelectorAll("source").forEach(source => source.removeAttribute("src"));
          if (typeof media.load === "function") media.load();
        } catch (error) {
          console.warn("Could not clear inline media element:", error);
        }
      });
    } catch (error) {
      console.warn("Could not clear inline media preview:", error);
    }

    if (player.classList) {
      player.classList.add("hidden");
    }

    setDomHtml(player, "");
  });
}

function safeOpenExternalLink(link) {
  const cleanLink = String(link || "").trim();

  if (!cleanLink) {
    return false;
  }

  try {
    window.open(cleanLink, "_blank", "noopener,noreferrer");
    return true;
  } catch (error) {
    console.warn("Could not open external link:", error);
    return false;
  }
}

function toggleInlineResourcePreview(playerId, link, type) {
  const cleanLink = String(link || "").trim();

  if (!cleanLink) {
    return false;
  }

  const previewBox = getDomElement(playerId);

  if (!previewBox) {
    console.warn("Missing resource preview container:", playerId);
    return false;
  }

  const isHidden = previewBox.classList ? previewBox.classList.contains("hidden") : true;

  clearInlineResourcePreviews(playerId);

  if (!isHidden) {
    if (previewBox.classList) {
      previewBox.classList.add("hidden");
    }
    setDomHtml(previewBox, "");
    return true;
  }

  const resourceType = String(type || "").toUpperCase();

  const mediaMarkup = resourceType === "VIDEO"
    ? `
      <video class="resource-video-control" controls controlsList="nodownload" preload="metadata" playsinline>
        <source src="${escapeForAttribute(cleanLink)}" />
        Your browser cannot play this video file.
      </video>
    `
    : `
      <audio class="resource-audio-control" controls controlsList="nodownload" preload="none">
        <source src="${escapeForAttribute(cleanLink)}" />
        Your browser cannot play this audio file.
      </audio>
    `;

  setDomHtml(previewBox, mediaMarkup);

  if (previewBox.classList) {
    previewBox.classList.remove("hidden");
  }

  return true;
}

function toggleInlineAudioPlayer(playerId, link) {
  return toggleInlineResourcePreview(playerId, link, "AUDIO");
}

function openStudentResourceLink(link, type, title = "PDF Viewer") {
  const cleanLink = String(link || "").trim();

  if (!cleanLink) {
    return false;
  }

  const resourceType = String(type || "").toUpperCase();

  if (resourceType === "EBOOKS" || resourceType === "EBOOK" || resourceType === "PRINTABLES" || resourceType === "PRINTABLE" || isPdfLink(cleanLink)) {
    return openPdfResource(cleanLink, title || "PDF Viewer");
  }

  return safeOpenExternalLink(cleanLink);
}

function getPdfViewerFileParam(link) {
  const cleanLink = String(link || "").trim();

  if (!cleanLink) {
    return "";
  }

  if (cleanLink.startsWith("http://") || cleanLink.startsWith("https://")) {
    return `/pdf-file/${base64UrlEncode(cleanLink)}`;
  }

  return cleanLink;
}

function openPdfResource(link, title = "PDF Viewer") {
  const cleanLink = String(link || "").trim();

  if (!cleanLink) {
    return false;
  }

  const viewerScreen = getDomElement("pdf-viewer-screen");
  const viewerFrame = getDomElement("pdf-viewer-frame");

  // Safety fallback: if the PDF viewer screen was not added to index.html,
  // still allow the resource to open normally.
  if (!viewerScreen || !viewerFrame) {
    return safeOpenExternalLink(cleanLink);
  }

  const activeScreen = document && typeof document.querySelector === "function"
    ? document.querySelector(".screen.active")
    : null;
  previousPdfScreenId = activeScreen ? activeScreen.id : "";
  currentPdfDirectLink = cleanLink;

  viewerScreen.classList.remove("student-theme", "admin-theme");
  if (activeScreen && activeScreen.classList && activeScreen.classList.contains("admin-theme")) {
    viewerScreen.classList.add("admin-theme");
  } else {
    viewerScreen.classList.add("student-theme");
  }

  setDomText("pdf-viewer-title", title || "PDF Viewer");

  const pdfFileForViewer = getPdfViewerFileParam(cleanLink);

  if (!pdfFileForViewer) {
    return safeOpenExternalLink(cleanLink);
  }

  clearInlineResourcePreviews();
  viewerFrame.src = `${PDFJS_VIEWER_PATH}?file=${pdfFileForViewer}`;

  if (document.body) {
    document.body.classList.add("pdf-viewer-open");
  }

  if (!showScreen("pdf-viewer-screen")) {
    viewerFrame.src = "";
    if (document.body) {
      document.body.classList.remove("pdf-viewer-open");
    }
    return safeOpenExternalLink(cleanLink);
  }

  return true;
}

function base64UrlEncode(value) {
  const utf8 = encodeURIComponent(String(value || "")).replace(
    /%([0-9A-F]{2})/g,
    function (_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    }
  );

  return btoa(utf8)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function closePdfViewer() {
  const viewerFrame = getDomElement("pdf-viewer-frame");

  if (viewerFrame) {
    viewerFrame.src = "";
    viewerFrame.removeAttribute("src");
  }

  currentPdfDirectLink = "";

  if (document.body) {
    document.body.classList.remove("pdf-viewer-open");
  }

  if (previousPdfScreenId && getDomElement(previousPdfScreenId)) {
    showScreen(previousPdfScreenId);
    previousPdfScreenId = "";
    return true;
  }

  previousPdfScreenId = "";
  goHome();
  return true;
}

function openCurrentPdfDirect() {
  return safeOpenExternalLink(currentPdfDirectLink);
}

function bindMediaViewerHandlers() {
  if (!document || typeof document.addEventListener !== "function") {
    return false;
  }

  if (document.body && document.body.dataset.mediaViewerHandlersBound === "true") {
    return true;
  }

  if (document.body) {
    document.body.dataset.mediaViewerHandlersBound = "true";
  }

  document.addEventListener("click", event => {
    const actionButton = event.target && event.target.closest
      ? event.target.closest("[data-media-viewer-action]")
      : null;

    if (!actionButton || actionButton.disabled) {
      return;
    }

    const action = actionButton.getAttribute("data-media-viewer-action") || "";

    if (!action) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (action === "close-pdf") {
      closePdfViewer();
      return;
    }

    if (action === "open-pdf-direct") {
      openCurrentPdfDirect();
    }
  });

  return true;
}

function isPdfLink(link) {
  return /\.pdf($|[?#])/i.test(String(link || ""));
}

function getSmallResourceButtonLabel(type) {
  const resourceType = String(type || "").toUpperCase();

  if (resourceType === "EBOOKS" || resourceType === "EBOOK") return "Open eBook";
  if (resourceType === "PRINTABLES" || resourceType === "PRINTABLE") return "Open Printable";
  if (resourceType === "PDF") return "Open PDF";
  if (resourceType === "AUDIO") return "Play Audio";
  if (resourceType === "VIDEO" || resourceType === "MOVIE") return "Watch Video";
  if (resourceType === "IMAGE" || resourceType === "VISUAL") return "Open Image";

  return "Open Resource";
}

function getSortedResourceSubjects() {
  return [...studentResourceSubjects].sort((a, b) => {
    const idA = getResourceSubjectId(a);
    const idB = getResourceSubjectId(b);

    if (idA || idB) {
      return compareResourceIds(idA, idB);
    }

    return String(a.subjectname || "").localeCompare(String(b.subjectname || ""), undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
}

function getTaskGroups(subject) {
  if (!subject || !Array.isArray(subject.tasks)) return [];

  return [...subject.tasks].sort((a, b) => sortByTaskId(a, b));
}

function resourceRowSorter(a, b) {
  if (a.source !== b.source) {
    // Show subject-level resources first, then task resources.
    return a.source === "SUBJECT" ? -1 : 1;
  }

  const taskCompare = sortByTaskId(a, b);
  if (taskCompare !== 0) return taskCompare;

  return String(a.label || "").localeCompare(String(b.label || ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function getSubjectResourceArray(subject) {
  if (!subject) return [];

  if (Array.isArray(subject.subjectResources)) return subject.subjectResources;
  if (Array.isArray(subject.subjectresources)) return subject.subjectresources;
  if (Array.isArray(subject.subject_resources)) return subject.subject_resources;
  if (Array.isArray(subject.SubjectResources)) return subject.SubjectResources;
  if (Array.isArray(subject.subjectResoureces)) return subject.subjectResoureces;
  if (Array.isArray(subject.subjectresoureces)) return subject.subjectresoureces;

  return [];
}

function getTaskResourceArray(task) {
  if (!task) return [];

  if (Array.isArray(task.resources)) return task.resources;
  if (Array.isArray(task.taskResources)) return task.taskResources;
  if (Array.isArray(task.taskresources)) return task.taskresources;
  if (Array.isArray(task.task_resources)) return task.task_resources;
  if (Array.isArray(task.TaskResources)) return task.TaskResources;

  return [];
}

function getResourceName(resource) {
  if (!resource) return "Resource";

  return String(
    resource.name ||
    resource.label ||
    resource.title ||
    resource.Title ||
    resource.resourcename ||
    resource.resourceName ||
    resource.ResourceName ||
    resource.taskresourcename ||
    resource.taskResourceName ||
    resource.VideoName ||
    resource.videoName ||
    resource.videoname ||
    resource.AudioName ||
    resource.audioName ||
    resource.audioname ||
    resource.EbookName ||
    resource.eBookName ||
    resource.ebookName ||
    resource.ebookname ||
    resource.PrintableName ||
    resource.printableName ||
    resource.printablename ||
    resource.OtherResourceName ||
    resource.otherResourceName ||
    resource.otherresourcename ||
    "Resource"
  ).trim();
}

function getResourceType(resource, fallbackType) {
  return String(
    resource && (resource.type || resource.resourcetype || resource.resourceType) ||
    fallbackType ||
    "LINK"
  ).trim().toUpperCase();
}

function getResourceFormat(resource, fallbackType) {
  if (!resource) return getDisplayResourceType(fallbackType);

  return String(
    resource.format ||
    resource.resourceformat ||
    resource.resourceFormat ||
    resource.eBookFormat ||
    resource.ebookformat ||
    resource.PrintableFormat ||
    resource.printableformat ||
    resource.AudioFormat ||
    resource.audioformat ||
    resource.VideoFormat ||
    resource.videoformat ||
    resource.OtherResourceFormat ||
    resource.otherresourceformat ||
    getDisplayResourceType(fallbackType)
  ).trim();
}

function getResourceLink(resource) {
  return String(
    resource && (
      resource.link ||
      resource.resourcelink ||
      resource.resourceLink ||
      resource.eBookLink ||
      resource.ebooklink ||
      resource.PrintableLink ||
      resource.printablelink ||
      resource.AudioLink ||
      resource.audiolink ||
      resource.VideoLink ||
      resource.videolink ||
      resource.OtherResourceLink ||
      resource.otherResourceLink ||
      resource.otherresourcelink ||
      resource.url ||
      resource.URL
    ) ||
    ""
  ).trim();
}

function countResourcesForCategory(category) {
  if (!category) return 0;

  const directGroup = getDirectMediaGroup(category);
  if (directGroup) {
    return countResourcesInSubjects(directGroup.subjects);
  }

  return buildMediaResourceGroups(category).reduce((sum, group) => {
    return sum + group.modules.reduce((moduleSum, module) => moduleSum + module.rows.length, 0);
  }, 0);
}

function countResourcesForSubject(subject) {
  const subjectResources = getSubjectResourceArray(subject).length;

  const taskResources = Array.isArray(subject.tasks)
    ? subject.tasks.reduce((sum, task) => {
        return sum + getTaskResourceArray(task).length;
      }, 0)
    : 0;

  return subjectResources + taskResources;
}


window.M4LResources = {
  showStudentResources: typeof showStudentResources === "function" ? showStudentResources : undefined,
  showAdminResources: typeof showAdminResources === "function" ? showAdminResources : undefined,
  loadResourceCategories: typeof loadResourceCategories === "function" ? loadResourceCategories : undefined,
  openStudentResourceDirect: typeof openStudentResourceDirect === "function" ? openStudentResourceDirect : undefined,
  openStudentResourceMatrixSelection: typeof openStudentResourceMatrixSelection === "function" ? openStudentResourceMatrixSelection : undefined,
  openStudentResourceSubject: typeof openStudentResourceSubject === "function" ? openStudentResourceSubject : undefined,
  openStudentResourceCategory: typeof openStudentResourceCategory === "function" ? openStudentResourceCategory : undefined,
  openStudentResourceModule: typeof openStudentResourceModule === "function" ? openStudentResourceModule : undefined,
  goBackFromStudentResourceDetail: typeof goBackFromStudentResourceDetail === "function" ? goBackFromStudentResourceDetail : undefined,
  closeStudentResourceModulePicker: typeof closeStudentResourceModulePicker === "function" ? closeStudentResourceModulePicker : undefined,
  bindResourceUiHandlers: typeof bindResourceUiHandlers === "function" ? bindResourceUiHandlers : undefined,
  bindMediaViewerHandlers: typeof bindMediaViewerHandlers === "function" ? bindMediaViewerHandlers : undefined,
  clearInlineResourcePreviews: typeof clearInlineResourcePreviews === "function" ? clearInlineResourcePreviews : undefined,
  toggleInlineResourcePreview: typeof toggleInlineResourcePreview === "function" ? toggleInlineResourcePreview : undefined,
  toggleInlineAudioPlayer: typeof toggleInlineAudioPlayer === "function" ? toggleInlineAudioPlayer : undefined,
  openStudentResourceLink: typeof openStudentResourceLink === "function" ? openStudentResourceLink : undefined,
  openPdfResource: typeof openPdfResource === "function" ? openPdfResource : undefined,
  closePdfViewer: typeof closePdfViewer === "function" ? closePdfViewer : undefined,
  openCurrentPdfDirect: typeof openCurrentPdfDirect === "function" ? openCurrentPdfDirect : undefined,
  getResourceName: typeof getResourceName === "function" ? getResourceName : undefined,
  getResourceType: typeof getResourceType === "function" ? getResourceType : undefined,
  getResourceFormat: typeof getResourceFormat === "function" ? getResourceFormat : undefined,
  getResourceLink: typeof getResourceLink === "function" ? getResourceLink : undefined
};
