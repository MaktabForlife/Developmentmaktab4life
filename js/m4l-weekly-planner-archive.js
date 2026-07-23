/* =========================
   WEEKLY PLANNER ARCHIVE - V97.1.6
   Admin-only view of past weekly planners:
   - Date picker + "recent weeks" summary -> full rendered preview rail for a week
   - Per-teacher submission heatmap (last 4 weeks) -> teacher submission history screen
   Reuses window.M4LWeeklyPlanner.renderPreview() for the actual canvas image,
   so the visual output matches the live planner preview exactly. Previews are
   generated progressively (only when a card scrolls into view) rather than
   all at once, so the rail stays smooth regardless of teacher count.
========================= */

const weeklyPlannerArchiveState = {
  eventsBound: false,
  overview: null,
  selectedWeekStart: "",
  weekRecordsCache: new Map(),
  previewCache: new Map(),
  cardObserver: null,
  teacher: {
    teacherId: "",
    teacherName: "",
    history: []
  }
};

async function showWeeklyPlannerArchive() {
  showScreen("weekly-planner-archive-screen");
  bindWeeklyPlannerArchiveEvents();

  const weekInput = document.getElementById("weekly-planner-archive-week");
  let resolvedWeekStart = "";

  try {
    resolvedWeekStart = await loadWeeklyPlannerArchiveOverview(weekInput ? weekInput.value : "");
  } catch (error) {
    setWeeklyPlannerArchiveRailMessage(error.message || "Unable to load the archive overview.");
  }

  const weekStart = resolvedWeekStart || window.M4LWeeklyPlanner.getWeekMeta().weekStart;

  if (weekInput) {
    weekInput.value = weekStart;
  }

  try {
    await selectWeeklyPlannerArchiveWeek(weekStart);
  } catch (error) {
    setWeeklyPlannerArchiveRailMessage(error.message || "Unable to load planners for that week.");
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

      selectWeeklyPlannerArchiveWeek(meta.weekStart).catch(error => {
        setWeeklyPlannerArchiveRailMessage(error.message || "Unable to load that week.");
      });
    };

    // Some mobile browsers/webviews are inconsistent about firing "change" for
    // native date inputs, so "input" is bound too; the value-comparison guard
    // above stops the pair from double-firing for the same selection.
    weekInput.addEventListener("change", handleWeekInputChange);
    weekInput.addEventListener("input", handleWeekInputChange);
  }

  const summaryRail = document.getElementById("weekly-planner-archive-summary-rail");
  if (summaryRail) {
    summaryRail.addEventListener("click", event => {
      const card = event.target.closest("[data-weekly-planner-archive-week]");
      if (!card) return;

      const weekStart = card.dataset.weeklyPlannerArchiveWeek;
      if (weekInput) weekInput.value = weekStart;

      selectWeeklyPlannerArchiveWeek(weekStart).catch(error => {
        setWeeklyPlannerArchiveRailMessage(error.message || "Unable to load that week.");
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

  const rail = document.getElementById("weekly-planner-archive-rail");
  if (rail) {
    rail.addEventListener("click", event => {
      const heatmapStrip = event.target.closest("[data-weekly-planner-archive-card-heatmap]");
      if (heatmapStrip) {
        showWeeklyPlannerArchiveTeacher(
          heatmapStrip.dataset.weeklyPlannerArchiveCardHeatmap,
          heatmapStrip.dataset.weeklyPlannerArchiveCardHeatmapName || ""
        ).catch(error => {
          console.warn("Unable to open teacher submission history:", error);
        });
        return;
      }

      const card = event.target.closest("[data-weekly-planner-archive-card]");
      if (!card) return;
      toggleWeeklyPlannerArchiveCardExpanded(card);
    });
  }

  const teacherHeatmap = document.getElementById("weekly-planner-archive-teacher-heatmap");
  if (teacherHeatmap) {
    teacherHeatmap.addEventListener("click", event => {
      const dot = event.target.closest("[data-weekly-planner-archive-teacher-week]");
      if (!dot) return;

      selectWeeklyPlannerArchiveTeacherWeek(dot.dataset.weeklyPlannerArchiveTeacherWeek).catch(error => {
        setWeeklyPlannerArchiveTeacherMessage(error.message || "Unable to load that week.");
      });
    });
  }
}

/* -------- Hub: overview (recent weeks + per-teacher heatmap) -------- */

async function loadWeeklyPlannerArchiveOverview(weekStart) {
  const summaryRail = document.getElementById("weekly-planner-archive-summary-rail");
  if (summaryRail) {
    summaryRail.innerHTML = "";
    const loading = document.createElement("p");
    loading.className = "helper-text";
    loading.textContent = "Loading recent weeks...";
    summaryRail.appendChild(loading);
  }

  const result = await apiPost("/api/admin/weekly-planner/archive-overview", { weekStart }, state.token);

  if (!result || result.success !== true) {
    throw new Error(result && result.error ? result.error : "Unable to load the archive overview.");
  }

  weeklyPlannerArchiveState.overview = result;
  renderWeeklyPlannerArchiveSummary(result.weeks || []);
  renderWeeklyPlannerArchiveHeatmapList(result.teacherMatrix || []);

  const weeks = result.weeks || [];
  return weeks.length ? weeks[weeks.length - 1].weekStart : "";
}

function renderWeeklyPlannerArchiveSummary(weeks) {
  const rail = document.getElementById("weekly-planner-archive-summary-rail");
  if (!rail) return;

  rail.innerHTML = "";

  weeks.forEach(week => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "weekly-planner-archive-summary-card";
    card.dataset.weeklyPlannerArchiveWeek = week.weekStart;
    card.setAttribute("role", "listitem");

    if (week.weekStart === weeklyPlannerArchiveState.selectedWeekStart) {
      card.classList.add("is-selected");
    }

    const range = document.createElement("span");
    range.className = "weekly-planner-archive-summary-card__range";
    range.textContent = formatWeeklyPlannerArchiveRange(week);

    const count = document.createElement("span");
    count.className = "weekly-planner-archive-summary-card__count";
    count.textContent = `${week.submittedCount}/${week.totalTeachers} submitted`;

    card.appendChild(range);
    card.appendChild(count);
    rail.appendChild(card);
  });
}

function renderWeeklyPlannerArchiveHeatmapList(teacherMatrix) {
  const list = document.getElementById("weekly-planner-archive-heatmap-list");
  if (!list) return;

  list.innerHTML = "";

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

    row.appendChild(name);
    row.appendChild(dots);
    list.appendChild(row);
  });
}

/* -------- Hub: full-preview rail for the selected week -------- */

async function selectWeeklyPlannerArchiveWeek(weekStart) {
  weeklyPlannerArchiveState.selectedWeekStart = weekStart;
  updateWeeklyPlannerArchiveSummarySelection();
  setWeeklyPlannerArchiveRailMessage("");

  const rail = document.getElementById("weekly-planner-archive-rail");
  if (!rail) return;

  rail.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "helper-text";
  loading.textContent = "Loading planners...";
  rail.appendChild(loading);

  let teacherRecords;
  let week;
  const cached = weeklyPlannerArchiveState.weekRecordsCache.get(weekStart);

  if (cached) {
    teacherRecords = cached.teacherRecords;
    week = cached.week;
  } else {
    const result = await apiPost("/api/admin/weekly-planner/week-records", { weekStart }, state.token);

    if (!result || result.success !== true) {
      throw new Error(result && result.error ? result.error : "Unable to load planners for that week.");
    }

    teacherRecords = result.teacherRecords || [];
    week = result.week;
    weeklyPlannerArchiveState.weekRecordsCache.set(weekStart, { teacherRecords, week });
  }

  // A newer selection may have started while this request was in flight.
  if (weeklyPlannerArchiveState.selectedWeekStart !== weekStart) return;

  const titleEl = document.getElementById("weekly-planner-archive-rail-title");
  if (titleEl) {
    titleEl.textContent = `Planners for ${formatWeeklyPlannerArchiveRange(week)}`;
  }

  renderWeeklyPlannerArchiveRail(week, teacherRecords);
}

function renderWeeklyPlannerArchiveRail(week, teacherRecords) {
  const rail = document.getElementById("weekly-planner-archive-rail");
  if (!rail) return;

  rail.innerHTML = "";

  if (weeklyPlannerArchiveState.cardObserver) {
    weeklyPlannerArchiveState.cardObserver.disconnect();
    weeklyPlannerArchiveState.cardObserver = null;
  }

  if (!teacherRecords.length) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "No teachers found.";
    rail.appendChild(empty);
    return;
  }

  const observer = typeof IntersectionObserver === "function"
    ? new IntersectionObserver(handleWeeklyPlannerArchiveCardIntersect, {
        root: rail,
        rootMargin: "200px",
        threshold: 0.01
      })
    : null;
  weeklyPlannerArchiveState.cardObserver = observer;

  teacherRecords.forEach(entry => {
    const card = buildWeeklyPlannerArchiveCard(week, entry);
    rail.appendChild(card);

    if (observer) {
      observer.observe(card);
    } else {
      generateWeeklyPlannerArchiveCardPreview(card, week, entry);
    }
  });
}

function handleWeeklyPlannerArchiveCardIntersect(entries, observer) {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const card = entry.target;
    observer.unobserve(card);

    const weekStart = card.dataset.weeklyPlannerArchiveCardWeek;
    const teacherId = card.dataset.weeklyPlannerArchiveCard;
    const cached = weeklyPlannerArchiveState.weekRecordsCache.get(weekStart);
    const record = cached && cached.teacherRecords.find(item => item.teacher.teacherId === teacherId);

    if (record) {
      generateWeeklyPlannerArchiveCardPreview(card, cached.week, record);
    }
  });
}

function buildWeeklyPlannerArchiveCard(week, entry) {
  const card = document.createElement("div");
  card.className = "weekly-planner-archive-card";
  card.setAttribute("role", "listitem");
  card.dataset.weeklyPlannerArchiveCard = entry.teacher.teacherId;
  card.dataset.weeklyPlannerArchiveCardWeek = week.weekStart;

  const statusValue = entry.planner ? entry.planner.status : "MISSING";
  if (!entry.planner) card.classList.add("is-missing");

  const header = document.createElement("div");
  header.className = "weekly-planner-archive-card__header";

  const name = document.createElement("span");
  name.className = "weekly-planner-archive-card__name";
  name.textContent = entry.teacher.teacherName;

  const status = document.createElement("span");
  status.className = `weekly-planner-archive-card__status weekly-planner-archive-card__status--${weeklyPlannerArchiveStatusClass(statusValue)}`;
  status.textContent = weeklyPlannerArchiveStatusLabel(statusValue);

  header.appendChild(name);
  header.appendChild(status);

  const imageWrap = document.createElement("div");
  imageWrap.className = "weekly-planner-archive-card__image-wrap";

  if (entry.planner) {
    const image = document.createElement("img");
    image.className = "weekly-planner-archive-card__image";
    image.alt = `${entry.teacher.teacherName} planner preview`;
    imageWrap.appendChild(image);
  } else {
    const emptyLabel = document.createElement("p");
    emptyLabel.className = "weekly-planner-archive-card__empty helper-text";
    emptyLabel.textContent = "Not submitted for this week";
    imageWrap.appendChild(emptyLabel);
  }

  const heatmapStrip = buildWeeklyPlannerArchiveCardHeatmapStrip(entry.teacher);

  card.appendChild(header);
  card.appendChild(imageWrap);
  card.appendChild(heatmapStrip);

  return card;
}

function buildWeeklyPlannerArchiveCardHeatmapStrip(teacher) {
  const strip = document.createElement("button");
  strip.type = "button";
  strip.className = "weekly-planner-archive-card__heatmap";
  strip.dataset.weeklyPlannerArchiveCardHeatmap = teacher.teacherId;
  strip.dataset.weeklyPlannerArchiveCardHeatmapName = teacher.teacherName;
  strip.setAttribute("aria-label", `View ${teacher.teacherName}'s submission history`);

  const overview = weeklyPlannerArchiveState.overview;
  const matrixEntry = overview && (overview.teacherMatrix || [])
    .find(item => item.teacherId === teacher.teacherId);

  ((matrixEntry && matrixEntry.weeks) || []).forEach(week => {
    const dot = document.createElement("i");
    dot.className = `weekly-planner-archive-dot weekly-planner-archive-dot--${weeklyPlannerArchiveStatusClass(week.status)}`;
    strip.appendChild(dot);
  });

  return strip;
}

async function generateWeeklyPlannerArchiveCardPreview(card, week, entry) {
  if (!entry.planner) return;

  const image = card.querySelector(".weekly-planner-archive-card__image");
  if (!image) return;

  const cacheKey = `${entry.teacher.teacherId}__${week.weekStart}`;
  const cachedDataUrl = weeklyPlannerArchiveState.previewCache.get(cacheKey);

  if (cachedDataUrl) {
    image.src = cachedDataUrl;
    card.classList.add("is-rendered");
    return;
  }

  card.classList.add("is-loading");

  try {
    const result = await window.M4LWeeklyPlanner.renderPreview({
      teacher: entry.teacher,
      week,
      plannerData: entry.planner.plannerData,
      groupNo: entry.planner.groupNo,
      feedback: entry.planner.feedback,
      feedbackBy: entry.planner.feedbackBy
    });

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

function toggleWeeklyPlannerArchiveCardExpanded(card) {
  const rail = document.getElementById("weekly-planner-archive-rail");
  if (!rail) return;

  const alreadyExpanded = card.classList.contains("is-expanded");
  rail.querySelectorAll(".weekly-planner-archive-card.is-expanded").forEach(el => {
    el.classList.remove("is-expanded");
  });

  if (!alreadyExpanded) card.classList.add("is-expanded");
}

function updateWeeklyPlannerArchiveSummarySelection() {
  const rail = document.getElementById("weekly-planner-archive-summary-rail");
  if (!rail) return;

  rail.querySelectorAll("[data-weekly-planner-archive-week]").forEach(card => {
    card.classList.toggle(
      "is-selected",
      card.dataset.weeklyPlannerArchiveWeek === weeklyPlannerArchiveState.selectedWeekStart
    );
  });
}

function setWeeklyPlannerArchiveRailMessage(message) {
  const el = document.getElementById("weekly-planner-archive-rail-message");
  if (el) el.textContent = message || "";
}

function returnToWeeklyPlannerFromArchive() {
  showScreen("weekly-planner-screen");
}

/* -------- Teacher submission history screen -------- */

async function showWeeklyPlannerArchiveTeacher(teacherId, teacherName) {
  showScreen("weekly-planner-archive-teacher-screen");
  bindWeeklyPlannerArchiveEvents();

  weeklyPlannerArchiveState.teacher.teacherId = teacherId;
  weeklyPlannerArchiveState.teacher.teacherName = teacherName;

  const nameEl = document.getElementById("weekly-planner-archive-teacher-name");
  if (nameEl) {
    nameEl.textContent = teacherName ? `${teacherName} \u2013 Submission History` : "Submission History";
  }

  const heatmap = document.getElementById("weekly-planner-archive-teacher-heatmap");
  if (heatmap) heatmap.innerHTML = "";

  const previewHost = document.getElementById("weekly-planner-archive-teacher-preview");
  if (previewHost) previewHost.innerHTML = "";

  setWeeklyPlannerArchiveTeacherMessage("Loading...");

  const result = await apiPost("/api/admin/weekly-planner/teacher-history", { teacherId }, state.token);

  if (!result || result.success !== true) {
    setWeeklyPlannerArchiveTeacherMessage(
      result && result.error ? result.error : "Unable to load submission history."
    );
    return;
  }

  weeklyPlannerArchiveState.teacher.history = result.history || [];

  if (result.teacher && result.teacher.teacherName && nameEl) {
    nameEl.textContent = `${result.teacher.teacherName} \u2013 Submission History`;
  }

  setWeeklyPlannerArchiveTeacherMessage("");
  renderWeeklyPlannerArchiveTeacherHeatmap(weeklyPlannerArchiveState.teacher.history);

  const history = weeklyPlannerArchiveState.teacher.history;
  const mostRecentSubmitted = [...history].reverse().find(week => week.status !== "MISSING");
  const initialWeek = mostRecentSubmitted || history[history.length - 1];

  if (initialWeek) {
    try {
      await selectWeeklyPlannerArchiveTeacherWeek(initialWeek.weekStart);
    } catch (error) {
      setWeeklyPlannerArchiveTeacherMessage(error.message || "Unable to load that week.");
    }
  }
}

function renderWeeklyPlannerArchiveTeacherHeatmap(history) {
  const container = document.getElementById("weekly-planner-archive-teacher-heatmap");
  if (!container) return;

  container.innerHTML = "";

  history.forEach(week => {
    const dotButton = document.createElement("button");
    dotButton.type = "button";
    dotButton.className = `weekly-planner-archive-teacher-heatmap-dot weekly-planner-archive-dot--${weeklyPlannerArchiveStatusClass(week.status)}`;
    dotButton.dataset.weeklyPlannerArchiveTeacherWeek = week.weekStart;
    dotButton.setAttribute("role", "listitem");
    dotButton.setAttribute(
      "aria-label",
      `${formatWeeklyPlannerArchiveRange(week)}: ${weeklyPlannerArchiveStatusLabel(week.status)}`
    );

    const label = document.createElement("span");
    label.className = "weekly-planner-archive-teacher-heatmap-dot__label";
    label.textContent = formatWeeklyPlannerArchiveRange(week);

    dotButton.appendChild(label);
    container.appendChild(dotButton);
  });
}

async function selectWeeklyPlannerArchiveTeacherWeek(weekStart) {
  const container = document.getElementById("weekly-planner-archive-teacher-heatmap");
  if (container) {
    container.querySelectorAll("[data-weekly-planner-archive-teacher-week]").forEach(dot => {
      dot.classList.toggle(
        "is-selected",
        dot.dataset.weeklyPlannerArchiveTeacherWeek === weekStart
      );
    });
  }

  const previewHost = document.getElementById("weekly-planner-archive-teacher-preview");
  if (!previewHost) return;

  previewHost.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "helper-text";
  loading.textContent = "Loading planner...";
  previewHost.appendChild(loading);
  setWeeklyPlannerArchiveTeacherMessage("");

  const teacherId = weeklyPlannerArchiveState.teacher.teacherId;
  const result = await apiPost("/api/admin/weekly-planner/get", { teacherId, weekStart }, state.token);

  previewHost.innerHTML = "";

  if (!result || result.success !== true) {
    setWeeklyPlannerArchiveTeacherMessage(result && result.error ? result.error : "Unable to load that week.");
    return;
  }

  if (!result.planner) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "Not submitted for this week.";
    previewHost.appendChild(empty);
    return;
  }

  const image = document.createElement("img");
  image.className = "weekly-planner-archive-teacher-preview__image";
  image.alt = `${result.teacher.teacherName} planner preview`;
  previewHost.appendChild(image);

  const cacheKey = `${teacherId}__${weekStart}`;
  const cachedDataUrl = weeklyPlannerArchiveState.previewCache.get(cacheKey);

  if (cachedDataUrl) {
    image.src = cachedDataUrl;
    return;
  }

  try {
    const rendered = await window.M4LWeeklyPlanner.renderPreview({
      teacher: result.teacher,
      week: result.week,
      plannerData: result.planner.plannerData,
      groupNo: result.planner.groupNo,
      feedback: result.planner.feedback,
      feedbackBy: result.planner.feedbackBy
    });

    weeklyPlannerArchiveState.previewCache.set(cacheKey, rendered.dataUrl);
    image.src = rendered.dataUrl;
  } catch (error) {
    setWeeklyPlannerArchiveTeacherMessage(error.message || "Unable to render the planner preview.");
  }
}

function setWeeklyPlannerArchiveTeacherMessage(message) {
  const el = document.getElementById("weekly-planner-archive-teacher-message");
  if (el) el.textContent = message || "";
}

function returnToWeeklyPlannerArchiveHub() {
  showScreen("weekly-planner-archive-screen");
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
