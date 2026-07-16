/* M4L v95.0 Weekly Planner
   - Four equal, swipeable cards: Monday to Thursday.
   - Current timetable supplies period order and subject defaults; times are not shown.
   - A new week can be prefilled from the previous planner.
   - Save writes through the Worker's direct Google Sheets API route.
   - The portrait PNG is generated in the browser and is never uploaded or stored. */

const WEEKLY_PLANNER_DAYS = Object.freeze([
  { key: "monday", label: "Monday", timetableKeys: ["mon", "monday"] },
  { key: "tuesday", label: "Tuesday", timetableKeys: ["tue", "tues", "tuesday"] },
  { key: "wednesday", label: "Wednesday", timetableKeys: ["wed", "weds", "wednesday"] },
  { key: "thursday", label: "Thursday", timetableKeys: ["thu", "thur", "thurs", "thursday"] }
]);

const weeklyPlannerState = {
  initialized: false,
  eventsBound: false,
  loadingSequence: 0,
  teachers: [],
  teacher: null,
  week: null,
  planner: null,
  previousPlanner: null,
  plannerData: null,
  expectedUpdatedDate: "",
  activeCardIndex: 0,
  scrollFrame: 0,
  previewDataUrl: "",
  previewBlob: null
};

async function showWeeklyPlanner() {
  showScreen("weekly-planner-screen");

  try {
    await initializeWeeklyPlanner();
  } catch (error) {
    setWeeklyPlannerMessage(error.message || "Unable to open the weekly planner.", "error");
  }
}

async function initializeWeeklyPlanner() {
  bindWeeklyPlannerEvents();
  const weekInput = document.getElementById("weekly-planner-week");

  if (weekInput && !weekInput.value) {
    weekInput.value = getWeeklyPlannerWeekMeta().weekStart;
  }

  if (!weeklyPlannerState.initialized) {
    setWeeklyPlannerMessage("Checking the planner connection...", "");

    const [health, teacherResult] = await Promise.all([
      apiPost("/api/admin/weekly-planner/health", {}, state.token),
      apiPost("/api/admin/weekly-planner/teachers", {}, state.token)
    ]);

    if (!health.success) {
      throw new Error(health.error || health.detail || "The WeeklyPlanners sheet is not available.");
    }

    if (!teacherResult.success) {
      throw new Error(teacherResult.error || "Unable to load teachers.");
    }

    weeklyPlannerState.teachers = Array.isArray(teacherResult.teachers)
      ? teacherResult.teachers
      : [];
    renderWeeklyPlannerTeacherOptions();
    weeklyPlannerState.initialized = true;
  }

  await loadWeeklyPlanner();
}

function bindWeeklyPlannerEvents() {
  if (weeklyPlannerState.eventsBound) return;

  weeklyPlannerState.eventsBound = true;
  const teacherSelect = document.getElementById("weekly-planner-teacher");
  const weekInput = document.getElementById("weekly-planner-week");
  const rail = document.getElementById("weekly-planner-rail");
  const dots = document.getElementById("weekly-planner-dots");

  if (teacherSelect) {
    teacherSelect.addEventListener("change", () => {
      loadWeeklyPlanner().catch(error => {
        setWeeklyPlannerMessage(error.message || "Unable to load the selected teacher.", "error");
      });
    });
  }

  if (weekInput) {
    weekInput.addEventListener("change", () => {
      weekInput.value = getWeeklyPlannerWeekMeta(weekInput.value).weekStart;
      loadWeeklyPlanner().catch(error => {
        setWeeklyPlannerMessage(error.message || "Unable to load the selected week.", "error");
      });
    });
  }

  if (rail) {
    rail.addEventListener("scroll", scheduleWeeklyPlannerDotUpdate, { passive: true });
    rail.addEventListener("input", handleWeeklyPlannerCardInput);
    rail.addEventListener("click", handleWeeklyPlannerCardClick);
  }

  if (dots) {
    dots.addEventListener("click", event => {
      const button = event.target.closest("[data-weekly-planner-dot]");
      if (!button) return;
      scrollWeeklyPlannerToCard(Number(button.dataset.weeklyPlannerDot || 0));
    });
  }
}

function renderWeeklyPlannerTeacherOptions() {
  const select = document.getElementById("weekly-planner-teacher");
  if (!select) return;

  const currentUser = state.user || {};
  const currentTeacherId = String(currentUser.adminid || "").trim();
  const currentRole = String(currentUser.role || "").trim().toUpperCase();
  let teachers = weeklyPlannerState.teachers.slice();

  if (!teachers.length && currentTeacherId) {
    teachers = [{
      teacherId: currentTeacherId,
      teacherName: String(currentUser.username || "Teacher").trim(),
      role: currentRole,
      assignedGroup: String(currentUser.assignedgroup || "").trim(),
      active: true
    }];
  }

  select.innerHTML = teachers.map(teacher => {
    const selected = teacher.teacherId === currentTeacherId ? " selected" : "";
    const group = String(teacher.assignedGroup || "").trim();
    const suffix = group && group.toUpperCase() !== "ALL" ? ` · Group ${group}` : "";
    return `<option value="${weeklyPlannerEscapeAttribute(teacher.teacherId)}"${selected}>${weeklyPlannerEscapeHtml(teacher.teacherName)}${weeklyPlannerEscapeHtml(suffix)}</option>`;
  }).join("");

  select.disabled = currentRole === "TEACHER" || teachers.length <= 1;
  weeklyPlannerState.teachers = teachers;
}

async function loadWeeklyPlanner() {
  const teacher = getSelectedWeeklyPlannerTeacher();
  const weekInput = document.getElementById("weekly-planner-week");

  if (!teacher) {
    throw new Error("No teacher is available for this planner.");
  }

  const week = getWeeklyPlannerWeekMeta(weekInput ? weekInput.value : "");
  const loadSequence = ++weeklyPlannerState.loadingSequence;

  weeklyPlannerState.teacher = teacher;
  weeklyPlannerState.week = week;
  weeklyPlannerState.activeCardIndex = 0;
  renderWeeklyPlannerLoadingState();
  updateWeeklyPlannerSummary(week);
  setWeeklyPlannerMessage("Loading planner and timetable...", "");

  const result = await apiPost("/api/admin/weekly-planner/get", {
    teacherId: teacher.teacherId,
    weekStart: week.weekStart
  }, state.token);

  if (loadSequence !== weeklyPlannerState.loadingSequence) return;

  if (!result.success) {
    throw new Error(result.error || result.detail || "Unable to load the weekly planner.");
  }

  weeklyPlannerState.teacher = result.teacher || teacher;
  weeklyPlannerState.week = result.week || week;
  weeklyPlannerState.planner = result.planner || null;
  weeklyPlannerState.previousPlanner = result.previousPlanner || null;
  weeklyPlannerState.expectedUpdatedDate = String(result.planner?.updatedDate || "");

  const groupInput = document.getElementById("weekly-planner-group");
  const feedbackInput = document.getElementById("weekly-planner-feedback");
  const feedbackBy = document.getElementById("weekly-planner-feedback-by");
  const groupNo = String(
    result.planner?.groupNo ||
    result.teacher?.assignedGroup ||
    result.previousPlanner?.groupNo ||
    ""
  ).trim();

  if (groupInput) groupInput.value = groupNo.toUpperCase() === "ALL" ? "" : groupNo;
  if (feedbackInput) feedbackInput.value = String(result.planner?.feedback || "");
  if (feedbackBy) {
    feedbackBy.textContent = result.planner?.feedbackBy
      ? `Last feedback by ${result.planner.feedbackBy}`
      : "Feedback may be added by the teacher or an administrator.";
  }

  let timetableResult = null;

  try {
    timetableResult = await fetchWeeklyPlannerTimetable(result.teacher || teacher, groupNo);
  } catch (error) {
    console.warn("Weekly Planner timetable defaults were unavailable:", error);
  }

  if (loadSequence !== weeklyPlannerState.loadingSequence) return;

  const timetableRows = normalizeWeeklyPlannerTimetableRows(timetableResult);
  renderWeeklyPlannerGroupOptions(timetableRows, result.teacher || teacher, groupNo);

  weeklyPlannerState.plannerData = result.planner
    ? normalizeWeeklyPlannerData(result.planner.plannerData, weeklyPlannerState.week)
    : buildWeeklyPlannerDataFromDefaults(
      timetableRows,
      result.previousPlanner?.plannerData,
      weeklyPlannerState.week
    );

  renderWeeklyPlannerCards();

  if (result.planner) {
    setWeeklyPlannerMessage("Saved planner loaded.", "success");
  } else if (result.previousPlanner) {
    setWeeklyPlannerMessage("Last week’s entries have been copied as a starting point.", "success");
  } else {
    setWeeklyPlannerMessage("Planner ready. Period subjects were taken from the current timetable.", "success");
  }
}

async function fetchWeeklyPlannerTimetable(teacher, groupNo) {
  const options = {
    groupNo: groupNo || teacher.assignedGroup || "ALL",
    assignedTeacher: teacher.teacherName || "ALL"
  };

  if (window.M4LTimetable && typeof window.M4LTimetable.fetchTimetable === "function") {
    return window.M4LTimetable.fetchTimetable(options);
  }

  const result = await apiPost("/api/timetable/get", options, state.token);
  if (!result.success) throw new Error(result.error || "Unable to load timetable");
  return result;
}

function normalizeWeeklyPlannerTimetableRows(result) {
  if (!result) return [];

  if (typeof normalizeTimetableRows === "function") {
    return normalizeTimetableRows(result);
  }

  if (Array.isArray(result.sessions)) return result.sessions;
  if (Array.isArray(result.rows)) return result.rows;
  if (Array.isArray(result.data)) return result.data;
  return [];
}

function renderWeeklyPlannerGroupOptions(rows, teacher, selectedGroup) {
  const datalist = document.getElementById("weekly-planner-groups");
  if (!datalist) return;

  const groups = new Set();
  [selectedGroup, teacher?.assignedGroup].forEach(value => {
    const group = String(value || "").trim();
    if (group && group.toUpperCase() !== "ALL") groups.add(group);
  });

  (rows || []).forEach(row => {
    const group = String(row.groupno || row.groupNo || row.group || "").trim();
    if (group && group.toUpperCase() !== "ALL") groups.add(group);
  });

  datalist.innerHTML = Array.from(groups)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map(group => `<option value="${weeklyPlannerEscapeAttribute(group)}"></option>`)
    .join("");
}

function buildWeeklyPlannerDataFromDefaults(rows, previousData, week) {
  const previous = normalizeWeeklyPlannerData(previousData, week);
  const timetableByDay = buildWeeklyPlannerTimetablePeriods(rows);

  return {
    version: 1,
    days: WEEKLY_PLANNER_DAYS.map((dayConfig, dayIndex) => {
      const timetablePeriods = timetableByDay[dayConfig.key] || [];
      const previousDay = previous.days[dayIndex] || { periods: [] };
      const previousPeriods = Array.isArray(previousDay.periods) ? previousDay.periods : [];
      const periodCount = Math.max(
        timetablePeriods.length,
        previousPeriods.length,
        timetablePeriods.length || previousPeriods.length ? 0 : 3
      );

      return {
        key: dayConfig.key,
        label: dayConfig.label,
        date: addWeeklyPlannerDays(week.weekStart, dayIndex),
        periods: Array.from({ length: periodCount }, (_, periodIndex) => {
          const timetablePeriod = timetablePeriods[periodIndex] || {};
          const previousPeriod = previousPeriods[periodIndex] || {};
          return {
            id: String(previousPeriod.id || `period-${periodIndex + 1}`),
            label: String(previousPeriod.label || getWeeklyPlannerPeriodLabel(periodIndex)),
            subject: String(timetablePeriod.subject || previousPeriod.subject || ""),
            entries: normalizeWeeklyPlannerEntries(previousPeriod.entries)
          };
        })
      };
    })
  };
}

function buildWeeklyPlannerTimetablePeriods(rows) {
  const result = Object.fromEntries(WEEKLY_PLANNER_DAYS.map(day => [day.key, []]));

  WEEKLY_PLANNER_DAYS.forEach(dayConfig => {
    const dayRows = (rows || []).filter(row => {
      const value = weeklyPlannerNormalizeKey(
        row.dayofweek || row.dayOfWeek || row.day || ""
      );
      return dayConfig.timetableKeys.includes(value);
    });
    const periodsByTime = new Map();

    dayRows.forEach(row => {
      const timeValue = row.starttime ?? row.startTime ?? row.time ?? "";
      const timeKey = String(timeValue);
      const subject = String(
        row.subjectname || row.subjectName || row.subject || ""
      ).trim();

      if (!subject) return;

      if (!periodsByTime.has(timeKey)) {
        periodsByTime.set(timeKey, {
          time: timeValue,
          subjects: []
        });
      }

      const period = periodsByTime.get(timeKey);
      if (!period.subjects.some(value => weeklyPlannerNormalizeKey(value) === weeklyPlannerNormalizeKey(subject))) {
        period.subjects.push(subject);
      }
    });

    result[dayConfig.key] = Array.from(periodsByTime.values())
      .sort((a, b) => getWeeklyPlannerTimeMinutes(a.time) - getWeeklyPlannerTimeMinutes(b.time))
      .map(period => ({ subject: period.subjects.join(" / ") }));
  });

  return result;
}

function normalizeWeeklyPlannerData(value, week) {
  const source = value && typeof value === "object" ? value : {};
  const sourceDays = Array.isArray(source.days) ? source.days : [];

  return {
    version: 1,
    days: WEEKLY_PLANNER_DAYS.map((dayConfig, dayIndex) => {
      const matched = sourceDays.find(day => {
        return weeklyPlannerNormalizeKey(day?.key || day?.label) === dayConfig.key;
      }) || sourceDays[dayIndex] || {};
      const periods = Array.isArray(matched.periods) ? matched.periods : [];

      return {
        key: dayConfig.key,
        label: dayConfig.label,
        date: addWeeklyPlannerDays(week.weekStart, dayIndex),
        periods: periods.map((period, periodIndex) => ({
          id: String(period?.id || `period-${periodIndex + 1}`),
          label: String(period?.label || getWeeklyPlannerPeriodLabel(periodIndex)),
          subject: String(period?.subject || ""),
          entries: normalizeWeeklyPlannerEntries(period?.entries)
        }))
      };
    })
  };
}

function normalizeWeeklyPlannerEntries(value) {
  if (Array.isArray(value)) {
    return value.map(entry => String(entry || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map(entry => entry.trim())
    .filter(Boolean);
}

function renderWeeklyPlannerLoadingState() {
  const rail = document.getElementById("weekly-planner-rail");
  const dots = document.getElementById("weekly-planner-dots");
  if (rail) rail.innerHTML = `<p class="helper-text">Loading weekly planner...</p>`;
  if (dots) dots.innerHTML = "";
}

function renderWeeklyPlannerCards() {
  const rail = document.getElementById("weekly-planner-rail");
  const dots = document.getElementById("weekly-planner-dots");
  const plannerData = weeklyPlannerState.plannerData;

  if (!rail || !dots || !plannerData) return;

  rail.innerHTML = plannerData.days.map((day, dayIndex) => {
    const periods = Array.isArray(day.periods) && day.periods.length
      ? day.periods
      : [{ id: "period-1", label: "Period One", subject: "", entries: [] }];
    day.periods = periods;

    return `
      <article class="weekly-planner-day-card" data-weekly-planner-day="${dayIndex}" aria-label="${weeklyPlannerEscapeAttribute(day.label)} planner">
        <header class="weekly-planner-day-heading">
          <h3>${weeklyPlannerEscapeHtml(day.label)}</h3>
          <span class="weekly-planner-day-date">${weeklyPlannerEscapeHtml(formatWeeklyPlannerDisplayDate(day.date))}</span>
        </header>
        <div class="weekly-planner-periods">
          ${periods.map((period, periodIndex) => renderWeeklyPlannerPeriod(dayIndex, periodIndex, period, periods.length)).join("")}
        </div>
        <div class="weekly-planner-add-period-wrap">
          <button class="weekly-planner-add-period" type="button" data-weekly-planner-add-period="${dayIndex}">Add period</button>
        </div>
      </article>
    `;
  }).join("");

  dots.innerHTML = plannerData.days.map((day, index) => {
    const active = index === weeklyPlannerState.activeCardIndex;
    return `
      <button
        type="button"
        class="weekly-planner-dot${active ? " is-active" : ""}"
        data-weekly-planner-dot="${index}"
        aria-label="Show ${weeklyPlannerEscapeAttribute(day.label)}"
        aria-current="${active ? "true" : "false"}"
      ></button>
    `;
  }).join("");

  requestAnimationFrame(() => scrollWeeklyPlannerToCard(weeklyPlannerState.activeCardIndex, false));
}

function renderWeeklyPlannerPeriod(dayIndex, periodIndex, period, periodCount) {
  const removeDisabled = periodCount <= 1 ? " disabled" : "";

  return `
    <div class="weekly-planner-period-row" data-weekly-planner-period="${periodIndex}">
      <div class="weekly-planner-period-name-cell">
        <input
          class="weekly-planner-period-label"
          type="text"
          value="${weeklyPlannerEscapeAttribute(period.label)}"
          data-weekly-planner-field="label"
          aria-label="Period label"
        />
        <button
          class="weekly-planner-remove-period"
          type="button"
          data-weekly-planner-remove-period="${dayIndex}:${periodIndex}"
          aria-label="Remove ${weeklyPlannerEscapeAttribute(period.label)}"
          ${removeDisabled}
        >Remove</button>
      </div>
      <div class="weekly-planner-period-content">
        <input
          class="weekly-planner-period-subject"
          type="text"
          value="${weeklyPlannerEscapeAttribute(period.subject)}"
          data-weekly-planner-field="subject"
          placeholder="Subject"
          aria-label="Subject"
        />
        <textarea
          class="weekly-planner-period-entries"
          data-weekly-planner-field="entries"
          rows="4"
          placeholder="Enter each activity on a new line"
          aria-label="Activities"
        >${weeklyPlannerEscapeHtml((period.entries || []).join("\n"))}</textarea>
      </div>
    </div>
  `;
}

function handleWeeklyPlannerCardInput(event) {
  const field = event.target.closest("[data-weekly-planner-field]");
  const dayCard = event.target.closest("[data-weekly-planner-day]");
  const periodRow = event.target.closest("[data-weekly-planner-period]");

  if (!field || !dayCard || !periodRow || !weeklyPlannerState.plannerData) return;

  const dayIndex = Number(dayCard.dataset.weeklyPlannerDay);
  const periodIndex = Number(periodRow.dataset.weeklyPlannerPeriod);
  const period = weeklyPlannerState.plannerData.days[dayIndex]?.periods[periodIndex];
  if (!period) return;

  const fieldName = field.dataset.weeklyPlannerField;
  if (fieldName === "entries") {
    period.entries = normalizeWeeklyPlannerEntries(field.value);
  } else if (fieldName === "label" || fieldName === "subject") {
    period[fieldName] = String(field.value || "");
  }
}

function handleWeeklyPlannerCardClick(event) {
  const addButton = event.target.closest("[data-weekly-planner-add-period]");
  const removeButton = event.target.closest("[data-weekly-planner-remove-period]");

  if (addButton) {
    const dayIndex = Number(addButton.dataset.weeklyPlannerAddPeriod);
    addWeeklyPlannerPeriod(dayIndex);
    return;
  }

  if (removeButton && !removeButton.disabled) {
    const [dayIndex, periodIndex] = String(removeButton.dataset.weeklyPlannerRemovePeriod || "")
      .split(":")
      .map(Number);
    removeWeeklyPlannerPeriod(dayIndex, periodIndex);
  }
}

function addWeeklyPlannerPeriod(dayIndex) {
  const day = weeklyPlannerState.plannerData?.days?.[dayIndex];
  if (!day) return;

  const periodIndex = day.periods.length;
  day.periods.push({
    id: `period-${Date.now()}-${periodIndex + 1}`,
    label: getWeeklyPlannerPeriodLabel(periodIndex),
    subject: "",
    entries: []
  });
  weeklyPlannerState.activeCardIndex = dayIndex;
  renderWeeklyPlannerCards();
}

function removeWeeklyPlannerPeriod(dayIndex, periodIndex) {
  const day = weeklyPlannerState.plannerData?.days?.[dayIndex];
  if (!day || day.periods.length <= 1) return;

  day.periods.splice(periodIndex, 1);
  weeklyPlannerState.activeCardIndex = dayIndex;
  renderWeeklyPlannerCards();
}

function scheduleWeeklyPlannerDotUpdate() {
  if (weeklyPlannerState.scrollFrame) return;

  weeklyPlannerState.scrollFrame = requestAnimationFrame(() => {
    weeklyPlannerState.scrollFrame = 0;
    updateWeeklyPlannerActiveDotFromRail();
  });
}

function updateWeeklyPlannerActiveDotFromRail() {
  const rail = document.getElementById("weekly-planner-rail");
  if (!rail) return;

  const cards = Array.from(rail.querySelectorAll(".weekly-planner-day-card"));
  if (!cards.length) return;

  const railCenter = rail.scrollLeft + rail.clientWidth / 2;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card, index) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const distance = Math.abs(cardCenter - railCenter);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  setWeeklyPlannerActiveDot(nearestIndex);
}

function setWeeklyPlannerActiveDot(index) {
  weeklyPlannerState.activeCardIndex = Math.max(0, Math.min(3, Number(index) || 0));
  document.querySelectorAll("[data-weekly-planner-dot]").forEach((dot, dotIndex) => {
    const active = dotIndex === weeklyPlannerState.activeCardIndex;
    dot.classList.toggle("is-active", active);
    dot.setAttribute("aria-current", active ? "true" : "false");
  });
}

function scrollWeeklyPlannerToCard(index, smooth = true) {
  const rail = document.getElementById("weekly-planner-rail");
  const cards = rail ? rail.querySelectorAll(".weekly-planner-day-card") : [];
  const safeIndex = Math.max(0, Math.min(cards.length - 1, Number(index) || 0));
  const card = cards[safeIndex];
  if (!rail || !card) return;

  const targetLeft = card.offsetLeft - Math.max(0, (rail.clientWidth - card.offsetWidth) / 2);
  rail.scrollTo({
    left: targetLeft,
    behavior: smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "smooth"
      : "auto"
  });
  setWeeklyPlannerActiveDot(safeIndex);
}

async function saveWeeklyPlannerAndPreview(button) {
  const teacher = getSelectedWeeklyPlannerTeacher();
  const weekInput = document.getElementById("weekly-planner-week");
  const groupInput = document.getElementById("weekly-planner-group");
  const feedbackInput = document.getElementById("weekly-planner-feedback");

  if (!teacher || !weeklyPlannerState.plannerData) {
    setWeeklyPlannerMessage("The planner has not finished loading.", "error");
    return;
  }

  const week = getWeeklyPlannerWeekMeta(weekInput ? weekInput.value : "");
  const originalText = button ? button.textContent : "";

  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }

  setWeeklyPlannerMessage("Saving the planner...", "");

  try {
    const result = await apiPost("/api/admin/weekly-planner/save", {
      teacherId: teacher.teacherId,
      weekStart: week.weekStart,
      groupNo: String(groupInput?.value || "").trim(),
      status: "READY",
      plannerData: weeklyPlannerState.plannerData,
      feedback: String(feedbackInput?.value || "").trim(),
      expectedUpdatedDate: weeklyPlannerState.expectedUpdatedDate
    }, state.token);

    if (!result.success) {
      throw new Error(result.error || result.detail || "Unable to save the planner.");
    }

    weeklyPlannerState.teacher = result.teacher || teacher;
    weeklyPlannerState.week = result.week || week;
    weeklyPlannerState.planner = result.planner;
    weeklyPlannerState.expectedUpdatedDate = String(result.planner?.updatedDate || "");

    if (feedbackInput) feedbackInput.value = String(result.planner?.feedback || "");
    const feedbackBy = document.getElementById("weekly-planner-feedback-by");
    if (feedbackBy && result.planner?.feedbackBy) {
      feedbackBy.textContent = `Last feedback by ${result.planner.feedbackBy}`;
    }

    setWeeklyPlannerMessage("Planner saved.", "success");
    try {
      await generateWeeklyPlannerPreview();
      showScreen("weekly-planner-preview-screen");
    } catch (previewError) {
      setWeeklyPlannerMessage(
        `Planner saved, but the image preview could not be created: ${previewError.message || "unknown error"}`,
        "error"
      );
    }
  } catch (error) {
    setWeeklyPlannerMessage(error.message || "Unable to save the planner.", "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText || "Save and Preview";
    }
  }
}

function returnToWeeklyPlanner() {
  showScreen("weekly-planner-screen");
}

async function generateWeeklyPlannerPreview() {
  const previewImage = document.getElementById("weekly-planner-preview-image");
  const previewMessage = document.getElementById("weekly-planner-preview-message");
  if (previewMessage) previewMessage.textContent = "Creating image preview...";

  const result = await renderWeeklyPlannerImage({
    teacher: weeklyPlannerState.teacher,
    week: weeklyPlannerState.week,
    plannerData: weeklyPlannerState.plannerData,
    groupNo: weeklyPlannerState.planner?.groupNo || document.getElementById("weekly-planner-group")?.value || "",
    feedback: weeklyPlannerState.planner?.feedback || document.getElementById("weekly-planner-feedback")?.value || "",
    feedbackBy: weeklyPlannerState.planner?.feedbackBy || ""
  });

  weeklyPlannerState.previewDataUrl = result.dataUrl;
  weeklyPlannerState.previewBlob = result.blob;

  if (previewImage) previewImage.src = result.dataUrl;
  if (previewMessage) previewMessage.textContent = "The image is generated on this device and is not stored online.";
}

async function shareWeeklyPlannerImage(button) {
  const previewMessage = document.getElementById("weekly-planner-preview-message");

  try {
    if (!weeklyPlannerState.previewBlob) {
      await generateWeeklyPlannerPreview();
    }

    if (typeof File !== "function") {
      downloadWeeklyPlannerImage();
      if (previewMessage) previewMessage.textContent = "The PNG was downloaded and is ready to share.";
      return;
    }

    const fileName = getWeeklyPlannerImageFileName();
    const file = new File([weeklyPlannerState.previewBlob], fileName, { type: "image/png" });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({
        files: [file],
        title: "Weekly Planner",
        text: `${weeklyPlannerState.teacher?.teacherName || "Teacher"} · ${weeklyPlannerState.week?.weekStart || ""}`
      });
      if (previewMessage) previewMessage.textContent = "Planner image shared.";
      return;
    }

    downloadWeeklyPlannerImage();
    if (previewMessage) previewMessage.textContent = "Sharing is unavailable here, so the PNG was downloaded instead.";
  } catch (error) {
    if (error && error.name === "AbortError") return;
    if (previewMessage) previewMessage.textContent = error.message || "Unable to share the image.";
  } finally {
    if (button) button.blur();
  }
}

function downloadWeeklyPlannerImage() {
  if (!weeklyPlannerState.previewDataUrl) return;

  const anchor = document.createElement("a");
  anchor.href = weeklyPlannerState.previewDataUrl;
  anchor.download = getWeeklyPlannerImageFileName();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function getWeeklyPlannerImageFileName() {
  const teacherName = String(weeklyPlannerState.teacher?.teacherName || "teacher")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "teacher";
  return `weekly-planner-${teacherName}-${weeklyPlannerState.week?.weekStart || "week"}.png`;
}

async function renderWeeklyPlannerImage(model) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 2000;
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Image preview is not supported by this browser.");

  const colors = {
    page: "#efd7dc",
    paper: "#fffefb",
    cream: "#eadfbd",
    ink: "#bd35ef",
    text: "#111111",
    muted: "#4f534d",
    line: "#737772"
  };

  context.fillStyle = colors.page;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = colors.paper;
  context.fillRect(26, 22, canvas.width - 52, canvas.height - 44);
  context.fillStyle = colors.page;
  context.fillRect(26, 22, canvas.width - 52, 270);

  let logo = null;
  try {
    logo = await loadWeeklyPlannerImage("/academy.png");
  } catch (error) {
    console.warn("Weekly Planner logo could not be loaded:", error);
  }

  if (logo) {
    context.save();
    weeklyPlannerRoundRectPath(context, 52, 50, 190, 190, 95);
    context.clip();
    context.drawImage(logo, 52, 50, 190, 190);
    context.restore();
  }

  context.fillStyle = colors.text;
  context.font = "900 70px Arial, sans-serif";
  context.fillText("UMM ABBAD ACADEMY", 270, 102);
  context.font = "italic 800 32px Arial, sans-serif";
  context.fillText("REBOOT YOUR MAKTAB WEEKLY PLANNER", 274, 150);

  context.font = "900 28px Arial, sans-serif";
  context.fillText("NAME OF MUALLIMA:", 274, 205);
  context.fillText("MONTH:", 274, 252);
  context.fillText("WEEK:", 725, 252);
  context.fillText("GROUP:", 1080, 252);

  context.fillStyle = colors.ink;
  context.font = "700 30px 'Chalkboard SE', 'Comic Sans MS', cursive";
  weeklyPlannerDrawTextBox(context, model.teacher?.teacherName || "", 610, 174, 710, 42, {
    color: colors.ink,
    fontFamily: "'Chalkboard SE', 'Comic Sans MS', cursive",
    fontWeight: "700",
    fontSize: 30,
    minFontSize: 22,
    lineHeight: 1.1
  });
  context.fillText(model.week?.month || "", 395, 252);
  context.fillText(formatWeeklyPlannerRange(model.week), 845, 252);
  context.fillText(String(model.groupNo || ""), 1215, 252);

  const dayPanelWidth = 637;
  const dayPanelHeight = 650;
  const panelGap = 36;
  const panelX = [45, 45 + dayPanelWidth + panelGap];
  const panelY = [320, 1000];

  WEEKLY_PLANNER_DAYS.forEach((dayConfig, index) => {
    const day = model.plannerData?.days?.[index] || {
      label: dayConfig.label,
      date: addWeeklyPlannerDays(model.week?.weekStart, index),
      periods: []
    };
    drawWeeklyPlannerDayPanel(
      context,
      day,
      panelX[index % 2],
      panelY[Math.floor(index / 2)],
      dayPanelWidth,
      dayPanelHeight,
      colors
    );
  });

  drawWeeklyPlannerFeedbackPanel(context, model, 45, 1680, 1310, 260, colors);

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(value => {
      if (value) resolve(value);
      else reject(new Error("Could not create the planner PNG."));
    }, "image/png");
  });

  return { dataUrl, blob };
}

function drawWeeklyPlannerDayPanel(context, day, x, y, width, height, colors) {
  const headingHeight = 72;
  const periods = Array.isArray(day.periods) && day.periods.length
    ? day.periods
    : [{ label: "Period One", subject: "", entries: [] }];
  const bodyHeight = height - headingHeight;
  const rowHeight = bodyHeight / periods.length;
  const periodColumnWidth = 150;

  context.fillStyle = colors.paper;
  context.fillRect(x, y, width, height);
  context.fillStyle = colors.cream;
  context.fillRect(x, y, width, headingHeight);
  context.strokeStyle = colors.line;
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
  context.beginPath();
  context.moveTo(x, y + headingHeight);
  context.lineTo(x + width, y + headingHeight);
  context.stroke();

  context.fillStyle = colors.text;
  context.font = "500 34px Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(String(day.label || "").toUpperCase(), x + width / 2, y + 48);
  context.textAlign = "left";

  periods.forEach((period, index) => {
    const rowY = y + headingHeight + index * rowHeight;

    if (index > 0) {
      context.beginPath();
      context.moveTo(x, rowY);
      context.lineTo(x + width, rowY);
      context.stroke();
    }

    context.beginPath();
    context.moveTo(x + periodColumnWidth, rowY);
    context.lineTo(x + periodColumnWidth, rowY + rowHeight);
    context.stroke();

    weeklyPlannerDrawTextBox(context, String(period.label || "").toUpperCase(), x + 8, rowY + 12, periodColumnWidth - 16, rowHeight - 24, {
      color: colors.text,
      fontFamily: "Arial, sans-serif",
      fontWeight: "900",
      fontSize: 25,
      minFontSize: 18,
      lineHeight: 1.02,
      verticalAlign: "center"
    });

    const contentX = x + periodColumnWidth + 18;
    const contentWidth = width - periodColumnWidth - 36;
    weeklyPlannerDrawTextBox(context, period.subject || "", contentX, rowY + 12, contentWidth, Math.min(34, rowHeight * 0.25), {
      color: colors.muted,
      fontFamily: "Arial, sans-serif",
      fontWeight: "800",
      fontSize: 23,
      minFontSize: 17,
      lineHeight: 1.05
    });
    weeklyPlannerDrawTextBox(context, normalizeWeeklyPlannerEntries(period.entries).join("\n"), contentX, rowY + 47, contentWidth, Math.max(32, rowHeight - 58), {
      color: colors.ink,
      fontFamily: "'Chalkboard SE', 'Comic Sans MS', cursive",
      fontWeight: "700",
      fontSize: 26,
      minFontSize: 17,
      lineHeight: 1.12,
      verticalAlign: "center"
    });
  });
}

function drawWeeklyPlannerFeedbackPanel(context, model, x, y, width, height, colors) {
  const headingHeight = 66;

  context.fillStyle = colors.paper;
  context.fillRect(x, y, width, height);
  context.fillStyle = colors.cream;
  context.fillRect(x, y, width, headingHeight);
  context.strokeStyle = colors.line;
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
  context.beginPath();
  context.moveTo(x, y + headingHeight);
  context.lineTo(x + width, y + headingHeight);
  context.stroke();

  context.fillStyle = colors.text;
  context.font = "900 34px Arial, sans-serif";
  context.fillText("WEEKLY FEEDBACK", x + 28, y + 45);

  weeklyPlannerDrawTextBox(context, model.feedback || "", x + 28, y + headingHeight + 18, width - 56, height - headingHeight - 52, {
    color: colors.ink,
    fontFamily: "'Chalkboard SE', 'Comic Sans MS', cursive",
    fontWeight: "700",
    fontSize: 28,
    minFontSize: 19,
    lineHeight: 1.16
  });

  if (model.feedbackBy) {
    context.fillStyle = colors.muted;
    context.font = "600 18px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText(`Feedback by ${model.feedbackBy}`, x + width - 24, y + height - 16);
    context.textAlign = "left";
  }
}

function weeklyPlannerDrawTextBox(context, text, x, y, width, height, options = {}) {
  const content = String(text || "").trim();
  if (!content || width <= 0 || height <= 0) return;

  const fontFamily = options.fontFamily || "Arial, sans-serif";
  const fontWeight = options.fontWeight || "400";
  const startingSize = Number(options.fontSize || 24);
  const minimumSize = Number(options.minFontSize || 14);
  const lineHeightMultiplier = Number(options.lineHeight || 1.15);
  let fontSize = startingSize;
  let lines = [];
  let lineHeight = fontSize * lineHeightMultiplier;

  while (fontSize >= minimumSize) {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    lines = weeklyPlannerWrapText(context, content, width);
    lineHeight = fontSize * lineHeightMultiplier;
    if (lines.length * lineHeight <= height) break;
    fontSize -= 1;
  }

  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = options.color || "#111111";
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  context.textAlign = options.textAlign || "left";
  context.textBaseline = "top";

  const textHeight = lines.length * lineHeight;
  const startY = options.verticalAlign === "center"
    ? y + Math.max(0, (height - textHeight) / 2)
    : y;
  const drawX = context.textAlign === "center" ? x + width / 2 : x;

  lines.forEach((line, index) => {
    context.fillText(line, drawX, startY + index * lineHeight);
  });
  context.restore();
}

function weeklyPlannerWrapText(context, text, maxWidth) {
  const lines = [];
  String(text || "").split(/\r?\n/).forEach(paragraph => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      return;
    }

    let line = words.shift();
    words.forEach(word => {
      const candidate = `${line} ${word}`;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    });
    lines.push(line);
  });
  return lines;
}

function weeklyPlannerRoundRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function loadWeeklyPlannerImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function getSelectedWeeklyPlannerTeacher() {
  const select = document.getElementById("weekly-planner-teacher");
  const teacherId = String(select?.value || state.user?.adminid || "").trim();
  return weeklyPlannerState.teachers.find(teacher => teacher.teacherId === teacherId) || null;
}

function getWeeklyPlannerWeekMeta(value) {
  const source = /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
    ? new Date(`${value}T12:00:00`)
    : new Date();
  const date = Number.isNaN(source.getTime()) ? new Date() : source;
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);

  const end = new Date(date);
  end.setDate(end.getDate() + 3);

  const weekStart = formatWeeklyPlannerInputDate(date);
  const weekEnd = formatWeeklyPlannerInputDate(end);
  const startMonth = date.toLocaleDateString(undefined, { month: "long" });
  const endMonth = end.toLocaleDateString(undefined, { month: "long" });
  const month = date.getMonth() === end.getMonth()
    ? `${startMonth} ${date.getFullYear()}`
    : `${startMonth} / ${endMonth} ${date.getFullYear()}`;

  return { weekStart, weekEnd, month };
}

function updateWeeklyPlannerSummary(week) {
  const month = document.getElementById("weekly-planner-month");
  const range = document.getElementById("weekly-planner-date-range");
  if (month) month.textContent = week.month;
  if (range) range.textContent = formatWeeklyPlannerRange(week);
}

function formatWeeklyPlannerRange(week) {
  if (!week?.weekStart || !week?.weekEnd) return "";
  const start = new Date(`${week.weekStart}T12:00:00`);
  const end = new Date(`${week.weekEnd}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const month = end.toLocaleDateString(undefined, { month: "short" });
    return `${start.getDate()}–${end.getDate()} ${month} ${end.getFullYear()}`;
  }

  const startText = start.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const endText = end.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${startText}–${endText}`;
}

function formatWeeklyPlannerDisplayDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatWeeklyPlannerInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addWeeklyPlannerDays(dateText, dayCount) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(dateText || ""))
    ? new Date(`${dateText}T12:00:00`)
    : new Date();
  date.setDate(date.getDate() + Number(dayCount || 0));
  return formatWeeklyPlannerInputDate(date);
}

function getWeeklyPlannerTimeMinutes(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 24 * 60);
  }

  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?/);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hour = Number(match[1] || 0);
  const minute = Number(match[2] || 0);
  if (match[3] === "pm" && hour < 12) hour += 12;
  if (match[3] === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function getWeeklyPlannerPeriodLabel(index) {
  const words = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
  return `Period ${words[index] || index + 1}`;
}

function setWeeklyPlannerMessage(message, type) {
  const element = document.getElementById("weekly-planner-message");
  if (!element) return;

  element.textContent = String(message || "");
  element.classList.toggle("error-message", type === "error");
  element.classList.toggle("success-message", type === "success");
}

function weeklyPlannerNormalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function weeklyPlannerEscapeHtml(value) {
  if (typeof escapeHtml === "function") return escapeHtml(value);
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function weeklyPlannerEscapeAttribute(value) {
  return weeklyPlannerEscapeHtml(value).replace(/`/g, "&#096;");
}

window.showWeeklyPlanner = showWeeklyPlanner;
window.saveWeeklyPlannerAndPreview = saveWeeklyPlannerAndPreview;
window.returnToWeeklyPlanner = returnToWeeklyPlanner;
window.shareWeeklyPlannerImage = shareWeeklyPlannerImage;
window.downloadWeeklyPlannerImage = downloadWeeklyPlannerImage;
window.M4LWeeklyPlanner = {
  show: showWeeklyPlanner,
  load: loadWeeklyPlanner,
  renderPreview: renderWeeklyPlannerImage,
  getWeekMeta: getWeeklyPlannerWeekMeta,
  buildPlannerDataFromDefaults: buildWeeklyPlannerDataFromDefaults
};
