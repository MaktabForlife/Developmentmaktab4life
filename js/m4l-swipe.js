/* M4L v64.2 - Shared swipe controls
   Load after /js/m4l-shell.js and before feature modules that create/bind panels.
   This is a classic script, not type=module.

   Owns shared swipe behaviour for:
   - Student Home
   - Admin Home
   - Admin Attendance

   Feature modules still own their content and data hydration.
*/

(function () {
  "use strict";

  let homeSwipeResizeHandlerBound = false;

  function getHomeSwipeElements(screenId) {
    const screen = document.getElementById(screenId);

    if (!screen) {
      return { screen: null, track: null, dots: [] };
    }

    const track = screen.querySelector("[data-home-swipe-track]");
    const dots = Array.from(screen.querySelectorAll("[data-home-swipe-dots] [data-home-panel-index]"));

    return { screen, track, dots };
  }

  function isHomeSwipeScreen(screenId) {
    const { track, dots } = getHomeSwipeElements(screenId);
    return Boolean(track && dots.length);
  }

  function getPanelStep(track) {
    if (!track || !track.children || !track.children.length) {
      return 1;
    }

    const firstPanel = track.children[0];
    const secondPanel = track.children.length > 1 ? track.children[1] : null;

    if (firstPanel && secondPanel) {
      const firstRect = firstPanel.getBoundingClientRect();
      const secondRect = secondPanel.getBoundingClientRect();
      const measuredStep = Math.abs(secondRect.left - firstRect.left);

      if (measuredStep > 1) {
        return measuredStep;
      }
    }

    return track.clientWidth || 1;
  }

  function getHomeSwipeActiveIndex(track) {
    if (!track) return 0;

    const panelCount = track.children ? track.children.length : 0;
    if (panelCount <= 1) return 0;

    /*
      On large screens the Home panels become a grid and the dots are hidden.
      In that mode scrollLeft should stay 0; returning 0 keeps state stable.
    */
    const step = getPanelStep(track);
    const index = Math.round((track.scrollLeft || 0) / step);

    return Math.max(0, Math.min(panelCount - 1, index));
  }

  function updateHomeSwipeDots(screenId) {
    const { track, dots } = getHomeSwipeElements(screenId);

    if (!track || !dots.length) {
      return false;
    }

    const activeIndex = getHomeSwipeActiveIndex(track);

    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });

    return true;
  }

  function scrollHomeSwipeToPanel(screenId, panelIndex) {
    const { track } = getHomeSwipeElements(screenId);
    const index = Number(panelIndex || 0);

    if (!track || !track.children || !track.children[index]) {
      return false;
    }

    track.children[index].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start"
    });

    window.setTimeout(() => updateHomeSwipeDots(screenId), 0);
    return true;
  }

  function bindHomeSwipeResizeHandler() {
    if (homeSwipeResizeHandlerBound === true) return true;
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return false;

    homeSwipeResizeHandlerBound = true;

    window.addEventListener("resize", () => {
      bindHomeSwipePanels();
      document.querySelectorAll(".screen").forEach(screen => {
        if (screen && screen.id && screen.querySelector("[data-home-swipe-track]")) {
          updateHomeSwipeDots(screen.id);
        }
      });
    }, { passive: true });

    return true;
  }

  function bindHomeSwipeControls(screenId) {
    const { track, dots } = getHomeSwipeElements(screenId);

    if (!track || !dots.length) {
      return false;
    }

    bindHomeSwipeResizeHandler();

    if (track.dataset.homeSwipeBound !== "true") {
      track.dataset.homeSwipeBound = "true";

      let pendingFrame = 0;

      track.addEventListener("scroll", () => {
        if (pendingFrame) return;

        pendingFrame = window.requestAnimationFrame(() => {
          pendingFrame = 0;
          updateHomeSwipeDots(screenId);
        });
      }, { passive: true });
    }

    dots.forEach(dot => {
      if (dot.dataset.homeSwipeDotBound === "true") return;

      dot.dataset.homeSwipeDotBound = "true";
      dot.addEventListener("click", event => {
        event.preventDefault();
        const index = Number(dot.dataset.homePanelIndex || 0);
        scrollHomeSwipeToPanel(screenId, index);
      });
    });

    window.setTimeout(() => updateHomeSwipeDots(screenId), 0);
    return true;
  }

  function bindHomeSwipePanels() {
    let didBind = false;

    document.querySelectorAll("[data-home-swipe]").forEach(shell => {
      const screen = shell.closest ? shell.closest(".screen") : null;
      const screenId = screen && screen.id ? screen.id : (shell.dataset.homeSwipe || "");

      if (screenId) {
        didBind = bindHomeSwipeControls(screenId) || didBind;
      }
    });

    return didBind;
  }



  /* =========================
     Attendance swipe controls
     ========================= */

  const attendancePanelSequence = [
    { key: "register", screenId: "attendance-register-screen", handlerName: "openMarkRegister" },
    { key: "records", screenId: "attendance-report-screen", handlerName: "openViewAttendance" },
    { key: "stats", screenId: "attendance-stats-screen", handlerName: "openAttendanceStats" }
  ];

  let attendanceSwipeResizeHandlerBound = false;
  let attendanceSwipeDelegatedHandlersBound = false;

  function getAttendancePanelConfig(panelKeyOrIndex) {
    if (typeof panelKeyOrIndex === "number") {
      return attendancePanelSequence[panelKeyOrIndex] || attendancePanelSequence[0];
    }

    const key = String(panelKeyOrIndex || "register");
    return attendancePanelSequence.find(panel => panel.key === key || panel.screenId === key) || attendancePanelSequence[0];
  }

  function getAttendancePanelIndex(panelKeyOrIndex) {
    const config = getAttendancePanelConfig(panelKeyOrIndex);
    const index = attendancePanelSequence.findIndex(panel => panel.key === config.key);
    return index < 0 ? 0 : index;
  }

  function getAttendanceActivePanelKey() {
    const activeScreen = document.querySelector(".screen.active");
    if (activeScreen && activeScreen.id) {
      const activePanel = attendancePanelSequence.find(panel => panel.screenId === activeScreen.id);
      if (activePanel) return activePanel.key;
    }

    return "register";
  }

  function isAttendanceSwipeScreen(screenId) {
    return attendancePanelSequence.some(panel => panel.screenId === screenId);
  }

  function getAttendanceSwipeDots() {
    return Array.from(document.querySelectorAll(
      ".attendance-panel-dots [data-attendance-panel], .attendance-panel-dots [data-attendance-panel-index], .attendance-panel-dots [data-swipe-panel-index]"
    ));
  }

  function updateAttendanceSwipeDots(activePanel) {
    const activeKey = getAttendancePanelConfig(activePanel || getAttendanceActivePanelKey()).key;
    const activeIndex = getAttendancePanelIndex(activeKey);
    const dots = getAttendanceSwipeDots();

    dots.forEach(dot => {
      const dotKey = dot.dataset.attendancePanel || "";
      const dotIndexText = dot.dataset.attendancePanelIndex || dot.dataset.swipePanelIndex || "";
      const dotIndex = dotIndexText === "" ? -1 : Number(dotIndexText);
      const isActive = dotKey ? dotKey === activeKey : dotIndex === activeIndex;

      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });

    return Boolean(dots.length);
  }

  function isVisibleFixedTopElement(element) {
    if (!element) return false;

    const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
    if (!style || style.display === "none" || style.visibility === "hidden") return false;

    const rect = element.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;

    const isFixedLike = style.position === "fixed" || style.position === "sticky";
    if (!isFixedLike) return false;

    /*
      The primary nav can be fixed at the top on desktop or at the bottom on
      mobile. Only top-positioned fixed elements contribute to the safe top
      offset for Attendance panels.
    */
    return rect.top < Math.max(160, window.innerHeight * 0.35);
  }

  function getAttendanceFixedChromeBottom(screenId) {
    let bottom = 0;

    const userBand = document.getElementById("app-user-band");
    if (isVisibleFixedTopElement(userBand)) {
      bottom = Math.max(bottom, userBand.getBoundingClientRect().bottom);
    }

    const bottomNav = document.getElementById("bottom-nav");
    if (isVisibleFixedTopElement(bottomNav)) {
      bottom = Math.max(bottom, bottomNav.getBoundingClientRect().bottom);
    }

    const screen = document.getElementById(screenId || getAttendancePanelConfig(getAttendanceActivePanelKey()).screenId);
    const dots = screen && screen.querySelector ? screen.querySelector(".attendance-panel-dots") : null;
    if (isVisibleFixedTopElement(dots)) {
      bottom = Math.max(bottom, dots.getBoundingClientRect().bottom);
    }

    return Math.ceil(bottom + 10);
  }

  function keepAttendancePanelBelowDots(screenId) {
    const screen = document.getElementById(screenId || getAttendancePanelConfig(getAttendanceActivePanelKey()).screenId);
    if (!screen || !screen.classList.contains("active")) return false;

    const target = screen.querySelector(".attendance-sticky-control-pane") || screen;
    if (!target) return false;

    const runAlignment = () => {
      const offset = getAttendanceFixedChromeBottom(screen.id);
      const rect = target.getBoundingClientRect();
      const delta = rect.top - offset;

      if (Math.abs(delta) <= 4) {
        return;
      }

      const scrollingElement = document.scrollingElement || document.documentElement || document.body;
      const currentScrollTop = scrollingElement ? scrollingElement.scrollTop : (window.pageYOffset || 0);
      const nextTop = Math.max(0, currentScrollTop + delta);

      window.scrollTo({
        top: nextTop,
        left: window.pageXOffset || 0,
        behavior: "auto"
      });
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(runAlignment);
    } else {
      window.setTimeout(runAlignment, 0);
    }

    return true;
  }

  function openAttendanceSwipePanel(panelKeyOrIndex) {
    const config = getAttendancePanelConfig(panelKeyOrIndex);
    const handler = window[config.handlerName];

    if (typeof handler !== "function") {
      console.warn("Missing attendance panel handler:", config.handlerName);
      return false;
    }

    handler();
    window.setTimeout(() => {
      updateAttendanceSwipeDots(config.key);
      keepAttendancePanelBelowDots(config.screenId);
    }, 0);
    return true;
  }

  function openAdjacentAttendancePanel(activePanel, direction) {
    const currentIndex = getAttendancePanelIndex(activePanel || getAttendanceActivePanelKey());
    const nextIndex = currentIndex + Number(direction || 0);

    if (nextIndex < 0 || nextIndex >= attendancePanelSequence.length) {
      return false;
    }

    return openAttendanceSwipePanel(nextIndex);
  }

  function shouldIgnoreAttendanceSwipeTarget(target) {
    /*
      Attendance panels contain long rows and status buttons. Allow horizontal
      swipes to begin on those rows/buttons so the screen can be changed from
      the natural scroll area. Only form fields, links, labels, editable text,
      and the global bottom nav opt out because they need direct interaction.
    */
    return Boolean(target && target.closest('a, input, select, textarea, label, [contenteditable="true"], .bottom-nav'));
  }

  function bindAttendanceSwipeElement(element, activePanel) {
    if (!element) return false;

    element.dataset.attendanceSwipePanel = getAttendancePanelConfig(activePanel || getAttendanceActivePanelKey()).key;

    if (element.dataset.m4lAttendanceSwipeBound === "true") return true;

    element.dataset.m4lAttendanceSwipeBound = "true";

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTarget = null;

    element.addEventListener("touchstart", event => {
      const touch = event.touches && event.touches[0];
      if (!touch) return;

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTarget = event.target;
    }, { passive: true });

    element.addEventListener("touchend", event => {
      if (shouldIgnoreAttendanceSwipeTarget(touchStartTarget)) {
        touchStartTarget = null;
        return;
      }

      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      touchStartTarget = null;

      if (Math.abs(deltaX) < 58 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

      const panel = element.dataset.attendanceSwipePanel || getAttendanceActivePanelKey();
      if (deltaX < 0) {
        openAdjacentAttendancePanel(panel, 1);
      } else {
        openAdjacentAttendancePanel(panel, -1);
      }
    }, { passive: true });

    return true;
  }

  function getAttendanceDotTarget(dot) {
    if (!dot) return 0;

    const key = dot.dataset.attendancePanel || "";
    if (key) return key;

    const indexText = dot.dataset.attendancePanelIndex || dot.dataset.swipePanelIndex || "0";
    return Number(indexText || 0);
  }

  function bindAttendanceSwipeDelegatedHandlers() {
    if (attendanceSwipeDelegatedHandlersBound === true) return true;
    if (!document || typeof document.addEventListener !== "function") return false;

    attendanceSwipeDelegatedHandlersBound = true;
    document.addEventListener("click", event => {
      const dot = event.target && event.target.closest
        ? event.target.closest(".attendance-panel-dots [data-attendance-panel], .attendance-panel-dots [data-attendance-panel-index], .attendance-panel-dots [data-swipe-panel-index]")
        : null;

      if (!dot) return;

      event.preventDefault();
      openAttendanceSwipePanel(getAttendanceDotTarget(dot));
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;

      const dot = event.target && event.target.closest
        ? event.target.closest(".attendance-panel-dots [data-attendance-panel], .attendance-panel-dots [data-attendance-panel-index], .attendance-panel-dots [data-swipe-panel-index]")
        : null;

      if (!dot) return;

      event.preventDefault();
      openAttendanceSwipePanel(getAttendanceDotTarget(dot));
    });

    return true;
  }

  function bindAttendanceSwipeDots() {
    const dots = getAttendanceSwipeDots();

    bindAttendanceSwipeDelegatedHandlers();
    updateAttendanceSwipeDots();
    return Boolean(dots.length);
  }

  function bindAttendanceSwipeResizeHandler() {
    if (attendanceSwipeResizeHandlerBound === true) return true;
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return false;

    attendanceSwipeResizeHandlerBound = true;
    window.addEventListener("resize", () => {
      updateAttendanceSwipeDots();
      window.setTimeout(() => keepAttendancePanelBelowDots(), 0);
    }, { passive: true });

    return true;
  }

  function bindAttendanceSwipeControls(activePanel, containerOrElement) {
    const panelKey = getAttendancePanelConfig(activePanel || getAttendanceActivePanelKey()).key;
    const container = typeof containerOrElement === "string"
      ? document.getElementById(containerOrElement)
      : containerOrElement;
    const screen = container && container.closest ? container.closest(".screen") : document.getElementById(getAttendancePanelConfig(panelKey).screenId);

    bindAttendanceSwipeResizeHandler();
    bindAttendanceSwipeDots();

    if (container) {
      bindAttendanceSwipeElement(container, panelKey);
    }

    if (screen && screen !== container) {
      bindAttendanceSwipeElement(screen, panelKey);
    }

    window.setTimeout(() => {
      updateAttendanceSwipeDots(panelKey);
      keepAttendancePanelBelowDots(getAttendancePanelConfig(panelKey).screenId);
    }, 0);
    return true;
  }

  function bindAttendanceSwipePanels() {
    let didBind = false;

    attendancePanelSequence.forEach(panel => {
      const screen = document.getElementById(panel.screenId);
      if (screen) {
        didBind = bindAttendanceSwipeControls(panel.key, screen) || didBind;
      }
    });

    return didBind;
  }

  window.M4LSwipe = {
    getHomeSwipeElements,
    isHomeSwipeScreen,
    getHomeSwipeActiveIndex,
    updateHomeSwipeDots,
    scrollHomeSwipeToPanel,
    bindHomeSwipeResizeHandler,
    bindHomeSwipeControls,
    bindHomeSwipePanels,
    getAttendancePanelConfig,
    getAttendancePanelIndex,
    getAttendanceActivePanelKey,
    isAttendanceSwipeScreen,
    updateAttendanceSwipeDots,
    openAttendanceSwipePanel,
    openAdjacentAttendancePanel,
    bindAttendanceSwipeControls,
    bindAttendanceSwipePanels,
    keepAttendancePanelBelowDots
  };

  /*
    Compatibility globals for existing classic-script calls.
    Home and Attendance helpers are exposed while feature modules are migrated gradually.
  */
  window.getHomeSwipeElements = getHomeSwipeElements;
  window.getHomeSwipeActiveIndex = getHomeSwipeActiveIndex;
  window.updateHomeSwipeDots = updateHomeSwipeDots;
  window.scrollHomeSwipeToPanel = scrollHomeSwipeToPanel;
  window.bindHomeSwipeResizeHandler = bindHomeSwipeResizeHandler;
  window.bindHomeSwipeControls = bindHomeSwipeControls;
  window.bindHomeSwipePanels = bindHomeSwipePanels;
  window.updateAttendanceSwipeDots = updateAttendanceSwipeDots;
  window.openAttendanceSwipePanel = openAttendanceSwipePanel;
  window.openAdjacentAttendancePanel = openAdjacentAttendancePanel;
  window.bindAttendanceSwipeControls = bindAttendanceSwipeControls;
  window.bindAttendanceSwipePanels = bindAttendanceSwipePanels;
  window.keepAttendancePanelBelowDots = keepAttendancePanelBelowDots;

  function bindInitialSwipePanels() {
    bindHomeSwipePanels();
    bindAttendanceSwipePanels();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindInitialSwipePanels, { once: true });
  } else {
    bindInitialSwipePanels();
  }
})();
