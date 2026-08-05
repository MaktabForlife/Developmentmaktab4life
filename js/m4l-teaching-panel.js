/* M4L v99.1 Teaching Panel / PDF Split coordination
   Opening the Teaching Panel suspends the second PDF pane without unloading it.

   M4L v98.0 Teaching Panel
   Frontend-only companion panel for the in-app PDF viewer.
   Features: slide-out/resizable panel, freehand drawing, eraser,
   undo/redo, clear, PNG save/share, and typed notes.
   No backend persistence in V98.0.
*/
(function () {
  "use strict";

  const state = {
    open: false,
    activeTab: "drawing",
    tool: "pen",
    drawing: false,
    canvas: null,
    context: null,
    history: [],
    redo: [],
    maxHistory: 30,
    panelWidth: 420,
    currentPdfKey: "",
    resizeObserver: null
  };

  const byId = id => document.getElementById(id);
  const isCompact = () => window.matchMedia("(max-width: 767px)").matches;
  const isTablet = () => window.matchMedia("(min-width: 768px) and (max-width: 1179px)").matches;

  function init() {
    const panel = byId("m4l-teaching-panel");
    const canvas = byId("m4l-teaching-canvas");
    if (!panel || !canvas || panel.dataset.m4lTeachingReady === "true") return false;

    panel.dataset.m4lTeachingReady = "true";
    state.canvas = canvas;
    state.context = canvas.getContext("2d", { willReadFrequently: true });

    bindTabs();
    bindTools();
    bindCanvas();
    bindDivider();
    bindKeyboard();
    bindResize();
    resizeCanvas(true);
    pushHistory();
    return true;
  }

  function ensureInit() {
    return init() || !!state.canvas;
  }

  function toggle() {
    if (!ensureInit()) return false;
    return state.open ? close() : open();
  }

  function open() {
    if (!ensureInit()) return false;

    window.M4LPdfSplitView?.suspendForTeachingPanel?.();

    const panel = byId("m4l-teaching-panel");
    const divider = byId("m4l-teaching-panel-divider");
    const workspace = byId("m4l-pdf-teaching-workspace");
    const toggleButton = byId("m4l-teaching-panel-toggle");

    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    workspace?.classList.add("is-teaching-open");
    document.body.classList.add("m4l-teaching-panel-open");

    if (!isCompact()) {
      divider.hidden = false;
      applyPanelWidth(state.panelWidth);
    }

    toggleButton?.setAttribute("aria-expanded", "true");
    toggleButton?.setAttribute("aria-label", "Close teaching panel");
    state.open = true;

    requestAnimationFrame(() => {
      resizeCanvas(false);
      if (state.activeTab === "drawing") state.canvas?.focus?.();
    });
    return true;
  }

  function close(options = {}) {
    const panel = byId("m4l-teaching-panel");
    const divider = byId("m4l-teaching-panel-divider");
    const workspace = byId("m4l-pdf-teaching-workspace");
    const toggleButton = byId("m4l-teaching-panel-toggle");

    if (panel) {
      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
    }
    if (divider) divider.hidden = true;
    workspace?.classList.remove("is-teaching-open");
    document.body.classList.remove("m4l-teaching-panel-open");
    toggleButton?.setAttribute("aria-expanded", "false");
    toggleButton?.setAttribute("aria-label", "Open teaching panel");
    state.open = false;

    if (options.reset === true) {
      clearDrawing(false);
      const notes = byId("m4l-teaching-notes");
      if (notes) notes.value = "";
      state.currentPdfKey = "";
    }
    return true;
  }

  function prepareForPdf(info = {}) {
    if (!ensureInit()) return;
    const nextKey = String(info.resourceId || info.title || "").trim();
    if (state.currentPdfKey && nextKey && nextKey !== state.currentPdfKey) {
      clearDrawing(false);
      const notes = byId("m4l-teaching-notes");
      if (notes) notes.value = "";
    }
    state.currentPdfKey = nextKey;
  }

  function bindTabs() {
    document.querySelectorAll("[data-m4l-teaching-tab]").forEach(button => {
      button.addEventListener("click", () => setTab(button.dataset.m4lTeachingTab));
    });
  }

  function setTab(tab) {
    const next = tab === "notes" ? "notes" : "drawing";
    state.activeTab = next;

    document.querySelectorAll("[data-m4l-teaching-tab]").forEach(button => {
      const active = button.dataset.m4lTeachingTab === next;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    const drawing = byId("m4l-teaching-drawing-view");
    const notes = byId("m4l-teaching-notes-view");
    if (drawing) {
      drawing.hidden = next !== "drawing";
      drawing.classList.toggle("is-active", next === "drawing");
    }
    if (notes) {
      notes.hidden = next !== "notes";
      notes.classList.toggle("is-active", next === "notes");
    }
    if (next === "drawing") requestAnimationFrame(() => resizeCanvas(false));
    else byId("m4l-teaching-notes")?.focus();
  }

  function bindTools() {
    document.querySelectorAll("[data-m4l-draw-tool]").forEach(button => {
      button.addEventListener("click", () => {
        state.tool = button.dataset.m4lDrawTool === "eraser" ? "eraser" : "pen";
        document.querySelectorAll("[data-m4l-draw-tool]").forEach(item => {
          item.classList.toggle("is-active", item === button);
        });
      });
    });
  }

  function bindCanvas() {
    const canvas = state.canvas;
    canvas.tabIndex = 0;
    canvas.addEventListener("pointerdown", startStroke);
    canvas.addEventListener("pointermove", moveStroke);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointerleave", event => {
      if (state.drawing && event.buttons === 0) endStroke(event);
    });
  }

  function canvasPoint(event) {
    const rect = state.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function configureStroke() {
    const colour = byId("m4l-teaching-colour")?.value || "#234569";
    const width = Number(byId("m4l-teaching-width")?.value || 4);
    const ctx = state.context;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    ctx.globalCompositeOperation = state.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = colour;
  }

  function startStroke(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    state.canvas.setPointerCapture?.(event.pointerId);
    state.drawing = true;
    configureStroke();
    const point = canvasPoint(event);
    state.context.beginPath();
    state.context.moveTo(point.x, point.y);
  }

  function moveStroke(event) {
    if (!state.drawing) return;
    event.preventDefault();
    const point = canvasPoint(event);
    state.context.lineTo(point.x, point.y);
    state.context.stroke();
  }

  function endStroke(event) {
    if (!state.drawing) return;
    event?.preventDefault?.();
    state.drawing = false;
    state.context.closePath();
    state.context.globalCompositeOperation = "source-over";
    pushHistory();
  }

  function resizeCanvas(initial) {
    if (!state.canvas || !state.context) return;
    const wrap = state.canvas.parentElement;
    if (!wrap) return;

    const oldImage = state.canvas.width && state.canvas.height
      ? state.canvas.toDataURL("image/png")
      : "";

    const rect = wrap.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(260, Math.floor(rect.width));
    const height = Math.max(260, Math.floor(rect.height));

    if (state.canvas.width === Math.floor(width * dpr) &&
        state.canvas.height === Math.floor(height * dpr)) return;

    state.canvas.width = Math.floor(width * dpr);
    state.canvas.height = Math.floor(height * dpr);
    state.canvas.style.width = `${width}px`;
    state.canvas.style.height = `${height}px`;
    state.context.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (oldImage && !initial) {
      const image = new Image();
      image.onload = () => {
        state.context.save();
        state.context.setTransform(dpr, 0, 0, dpr, 0, 0);
        state.context.drawImage(image, 0, 0, width, height);
        state.context.restore();
      };
      image.src = oldImage;
    }
  }

  function snapshot() {
    return state.canvas?.toDataURL("image/png") || "";
  }

  function pushHistory() {
    const image = snapshot();
    if (!image) return;
    if (state.history[state.history.length - 1] === image) return;
    state.history.push(image);
    if (state.history.length > state.maxHistory) state.history.shift();
    state.redo.length = 0;
  }

  function restoreImage(dataUrl) {
    if (!state.context || !state.canvas) return;
    const rect = state.canvas.getBoundingClientRect();
    state.context.clearRect(0, 0, rect.width, rect.height);
    if (!dataUrl) return;
    const image = new Image();
    image.onload = () => {
      state.context.clearRect(0, 0, rect.width, rect.height);
      state.context.drawImage(image, 0, 0, rect.width, rect.height);
    };
    image.src = dataUrl;
  }

  function undo() {
    if (state.history.length <= 1) return false;
    state.redo.push(state.history.pop());
    restoreImage(state.history[state.history.length - 1]);
    return true;
  }

  function redo() {
    if (!state.redo.length) return false;
    const next = state.redo.pop();
    state.history.push(next);
    restoreImage(next);
    return true;
  }

  function clearDrawing(record = true) {
    if (!state.context || !state.canvas) return;
    const rect = state.canvas.getBoundingClientRect();
    state.context.clearRect(0, 0, rect.width, rect.height);
    if (record) pushHistory();
    else {
      state.history.length = 0;
      state.redo.length = 0;
      pushHistory();
    }
  }

  function clearActive() {
    if (state.activeTab === "notes") {
      const notes = byId("m4l-teaching-notes");
      if (notes && (notes.value === "" || window.confirm("Clear all teaching notes?"))) notes.value = "";
      return;
    }
    if (window.confirm("Clear the whiteboard?")) clearDrawing(true);
  }

  function exportCanvasWithBackground() {
    const canvas = document.createElement("canvas");
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.canvas, 0, 0);
    return canvas;
  }

  function saveDrawing() {
    if (!ensureInit()) return;
    const canvas = exportCanvasWithBackground();
    const link = document.createElement("a");
    link.download = `m4l-teaching-panel-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function shareDrawing() {
    if (!ensureInit()) return;
    const canvas = exportCanvasWithBackground();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;

    const file = new File([blob], `m4l-teaching-panel-${Date.now()}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "M4L Teaching Panel" });
      return;
    }
    saveDrawing();
  }

  function bindDivider() {
    const divider = byId("m4l-teaching-panel-divider");
    if (!divider) return;

    const startResize = event => {
      if (isCompact()) return;
      event.preventDefault();
      divider.setPointerCapture?.(event.pointerId);

      const move = moveEvent => {
        const viewport = window.innerWidth;
        const minWidth = isTablet() ? 300 : 340;
        const maxWidth = Math.min(720, Math.floor(viewport * 0.58));
        const width = Math.max(minWidth, Math.min(maxWidth, viewport - moveEvent.clientX));
        state.panelWidth = width;
        applyPanelWidth(width);
        resizeCanvas(false);
      };

      const stop = stopEvent => {
        divider.releasePointerCapture?.(stopEvent.pointerId);
        divider.removeEventListener("pointermove", move);
        divider.removeEventListener("pointerup", stop);
        divider.removeEventListener("pointercancel", stop);
      };

      divider.addEventListener("pointermove", move);
      divider.addEventListener("pointerup", stop);
      divider.addEventListener("pointercancel", stop);
    };

    divider.addEventListener("pointerdown", startResize);
    divider.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const change = event.key === "ArrowLeft" ? 20 : -20;
      state.panelWidth = Math.max(300, Math.min(720, state.panelWidth + change));
      applyPanelWidth(state.panelWidth);
      resizeCanvas(false);
    });
  }

  function applyPanelWidth(width) {
    const workspace = byId("m4l-pdf-teaching-workspace");
    workspace?.style.setProperty("--m4l-teaching-panel-width", `${Math.round(width)}px`);
  }

  function bindKeyboard() {
    document.addEventListener("keydown", event => {
      if (!state.open) return;
      if (event.key === "Escape") {
        close();
        return;
      }
      const meta = event.ctrlKey || event.metaKey;
      if (!meta || state.activeTab !== "drawing") return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.key.toLowerCase() === "z" && event.shiftKey) || event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    });
  }

  function bindResize() {
    window.addEventListener("resize", () => {
      if (!state.open) return;
      if (isCompact()) {
        byId("m4l-teaching-panel-divider").hidden = true;
      } else {
        byId("m4l-teaching-panel-divider").hidden = false;
        applyPanelWidth(state.panelWidth);
      }
      requestAnimationFrame(() => resizeCanvas(false));
    });

    if ("ResizeObserver" in window) {
      state.resizeObserver = new ResizeObserver(() => {
        if (state.open && state.activeTab === "drawing") resizeCanvas(false);
      });
      const wrap = byId("m4l-teaching-canvas")?.parentElement;
      if (wrap) state.resizeObserver.observe(wrap);
    }
  }

  window.M4LTeachingPanel = {
    init,
    toggle,
    open,
    close,
    prepareForPdf,
    clearActive,
    undo,
    redo,
    saveDrawing,
    shareDrawing,
    setTab
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
