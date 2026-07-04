/* M4L v86 - Integrated Recorder module.
   Clean app-native recorder; standalone /recorder remains untouched. */
(() => {
  "use strict";

  const MAX_RECORDING_MS = 2 * 60 * 1000;
  const CANVAS_FPS = 1;
  const OUTPUT_BASENAME = "reader-recording";
  const MANIFEST_URL = "/recorder/pages/manifest.json";
  const PAGE_ASSET_BASE = "/recorder/pages/";

  const state = {
    initialized: false,
    manifestLoaded: false,
    books: [],
    selectedBookId: "",
    pages: [],
    selectedPage: null,
    selectedImage: null,
    canvasContext: null,
    mediaRecorder: null,
    audioStream: null,
    canvasStream: null,
    combinedStream: null,
    chunks: [],
    startedAt: 0,
    timerId: 0,
    stopTimeoutId: 0,
    recordingBlob: null,
    recordingFile: null,
    recordingUrl: "",
    selectedMimeType: "",
    uploadedObjectUrls: []
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    els.root = document.querySelector("[data-m4l-recorder-root]");
    els.pageView = $("m4l-recorder-page-select");
    els.recordView = $("m4l-recorder-record-view");
    els.previewView = $("m4l-recorder-preview-view");
    els.bookSelect = $("m4l-recorder-book-select");
    els.pageUpload = $("m4l-recorder-page-upload");
    els.pageGrid = $("m4l-recorder-page-grid");
    els.status = $("m4l-recorder-status");
    els.canvas = $("m4l-recorder-canvas");
    els.recordTitle = $("m4l-recorder-record-title");
    els.previewTitle = $("m4l-recorder-preview-title");
    els.recordBtn = $("m4l-recorder-record-btn");
    els.stopBtn = $("m4l-recorder-stop-btn");
    els.countdown = $("m4l-recorder-countdown");
    els.helper = $("m4l-recorder-helper");
    els.previewVideo = $("m4l-recorder-preview-video");
    els.rerecordBtn = $("m4l-recorder-rerecord-btn");
    els.shareBtn = $("m4l-recorder-share-btn");
    els.downloadLink = $("m4l-recorder-download-link");
    els.recordingMeta = $("m4l-recorder-recording-meta");
    els.backToPages = $("m4l-recorder-back-to-pages");
    els.previewPages = $("m4l-recorder-preview-pages");
    return !!(els.root && els.bookSelect && els.pageGrid && els.canvas);
  }

  function setStatus(message, options = {}) {
    if (!els.status) return false;
    els.status.textContent = message || "";
    els.status.classList.toggle("is-error", options.kind === "error");
    return true;
  }

  function showView(viewName) {
    const views = {
      pages: els.pageView,
      record: els.recordView,
      preview: els.previewView
    };

    Object.values(views).forEach(view => {
      if (view) view.classList.toggle("active", view === views[viewName]);
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function isAbsoluteUrl(value) {
    return /^(https?:|blob:|data:|\/)/i.test(String(value || ""));
  }

  function normalizeBookId(book, index) {
    const imageBasePath = String(book.imageBasePath || "").trim().replace(/\\/g, "/").replace(/\/$/, "");
    const explicit = String(book.id || book.bookId || "").trim();
    const folder = String(book.folder || "").trim().replace(/\\/g, "/").replace(/\/$/, "");
    const title = String(book.bookTitle || book.title || book.name || `Image Set ${index + 1}`).trim();
    return explicit || imageBasePath || folder || title || `book-${index + 1}`;
  }

  function resolvePageImagePath(rawImagePath) {
    const cleanPath = String(rawImagePath || "").trim().replace(/\\/g, "/");
    if (!cleanPath) return "";
    if (isAbsoluteUrl(cleanPath)) return cleanPath;
    return `${PAGE_ASSET_BASE}${cleanPath.replace(/^\/+/, "")}`;
  }

  function normalizePage(rawPage, index, book) {
    const pageNo = rawPage.pageNo || rawPage.page || index + 1;
    const lessonNo = rawPage.lesson || rawPage.lessonNo || null;
    const rawImagePath = rawPage.src || rawPage.imageUrl || rawPage.image || rawPage.file || rawPage.filename || "";
    const title = rawPage.title
      || (lessonNo ? `Lesson ${lessonNo}` : "")
      || (rawPage.type === "cover" ? "Cover" : "")
      || `Page ${pageNo}`;
    const src = resolvePageImagePath(rawImagePath);

    if (!src) return null;

    return {
      id: String(rawPage.id || rawPage.pageId || `${book.id}-${pageNo || index + 1}`),
      title: String(title),
      pageNo: Number(pageNo) || index + 1,
      lesson: lessonNo === null ? null : Number(lessonNo),
      type: String(rawPage.type || (lessonNo ? "lesson" : "page")),
      src,
      source: "manifest",
      bookTitle: book.bookTitle
    };
  }

  function normalizeBook(rawBook, index) {
    const bookTitle = String(rawBook.bookTitle || rawBook.title || rawBook.name || `Image Set ${index + 1}`).trim();
    const id = normalizeBookId(rawBook, index);
    const book = {
      ...rawBook,
      id,
      bookTitle,
      pages: []
    };

    const rawPages = Array.isArray(rawBook.pages) ? rawBook.pages : [];
    book.pages = rawPages
      .map((page, pageIndex) => normalizePage(page || {}, pageIndex, book))
      .filter(Boolean);

    return book.pages.length ? book : null;
  }

  function normalizeManifest(manifest) {
    if (manifest && Array.isArray(manifest.books)) {
      return manifest.books
        .map((book, index) => normalizeBook(book || {}, index))
        .filter(Boolean);
    }

    if (manifest && Array.isArray(manifest.pages)) {
      const single = normalizeBook({
        ...manifest,
        id: manifest.id || "default-book",
        bookTitle: manifest.bookTitle || manifest.title || "Reader Pages"
      }, 0);
      return single ? [single] : [];
    }

    return [];
  }

  function getDefaultBookId(manifest, books) {
    const wanted = String(manifest && manifest.defaultBook || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/\/$/, "");
    if (!wanted) return books[0] ? books[0].id : "";

    const match = books.find(book => {
      const candidates = [
        book.id,
        book.bookTitle,
        book.folder,
        book.imageBasePath
      ].map(value => String(value || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/\/$/, ""));

      return candidates.includes(wanted);
    });

    return match ? match.id : (books[0] ? books[0].id : "");
  }

  function renderBookSelector() {
    if (!els.bookSelect) return false;

    els.bookSelect.innerHTML = "";

    if (!state.books.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No image sets found";
      els.bookSelect.appendChild(option);
    } else {
      state.books.forEach(book => {
        const option = document.createElement("option");
        option.value = book.id;
        option.textContent = book.bookTitle;
        els.bookSelect.appendChild(option);
      });
    }

    const uploadOption = document.createElement("option");
    uploadOption.value = "__upload";
    uploadOption.textContent = "Select your own image";
    els.bookSelect.appendChild(uploadOption);

    els.bookSelect.value = state.selectedBookId || (state.books[0] ? state.books[0].id : "");
    return true;
  }

  function getSelectedBook() {
    return state.books.find(book => book.id === state.selectedBookId) || null;
  }

  function cleanupUploadedObjectUrls() {
    state.uploadedObjectUrls.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (error) { console.warn("Could not revoke upload URL", error); }
    });
    state.uploadedObjectUrls = [];
  }

  function setBook(bookId) {
    const book = state.books.find(candidate => candidate.id === bookId);
    if (!book) return false;

    cleanupUploadedObjectUrls();
    state.selectedBookId = book.id;
    state.pages = book.pages;
    state.selectedPage = null;
    state.selectedImage = null;
    renderBookSelector();
    renderPageGrid();
    setStatus(`${book.bookTitle} loaded · ${book.pages.length} pages`);
    showView("pages");
    return true;
  }

  function renderPageGrid() {
    if (!els.pageGrid) return false;
    els.pageGrid.innerHTML = "";

    if (!state.pages.length) {
      const empty = document.createElement("div");
      empty.className = "m4l-recorder-empty-card";
      empty.innerHTML = "No pages loaded yet.<br>Choose an image set, or select your own image.";
      els.pageGrid.appendChild(empty);
      return true;
    }

    state.pages.forEach((page, index) => {
      const subtitle = page.type === "cover"
        ? "Cover"
        : page.lesson
          ? `Lesson ${page.lesson}`
          : `Page ${page.pageNo || index + 1}`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "m4l-recorder-page-card";
      button.dataset.pageIndex = String(index);
      button.setAttribute("aria-label", `Select ${page.title}`);
      button.innerHTML = `
        <span class="m4l-recorder-page-thumb"><img src="${escapeAttribute(page.src)}" alt="" loading="lazy"></span>
        <span class="m4l-recorder-page-title">${escapeHtml(page.title)}</span>
        <span class="m4l-recorder-page-subtitle">${escapeHtml(subtitle)}</span>
      `;
      els.pageGrid.appendChild(button);
    });

    return true;
  }

  async function loadManifest() {
    if (state.manifestLoaded) return true;

    setStatus("Loading image sets...");

    try {
      const manifestUrl = `${MANIFEST_URL}?t=${Date.now()}`;
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Manifest request failed: ${response.status}`);
      }

      const manifest = await response.json();
      const books = normalizeManifest(manifest || {});
      state.books = books;
      state.manifestLoaded = true;

      if (!books.length) {
        state.selectedBookId = "";
        state.pages = [];
        renderBookSelector();
        renderPageGrid();
        setStatus("No books were found in /recorder/pages/manifest.json.", { kind: "error" });
        return false;
      }

      const defaultBookId = getDefaultBookId(manifest, books);
      state.selectedBookId = defaultBookId;
      renderBookSelector();
      setBook(defaultBookId);
      return true;
    } catch (error) {
      console.error("Recorder manifest could not be loaded", error);
      state.books = [];
      state.selectedBookId = "";
      state.pages = [];
      renderBookSelector();
      renderPageGrid();
      setStatus("Could not load /recorder/pages/manifest.json. Check that the file is deployed at that exact path.", { kind: "error" });
      return false;
    }
  }

  function addUploadedPages(fileList) {
    const files = Array.from(fileList || []).filter(file => file && file.type && file.type.startsWith("image/"));
    if (!files.length) {
      renderBookSelector();
      return false;
    }

    cleanupUploadedObjectUrls();
    const pages = files.map((file, index) => {
      const objectUrl = URL.createObjectURL(file);
      state.uploadedObjectUrls.push(objectUrl);
      return {
        id: `upload-${Date.now()}-${index}`,
        title: file.name.replace(/\.[^.]+$/, "") || `Image ${index + 1}`,
        pageNo: index + 1,
        lesson: null,
        type: "upload",
        src: objectUrl,
        source: "upload",
        bookTitle: "Own image"
      };
    });

    state.selectedBookId = "__upload";
    state.pages = pages;
    state.selectedPage = null;
    state.selectedImage = null;
    renderBookSelector();
    renderPageGrid();
    setStatus(`Own image loaded · ${pages.length} page${pages.length === 1 ? "" : "s"}`);
    showView("pages");
    return true;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not load selected image."));
      image.crossOrigin = "anonymous";
      image.src = src;
    });
  }

  function drawSelectedPage() {
    const image = state.selectedImage;
    if (!image || !els.canvas) return false;

    const maxWidth = 1440;
    const maxHeight = 1920;
    const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));

    els.canvas.width = width;
    els.canvas.height = height;
    state.canvasContext = els.canvas.getContext("2d", { alpha: false });
    state.canvasContext.fillStyle = "#ffffff";
    state.canvasContext.fillRect(0, 0, width, height);
    state.canvasContext.drawImage(image, 0, 0, width, height);
    return true;
  }

  async function selectPage(pageIndex) {
    const page = state.pages[pageIndex];
    if (!page) return false;

    setStatus("Loading page...");
    state.selectedPage = page;
    state.selectedImage = await loadImage(page.src);
    drawSelectedPage();
    resetTimer();

    const title = `${page.bookTitle ? `${page.bookTitle} · ` : ""}${page.title}`;
    if (els.recordTitle) els.recordTitle.textContent = title;
    if (els.previewTitle) els.previewTitle.textContent = `Preview · ${page.title}`;

    setStatus("Ready");
    showView("record");
    return true;
  }

  function formatTime(msRemaining) {
    const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function resetTimer() {
    if (els.countdown) els.countdown.textContent = formatTime(MAX_RECORDING_MS);
  }

  function clearTimers() {
    if (state.timerId) window.clearInterval(state.timerId);
    if (state.stopTimeoutId) window.clearTimeout(state.stopTimeoutId);
    state.timerId = 0;
    state.stopTimeoutId = 0;
  }

  function updateTimer() {
    if (!state.startedAt) {
      resetTimer();
      return;
    }

    const elapsed = Date.now() - state.startedAt;
    const remaining = MAX_RECORDING_MS - elapsed;
    resetTimer();
    if (els.countdown) els.countdown.textContent = formatTime(remaining);

    if (remaining <= 0) {
      stopRecording("limit");
    }
  }

  function getSupportedMimeType() {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
      return "";
    }

    const candidates = [
      "video/mp4;codecs=h264,aac",
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];

    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function getFileExtension(mimeType) {
    if (String(mimeType || "").includes("mp4")) return "mp4";
    if (String(mimeType || "").includes("webm")) return "webm";
    return "webm";
  }

  function cleanObjectUrl(url) {
    if (!url) return;
    try { URL.revokeObjectURL(url); } catch (error) { console.warn("Could not revoke object URL", error); }
  }

  function stopTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
  }

  async function startRecording() {
    if (!state.selectedImage) {
      alert("Select a page before recording.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      alert("This browser does not support video recording. Please try a newer Safari or Chrome browser.");
      return;
    }

    if (!els.canvas || !els.canvas.captureStream) {
      alert("This browser does not support recording from a page image canvas.");
      return;
    }

    try {
      cleanup({ keepPages: true, keepSelectedPage: true });
      drawSelectedPage();

      if (els.helper) els.helper.textContent = "Allow microphone access if prompted.";

      state.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      state.canvasStream = els.canvas.captureStream(CANVAS_FPS);
      state.combinedStream = new MediaStream([
        ...state.canvasStream.getVideoTracks(),
        ...state.audioStream.getAudioTracks()
      ]);
      state.chunks = [];
      state.selectedMimeType = getSupportedMimeType();

      const recorderOptions = state.selectedMimeType ? { mimeType: state.selectedMimeType } : undefined;
      state.mediaRecorder = new MediaRecorder(state.combinedStream, recorderOptions);
      state.mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) state.chunks.push(event.data);
      };
      state.mediaRecorder.onstop = finalizeRecording;
      state.mediaRecorder.onerror = event => {
        console.error("Recorder error", event.error || event);
        stopRecording("error");
      };

      state.mediaRecorder.start(1000);
      state.startedAt = Date.now();
      els.recordBtn.classList.add("hidden");
      els.stopBtn.classList.remove("hidden");
      if (els.helper) els.helper.textContent = "";
      updateTimer();
      state.timerId = window.setInterval(updateTimer, 250);
      state.stopTimeoutId = window.setTimeout(() => stopRecording("limit"), MAX_RECORDING_MS + 250);
    } catch (error) {
      console.error(error);
      cleanup({ keepPages: true, keepSelectedPage: true });
      alert(error && error.name === "NotAllowedError"
        ? "Microphone permission was not allowed. Please allow microphone access to record."
        : "Recording could not start on this device/browser.");
    }
  }

  function stopRecording(reason = "manual") {
    clearTimers();
    if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") return;

    els.stopBtn.disabled = true;
    if (els.helper) els.helper.textContent = reason === "limit" ? "Two-minute limit reached." : "Preparing preview...";

    try {
      state.mediaRecorder.stop();
    } catch (error) {
      console.error("Could not stop recorder", error);
      finalizeRecording();
    }
  }

  function finalizeRecording() {
    clearTimers();
    const durationMs = state.startedAt ? Date.now() - state.startedAt : 0;
    state.startedAt = 0;

    stopTracks(state.audioStream);
    stopTracks(state.canvasStream);
    stopTracks(state.combinedStream);
    state.audioStream = null;
    state.canvasStream = null;
    state.combinedStream = null;
    state.mediaRecorder = null;

    els.recordBtn.classList.remove("hidden");
    els.stopBtn.classList.add("hidden");
    els.stopBtn.disabled = false;
    resetTimer();

    const mimeType = state.selectedMimeType || "video/webm";
    state.recordingBlob = new Blob(state.chunks, { type: mimeType });
    const extension = getFileExtension(mimeType);
    const safeTitle = String(state.selectedPage && state.selectedPage.title || "page")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "page";
    const fileName = `${OUTPUT_BASENAME}-${safeTitle}.${extension}`;

    cleanObjectUrl(state.recordingUrl);
    state.recordingUrl = URL.createObjectURL(state.recordingBlob);
    state.recordingFile = new File([state.recordingBlob], fileName, { type: mimeType });

    els.previewVideo.src = state.recordingUrl;
    els.downloadLink.href = state.recordingUrl;
    els.downloadLink.download = fileName;
    if (els.recordingMeta) {
      els.recordingMeta.textContent = `${state.selectedPage ? state.selectedPage.title : "Selected page"} · ${Math.min(120, Math.round(durationMs / 1000))} seconds · ${extension.toUpperCase()}`;
    }

    showView("preview");
  }

  function cleanup(options = {}) {
    clearTimers();
    stopTracks(state.audioStream);
    stopTracks(state.canvasStream);
    stopTracks(state.combinedStream);
    state.audioStream = null;
    state.canvasStream = null;
    state.combinedStream = null;
    state.mediaRecorder = null;
    state.chunks = [];
    state.startedAt = 0;
    state.selectedMimeType = "";

    if (!options.keepRecordingFile) {
      cleanObjectUrl(state.recordingUrl);
      state.recordingUrl = "";
      state.recordingBlob = null;
      state.recordingFile = null;
      if (els.previewVideo) {
        els.previewVideo.removeAttribute("src");
        els.previewVideo.load();
      }
      if (els.downloadLink) {
        els.downloadLink.href = "#";
        els.downloadLink.removeAttribute("download");
      }
    }

    if (!options.keepSelectedPage) {
      state.selectedPage = null;
      state.selectedImage = null;
    }

    if (els.recordBtn) els.recordBtn.classList.remove("hidden");
    if (els.stopBtn) {
      els.stopBtn.classList.add("hidden");
      els.stopBtn.disabled = false;
    }
    if (els.helper) els.helper.textContent = "Microphone permission will be requested when you tap Record.";
    resetTimer();
  }

  async function shareRecording() {
    if (!state.recordingFile) {
      alert("No recording is ready to share.");
      return;
    }

    try {
      if (navigator.canShare && navigator.canShare({ files: [state.recordingFile] }) && navigator.share) {
        await navigator.share({
          title: "Reader recording",
          text: "Reader recording",
          files: [state.recordingFile]
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({ title: "Reader recording", text: "Download the recording from this page." });
        return;
      }

      alert("Sharing files is not supported in this browser. Use the Download button, then share the file from your device.");
    } catch (error) {
      if (error && error.name === "AbortError") return;
      console.error(error);
      alert("The recording could not be shared. Use Download as a fallback.");
    }
  }

  function goToPages() {
    if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
      alert("Stop the recording before changing page.");
      return;
    }
    cleanup({ keepPages: true });
    showView("pages");
  }

  function bindEvents() {
    if (els.bookSelect) {
      els.bookSelect.addEventListener("change", event => {
        const value = String(event.target.value || "");
        if (value === "__upload") {
          if (els.pageUpload) els.pageUpload.click();
          return;
        }
        setBook(value);
      });
    }

    if (els.pageUpload) {
      els.pageUpload.addEventListener("change", event => addUploadedPages(event.target.files));
    }

    if (els.pageGrid) {
      els.pageGrid.addEventListener("click", event => {
        const card = event.target.closest(".m4l-recorder-page-card");
        if (!card) return;
        selectPage(Number(card.dataset.pageIndex || 0)).catch(error => {
          console.error(error);
          setStatus("Could not open this page image.", { kind: "error" });
          alert("Could not open this page image.");
        });
      });
    }

    if (els.backToPages) els.backToPages.addEventListener("click", goToPages);
    if (els.previewPages) els.previewPages.addEventListener("click", goToPages);
    if (els.recordBtn) els.recordBtn.addEventListener("click", startRecording);
    if (els.stopBtn) els.stopBtn.addEventListener("click", () => stopRecording("manual"));
    if (els.rerecordBtn) {
      els.rerecordBtn.addEventListener("click", () => {
        cleanup({ keepPages: true, keepSelectedPage: true });
        drawSelectedPage();
        showView("record");
      });
    }
    if (els.shareBtn) els.shareBtn.addEventListener("click", shareRecording);

    window.addEventListener("pagehide", () => cleanup({ keepPages: true, keepSelectedPage: true }));
    window.addEventListener("resize", () => {
      if (state.selectedImage && els.recordView && els.recordView.classList.contains("active")) {
        drawSelectedPage();
      }
    }, { passive: true });
  }

  function init() {
    if (state.initialized) return true;
    if (!cacheElements()) return false;

    state.initialized = true;
    state.canvasContext = els.canvas.getContext("2d", { alpha: false });
    resetTimer();
    bindEvents();

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      if (els.helper) els.helper.textContent = "This browser cannot access the microphone for recording.";
    }

    loadManifest();
    return true;
  }

  function open() {
    init();
    if (!state.manifestLoaded && !state.books.length) {
      loadManifest();
    }
    showView(state.selectedImage ? "record" : "pages");
    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.M4LRecorder = {
    init,
    open,
    cleanup,
    loadManifest
  };
})();
