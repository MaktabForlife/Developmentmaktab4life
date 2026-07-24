/* =========================
   WEEKLY PLANNER ARCHIVE - V97.1.8.4
   Admin-only view of past weekly planners:
   - Hub: date picker (+ OPEN button) and a per-teacher submission heatmap
     list, sorted by assigned group.
   - Week screen (OPEN, or a heatmap row's card-jump): a swipeable rail of
     submitted full-preview cards for the selected week.
   - Teacher screen (tapping a heatmap row): a swipeable rail containing only
     that teacher's submitted planners from the last 4 weeks.
   Both rails share the same card component and breakpoint sizing.
   Reuses window.M4LWeeklyPlanner.renderPreview() for the actual canvas
   image, so previews are pixel-identical to the live planner preview.
   Previews render progressively (only as a card scrolls into view) rather
   than all at once, so the rail stays smooth regardless of card count.
========================= */

const weeklyPlannerArchiveState = {
  eventsBound: false,
  overview: null,
  previewCache: new Map(),
  week: {
    weekStart: "",
    week: null,
    teacherRecords: [],
    observer: null
  },
  teacher: {
    teacherId: "",
    teacherName: "",
    teacher: null,
    weekRecords: [],
    observer: null
  }
};

function isWeeklyPlannerArchiveSubmittedPlanner(planner) {
  return Boolean(planner) && String(planner.status || "").trim().toUpperCase() === "READY";
}

async function showWeeklyPlannerArchive() {
  showScreen("weekly-planner-archive-screen");
  bindWeeklyPlannerArchiveEvents();
  setWeeklyPlannerArchiveHubMessage("");

  const weekInput = document.getElementById("weekly-planner-archive-week");
  let resolvedWeekStart = "";

  try {
    resolvedWeekStart = await loadWeeklyPlannerArchiveOverview(weekInput ? weekInput.value : "");
  } catch (error) {
    setWeeklyPlannerArchiveHubMessage(error.message || "Unable to load the archive overview.");
  }

  const weekStart = resolvedWeekStart || window.M4LWeeklyPlanner.getWeekMeta().weekStart;

  if (weekInput) {
    weekInput.value = weekStart;
  }
}

function bindWeeklyPlannerArchiveEvents() {
  if (weeklyPlannerArchiveState.eventsBound) return;
  weeklyPlannerArchiveState.eventsBound = true;

  const weekInput = document.getElementById("weekly-planner-archive-week");
  if (weekInput) {
    let lastHandledWeekInputValue = "";

    const handleWeekInputChange = () => {
      if (weekInput.value === lastHandledWeekInputValue) return;
      lastHandledWeekInputValue = weekInput.value;

      const meta = window.M4LWeeklyPlanner.getWeekMeta(weekInput.value);
      weekInput.value = meta.weekStart;
      lastHandledWeekInputValue = meta.weekStart;
    };

    // Some mobile browsers/webviews are inconsistent about firing "change" for
    // native date inputs, so "input" is bound too; the value-comparison guard
    // above stops the pair from double-firing for the same selection.
    weekInput.addEventListener("change", handleWeekInputChange);
    weekInput.addEventListener("input", handleWeekInputChange);
  }

  const openButton = document.getElementById("weekly-planner-archive-open");
  if (openButton) {
    openButton.addEventListener("click", () => {
      const weekStart = (weekInput && weekInput.value) || window.M4LWeeklyPlanner.getWeekMeta().weekStart;

      openWeeklyPlannerArchiveWeekScreen(weekStart).catch(error => {
        setWeeklyPlannerArchiveWeekScreenMessage(error.message || "Unable to load planners for that week.");
      });
    });
  }

  const heatmapList = document.getElementById("weekly-planner-archive-heatmap-list");
  if (heatmapList) {
    heatmapList.addEventListener("click", event => {
      const row = event.target.closest("[data-weekly-planner-archive-teacher]");
      if (!row) return;

      showWeeklyPlannerArchiveTeacher(
        row.dataset.weeklyPlannerArchiveTeacher,
        row.dataset.weeklyPlannerArchiveTeacherName || ""
      ).catch(error => {
        console.warn("Unable to open teacher submission history:", error);
      });
    });
  }

  const weekSaveButton = document.getElementById("weekly-planner-archive-week-save");
  if (weekSaveButton) {
    weekSaveButton.addEventListener("click", () => {
      handleWeeklyPlannerArchiveSaveOrShare(
        "save",
        getWeeklyPlannerArchiveWeekSetEntries(),
        "This week's planners",
        setWeeklyPlannerArchiveWeekScreenMessage
      ).catch(error => {
        console.warn("Unable to save planners:", error);
      });
    });
  }

  const weekShareButton = document.getElementById("weekly-planner-archive-week-share");
  if (weekShareButton) {
    weekShareButton.addEventListener("click", () => {
      handleWeeklyPlannerArchiveSaveOrShare(
        "share",
        getWeeklyPlannerArchiveWeekSetEntries(),
        "This week's planners",
        setWeeklyPlannerArchiveWeekScreenMessage
      ).catch(error => {
        console.warn("Unable to share planners:", error);
      });
    });
  }

  const teacherSaveButton = document.getElementById("weekly-planner-archive-teacher-save");
  if (teacherSaveButton) {
    teacherSaveButton.addEventListener("click", () => {
      handleWeeklyPlannerArchiveSaveOrShare(
        "save",
        getWeeklyPlannerArchiveTeacherSetEntries(),
        "Submission history",
        setWeeklyPlannerArchiveTeacherMessage
      ).catch(error => {
        console.warn("Unable to save planners:", error);
      });
    });
  }

  const teacherShareButton = document.getElementById("weekly-planner-archive-teacher-share");
  if (teacherShareButton) {
    teacherShareButton.addEventListener("click", () => {
      handleWeeklyPlannerArchiveSaveOrShare(
        "share",
        getWeeklyPlannerArchiveTeacherSetEntries(),
        "Submission history",
        setWeeklyPlannerArchiveTeacherMessage
      ).catch(error => {
        console.warn("Unable to share planners:", error);
      });
    });
  }
}

/* -------- Hub: overview (per-teacher submission heatmap, sorted by group) -------- */

async function loadWeeklyPlannerArchiveOverview(weekStart) {
  const result = await apiPost("/api/admin/weekly-planner/archive-overview", { weekStart }, state.token);

  if (!result || result.success !== true) {
    throw new Error(result && result.error ? result.error : "Unable to load the archive overview.");
  }

  weeklyPlannerArchiveState.overview = result;
  renderWeeklyPlannerArchiveHeatmapList(result.teacherMatrix || []);

  const weeks = result.weeks || [];
  return weeks.length ? weeks[weeks.length - 1].weekStart : "";
}

function renderWeeklyPlannerArchiveHeatmapList(teacherMatrix) {
  const list = document.getElementById("weekly-planner-archive-heatmap-list");
  if (!list) return;

  list.innerHTML = "";

  if (!teacherMatrix.length) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "No teachers found.";
    list.appendChild(empty);
    return;
  }

  // Pre-sorted by the backend (group ascending); rendered in the order received.
  teacherMatrix.forEach(entry => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "weekly-planner-archive-heatmap-row";
    row.dataset.weeklyPlannerArchiveTeacher = entry.teacherId;
    row.dataset.weeklyPlannerArchiveTeacherName = entry.teacherName;
    row.setAttribute("role", "listitem");

    const name = document.createElement("span");
    name.className = "weekly-planner-archive-heatmap-row__name";
    name.textContent = entry.teacherName;

    const dots = document.createElement("span");
    dots.className = "weekly-planner-archive-heatmap-row__dots";

    (entry.weeks || []).forEach(week => {
      const dot = document.createElement("i");
      dot.className = `weekly-planner-archive-dot weekly-planner-archive-dot--${weeklyPlannerArchiveStatusClass(week.status)}`;
      dot.title = weeklyPlannerArchiveStatusLabel(week.status);
      dots.appendChild(dot);
    });

    const openIcon = document.createElement("span");
    openIcon.className = "app-icon weekly-planner-archive-heatmap-row__open";
    openIcon.style.setProperty("--app-icon-url", "url('/icons/open.svg')");
    openIcon.setAttribute("aria-hidden", "true");

    row.appendChild(name);
    row.appendChild(dots);
    row.appendChild(openIcon);
    list.appendChild(row);
  });
}

function setWeeklyPlannerArchiveHubMessage(message) {
  const el = document.getElementById("weekly-planner-archive-hub-message");
  if (el) el.textContent = message || "";
}

function returnToWeeklyPlannerFromArchive() {
  showScreen("weekly-planner-screen");
}

/* -------- Shared card component (used by both the week screen and the teacher screen) -------- */

function buildWeeklyPlannerArchiveCard({ primaryLabel, status, hasPlanner, emptyText }) {
  const card = document.createElement("div");
  card.className = "weekly-planner-archive-card";
  card.setAttribute("role", "listitem");
  if (!hasPlanner) card.classList.add("is-missing");

  const header = document.createElement("div");
  header.className = "weekly-planner-archive-card__header";

  const label = document.createElement("span");
  label.className = "weekly-planner-archive-card__name";
  label.textContent = primaryLabel;

  const statusEl = document.createElement("span");
  statusEl.className = `weekly-planner-archive-card__status weekly-planner-archive-card__status--${weeklyPlannerArchiveStatusClass(status)}`;
  statusEl.textContent = weeklyPlannerArchiveStatusLabel(status);

  header.appendChild(label);
  header.appendChild(statusEl);

  const imageWrap = document.createElement("div");
  imageWrap.className = "weekly-planner-archive-card__image-wrap";

  if (hasPlanner) {
    const image = document.createElement("img");
    image.className = "weekly-planner-archive-card__image";
    image.alt = `${primaryLabel} planner preview`;
    imageWrap.appendChild(image);
  } else {
    const emptyLabel = document.createElement("p");
    emptyLabel.className = "weekly-planner-archive-card__empty helper-text";
    emptyLabel.textContent = emptyText || "Not submitted";
    imageWrap.appendChild(emptyLabel);
  }

  card.appendChild(header);
  card.appendChild(imageWrap);

  return card;
}

async function generateWeeklyPlannerArchiveCardPreview(card, cacheKey, renderPayload) {
  const image = card.querySelector(".weekly-planner-archive-card__image");
  if (!image) return;

  const cachedDataUrl = weeklyPlannerArchiveState.previewCache.get(cacheKey);

  if (cachedDataUrl) {
    image.src = cachedDataUrl;
    card.classList.add("is-rendered");
    return;
  }

  card.classList.add("is-loading");

  try {
    const result = await window.M4LWeeklyPlanner.renderPreview(renderPayload);

    weeklyPlannerArchiveState.previewCache.set(cacheKey, result.dataUrl);
    image.src = result.dataUrl;
    card.classList.add("is-rendered");
  } catch (error) {
    console.warn("Unable to render archive preview:", error);
    card.classList.add("is-error");
  } finally {
    card.classList.remove("is-loading");
  }
}

function setupWeeklyPlannerArchiveCardObserver(rail, onIntersect) {
  if (typeof IntersectionObserver !== "function") return null;

  return new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      onIntersect(entry.target);
    });
  }, {
    root: rail,
    rootMargin: "200px",
    threshold: 0.01
  });
}

/* -------- Week screen: swipeable full-preview cards, one per teacher -------- */

async function openWeeklyPlannerArchiveWeekScreen(weekStart) {
  showScreen("weekly-planner-archive-week-screen");
  weeklyPlannerArchiveState.week.weekStart = weekStart;
  setWeeklyPlannerArchiveWeekScreenMessage("");

  const rail = document.getElementById("weekly-planner-archive-week-rail");
  const titleEl = document.getElementById("weekly-planner-archive-week-screen-title");

  if (rail) {
    rail.innerHTML = "";
    const loading = document.createElement("p");
    loading.className = "helper-text";
    loading.textContent = "Loading planners...";
    rail.appendChild(loading);
  }

  const result = await apiPost("/api/admin/weekly-planner/week-records", { weekStart }, state.token);

  if (!result || result.success !== true) {
    throw new Error(result && result.error ? result.error : "Unable to load planners for that week.");
  }

  // A newer navigation may have started while this request was in flight.
  if (weeklyPlannerArchiveState.week.weekStart !== weekStart) return;

  const teacherRecords = (result.teacherRecords || []).filter(entry =>
    isWeeklyPlannerArchiveSubmittedPlanner(entry && entry.planner)
  );
  weeklyPlannerArchiveState.week.teacherRecords = teacherRecords;
  weeklyPlannerArchiveState.week.week = result.week;

  if (titleEl) {
    titleEl.textContent = formatWeeklyPlannerArchiveRange(result.week);
  }

  renderWeeklyPlannerArchiveWeekRail(result.week, teacherRecords);
}

function renderWeeklyPlannerArchiveWeekRail(week, teacherRecords) {
  const rail = document.getElementById("weekly-planner-archive-week-rail");
  if (!rail) return;

  rail.innerHTML = "";

  if (weeklyPlannerArchiveState.week.observer) {
    weeklyPlannerArchiveState.week.observer.disconnect();
    weeklyPlannerArchiveState.week.observer = null;
  }

  if (!teacherRecords.length) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "No submitted planners found.";
    rail.appendChild(empty);
    return;
  }

  const renderCard = entry => {
    const cacheKey = `${entry.teacher.teacherId}__${week.weekStart}`;
    const card = buildWeeklyPlannerArchiveCard({
      primaryLabel: entry.teacher.teacherName,
      status: entry.planner.status,
      hasPlanner: true
    });
    card.dataset.weeklyPlannerArchiveCacheKey = cacheKey;
    rail.appendChild(card);
    return { card, cacheKey, entry };
  };

  const observer = setupWeeklyPlannerArchiveCardObserver(rail, card => {
    const cacheKey = card.dataset.weeklyPlannerArchiveCacheKey;
    const entry = teacherRecords.find(item => `${item.teacher.teacherId}__${week.weekStart}` === cacheKey);
    if (entry && isWeeklyPlannerArchiveSubmittedPlanner(entry.planner)) {
      generateWeeklyPlannerArchiveCardPreview(card, cacheKey, {
        teacher: entry.teacher,
        week,
        plannerData: entry.planner.plannerData,
        groupNo: entry.planner.groupNo,
        feedback: entry.planner.feedback,
        feedbackBy: entry.planner.feedbackBy
      });
    }
  });
  weeklyPlannerArchiveState.week.observer = observer;

  // Pre-sorted by the backend (group ascending); rendered in the order received.
  teacherRecords.forEach(entry => {
    const { card } = renderCard(entry);
    if (!isWeeklyPlannerArchiveSubmittedPlanner(entry.planner)) return;

    if (observer) {
      observer.observe(card);
    } else {
      const cacheKey = `${entry.teacher.teacherId}__${week.weekStart}`;
      generateWeeklyPlannerArchiveCardPreview(card, cacheKey, {
        teacher: entry.teacher,
        week,
        plannerData: entry.planner.plannerData,
        groupNo: entry.planner.groupNo,
        feedback: entry.planner.feedback,
        feedbackBy: entry.planner.feedbackBy
      });
    }
  });
}

function setWeeklyPlannerArchiveWeekScreenMessage(message) {
  const el = document.getElementById("weekly-planner-archive-week-screen-message");
  if (el) el.textContent = message || "";
}

function returnToWeeklyPlannerArchiveFromWeekScreen() {
  showScreen("weekly-planner-archive-screen");
}

/* -------- Teacher screen: swipeable full-preview cards, one per week -------- */

async function showWeeklyPlannerArchiveTeacher(teacherId, teacherName) {
  showScreen("weekly-planner-archive-teacher-screen");
  bindWeeklyPlannerArchiveEvents();

  weeklyPlannerArchiveState.teacher.teacherId = teacherId;
  weeklyPlannerArchiveState.teacher.teacherName = teacherName;

  const nameEl = document.getElementById("weekly-planner-archive-teacher-name");
  if (nameEl) {
    nameEl.textContent = teacherName || "Submission History";
  }

  const rail = document.getElementById("weekly-planner-archive-teacher-rail");
  if (rail) {
    rail.innerHTML = "";
    const loading = document.createElement("p");
    loading.className = "helper-text";
    loading.textContent = "Loading planners...";
    rail.appendChild(loading);
  }

  setWeeklyPlannerArchiveTeacherMessage("");

  const result = await apiPost("/api/admin/weekly-planner/teacher-week-records", { teacherId }, state.token);

  if (!result || result.success !== true) {
    setWeeklyPlannerArchiveTeacherMessage(
      result && result.error ? result.error : "Unable to load submission history."
    );
    return;
  }

  if (weeklyPlannerArchiveState.teacher.teacherId !== teacherId) return;

  const weekRecords = (result.weekRecords || []).filter(entry =>
    isWeeklyPlannerArchiveSubmittedPlanner(entry && entry.planner)
  );
  weeklyPlannerArchiveState.teacher.weekRecords = weekRecords;
  weeklyPlannerArchiveState.teacher.teacher = result.teacher;

  if (result.teacher && result.teacher.teacherName && nameEl) {
    nameEl.textContent = result.teacher.teacherName;
  }

  renderWeeklyPlannerArchiveTeacherRail(result.teacher, weekRecords);
}

function renderWeeklyPlannerArchiveTeacherRail(teacher, weekRecords) {
  const rail = document.getElementById("weekly-planner-archive-teacher-rail");
  if (!rail) return;

  rail.innerHTML = "";

  if (weeklyPlannerArchiveState.teacher.observer) {
    weeklyPlannerArchiveState.teacher.observer.disconnect();
    weeklyPlannerArchiveState.teacher.observer = null;
  }

  if (!weekRecords.length) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "No submitted planners found.";
    rail.appendChild(empty);
    return;
  }

  const observer = setupWeeklyPlannerArchiveCardObserver(rail, card => {
    const cacheKey = card.dataset.weeklyPlannerArchiveCacheKey;
    const entry = weekRecords.find(item => `${teacher.teacherId}__${item.week.weekStart}` === cacheKey);
    if (entry && isWeeklyPlannerArchiveSubmittedPlanner(entry.planner)) {
      generateWeeklyPlannerArchiveCardPreview(card, cacheKey, {
        teacher,
        week: entry.week,
        plannerData: entry.planner.plannerData,
        groupNo: entry.planner.groupNo,
        feedback: entry.planner.feedback,
        feedbackBy: entry.planner.feedbackBy
      });
    }
  });
  weeklyPlannerArchiveState.teacher.observer = observer;

  weekRecords.forEach(entry => {
    const cacheKey = `${teacher.teacherId}__${entry.week.weekStart}`;
    const card = buildWeeklyPlannerArchiveCard({
      primaryLabel: formatWeeklyPlannerArchiveRange(entry.week),
      status: entry.planner.status,
      hasPlanner: true
    });
    card.dataset.weeklyPlannerArchiveCacheKey = cacheKey;
    rail.appendChild(card);

    if (!isWeeklyPlannerArchiveSubmittedPlanner(entry.planner)) return;

    const renderPayload = {
      teacher,
      week: entry.week,
      plannerData: entry.planner.plannerData,
      groupNo: entry.planner.groupNo,
      feedback: entry.planner.feedback,
      feedbackBy: entry.planner.feedbackBy
    };

    if (observer) {
      observer.observe(card);
    } else {
      generateWeeklyPlannerArchiveCardPreview(card, cacheKey, renderPayload);
    }
  });
}

function setWeeklyPlannerArchiveTeacherMessage(message) {
  const el = document.getElementById("weekly-planner-archive-teacher-message");
  if (el) el.textContent = message || "";
}

function returnToWeeklyPlannerArchiveHub() {
  showScreen("weekly-planner-archive-screen");
}

/* -------- Save / Share (acts on the whole current set of cards) -------- */

function getWeeklyPlannerArchiveWeekSetEntries() {
  const week = weeklyPlannerArchiveState.week.week;
  if (!week) return [];

  return (weeklyPlannerArchiveState.week.teacherRecords || []).map(entry => ({
    teacherName: entry.teacher.teacherName,
    weekStart: week.weekStart,
    hasPlanner: isWeeklyPlannerArchiveSubmittedPlanner(entry.planner),
    cacheKey: `${entry.teacher.teacherId}__${week.weekStart}`,
    renderPayload: entry.planner ? {
      teacher: entry.teacher,
      week,
      plannerData: entry.planner.plannerData,
      groupNo: entry.planner.groupNo,
      feedback: entry.planner.feedback,
      feedbackBy: entry.planner.feedbackBy
    } : null
  }));
}

function getWeeklyPlannerArchiveTeacherSetEntries() {
  const teacher = weeklyPlannerArchiveState.teacher.teacher;
  if (!teacher) return [];

  return (weeklyPlannerArchiveState.teacher.weekRecords || []).map(entry => ({
    teacherName: teacher.teacherName,
    weekStart: entry.week.weekStart,
    hasPlanner: isWeeklyPlannerArchiveSubmittedPlanner(entry.planner),
    cacheKey: `${teacher.teacherId}__${entry.week.weekStart}`,
    renderPayload: entry.planner ? {
      teacher,
      week: entry.week,
      plannerData: entry.planner.plannerData,
      groupNo: entry.planner.groupNo,
      feedback: entry.planner.feedback,
      feedbackBy: entry.planner.feedbackBy
    } : null
  }));
}

function buildWeeklyPlannerArchiveFilename(teacherName, weekStart) {
  const safeName = String(teacherName || "planner").trim().replace(/\s+/g, "-") || "planner";
  const safeWeek = String(weekStart || "").trim() || "week";
  return `${safeName}-${safeWeek}.png`;
}

async function collectWeeklyPlannerArchiveSetFiles(entries) {
  const files = [];

  for (const entry of entries) {
    if (!entry.hasPlanner || !entry.renderPayload) continue;

    let dataUrl = weeklyPlannerArchiveState.previewCache.get(entry.cacheKey);

    if (!dataUrl) {
      try {
        const rendered = await window.M4LWeeklyPlanner.renderPreview(entry.renderPayload);
        dataUrl = rendered.dataUrl;
        weeklyPlannerArchiveState.previewCache.set(entry.cacheKey, dataUrl);
      } catch (error) {
        console.warn("Unable to render a planner for save/share:", error);
        continue;
      }
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const filename = buildWeeklyPlannerArchiveFilename(entry.teacherName, entry.weekStart);
      files.push(new File([blob], filename, { type: "image/png" }));
    } catch (error) {
      console.warn("Unable to prepare a planner file for save/share:", error);
    }
  }

  return files;
}

async function saveWeeklyPlannerArchiveFiles(files) {
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
}

async function shareWeeklyPlannerArchiveFiles(files, title) {
  if (!files.length) return;

  const canUseFileShare = typeof navigator !== "undefined"
    && typeof navigator.share === "function"
    && typeof navigator.canShare === "function"
    && navigator.canShare({ files });

  if (canUseFileShare) {
    try {
      await navigator.share({ files, title: title || "Weekly Planners" });
      return;
    } catch (error) {
      if (error && error.name === "AbortError") return;
      console.warn("Sharing failed, falling back to saving instead:", error);
    }
  }

  // Devices/browsers without file-sharing support fall back to downloads.
  await saveWeeklyPlannerArchiveFiles(files);
}

async function handleWeeklyPlannerArchiveSaveOrShare(action, entries, title, setMessage) {
  const submittedEntries = entries.filter(entry => entry.hasPlanner);

  if (!submittedEntries.length) {
    if (setMessage) setMessage("Nothing submitted yet in this set.");
    return;
  }

  const files = await collectWeeklyPlannerArchiveSetFiles(submittedEntries);

  if (action === "share") {
    await shareWeeklyPlannerArchiveFiles(files, title);
  } else {
    await saveWeeklyPlannerArchiveFiles(files);
  }
}

/* -------- Shared status helpers -------- */

function weeklyPlannerArchiveStatusClass(status) {
  const value = String(status || "").toUpperCase();
  if (value === "READY") return "ready";
  if (value === "DRAFT") return "draft";
  return "missing";
}

function weeklyPlannerArchiveStatusLabel(status) {
  const value = String(status || "").toUpperCase();
  if (value === "READY") return "Submitted";
  if (value === "DRAFT") return "Draft";
  return "Not submitted";
}

function formatWeeklyPlannerArchiveRange(week) {
  if (!week || !week.weekStart || !week.weekEnd) return "";

  const start = new Date(`${week.weekStart}T12:00:00`);
  const end = new Date(`${week.weekEnd}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const month = end.toLocaleDateString(undefined, { month: "short" });
    return `${start.getDate()}\u2013${end.getDate()} ${month} ${end.getFullYear()}`;
  }

  const startText = start.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const endText = end.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${startText} \u2013 ${endText}`;
}

window.showWeeklyPlannerArchive = showWeeklyPlannerArchive;
window.returnToWeeklyPlannerFromArchive = returnToWeeklyPlannerFromArchive;
window.returnToWeeklyPlannerArchiveHub = returnToWeeklyPlannerArchiveHub;
window.returnToWeeklyPlannerArchiveFromWeekScreen = returnToWeeklyPlannerArchiveFromWeekScreen;
