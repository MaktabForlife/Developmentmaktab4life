/* M4L v93.5
   Shared student/admin recorder interface with shared manifest caching.
   Apple Safari uses MP4 when viable; other browsers use audio plus JPEG.
   Non-Safari audio is shared as a generic file. WebM video is never created. */
(() => {
  "use strict";

  const MAX_RECORDING_MS = 2 * 60 * 1000;
  const CANVAS_FPS = 1;
  const OUTPUT_BASENAME = "reader-recording";
  const MANIFEST_URL = "/recorder/pages/manifest.json";
  const PAGE_ASSET_BASE = "/recorder/pages/";
  const RECORDER_MANIFEST_CACHE_KEY = "recorder:manifest:v1";
  const RECORDER_MANIFEST_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  const state = {
    initialized: false,
    manifestLoaded: false,
    books: [],
    selectedBookId: "",
    pages: [],
    sourceMode: "page",
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
    frameRefreshId: 0,
    recordingBlob: null,
    recordingFile: null,
    recordingShareFile: null,
    recordingUrl: "",
    pageImageBlob: null,
    pageImageFile: null,
    pageImageUrl: "",
    recordingMode: "",
    resultKind: "",
    forceAudioImage: false,
    selectedMimeType: "",
    actualMimeType: "",
    stopReason: "manual",
    recordingDurationMs: 0,
    shareCapabilities: null,
    uploadedObjectUrls: [],
    currentView: "pages"
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function renderRecorderInterface(root) {
    if (!root) return false;

    root.innerHTML = `
      <section id="m4l-recorder-page-select" class="m4l-recorder-view m4l-recorder-view--pages active" aria-labelledby="m4l-recorder-title">
        <h2 id="m4l-recorder-title" class="m4l-recorder-title">RECORD &amp; SHARE</h2>

        <div class="m4l-recorder-book-card">
          <label class="visually-hidden" for="m4l-recorder-book-select">Select your kitaab or recording type</label>
          <select id="m4l-recorder-book-select" class="m4l-recorder-book-select" aria-label="Select your kitaab or recording type">
            <option value="">Loading image sets...</option>
          </select>
          <p class="m4l-recorder-selector-label" aria-hidden="true">Choose recording source</p>
          <input id="m4l-recorder-page-upload" class="visually-hidden" type="file" accept="image/*" multiple />
        </div>

        <p id="m4l-recorder-status" class="m4l-recorder-status helper-text" role="status" aria-live="polite">Loading image sets...</p>
        <div id="m4l-recorder-page-grid" class="m4l-recorder-page-grid" aria-label="Available reader pages"></div>
      </section>

      <section id="m4l-recorder-record-view" class="m4l-recorder-view m4l-recorder-view--record" aria-labelledby="m4l-recorder-record-title">
        <div class="m4l-recorder-view-header m4l-recorder-view-header--clean">
          <h2 id="m4l-recorder-record-title" class="m4l-recorder-view-title">Record</h2>
          <button id="m4l-recorder-back-to-pages" class="m4l-recorder-back-icon-btn" type="button" aria-label="Return to page selector" title="Return to page selector">
            <span class="m4l-recorder-back-icon" aria-hidden="true"></span>
            <span class="m4l-recorder-back-label">Return to page selector</span>
          </button>
        </div>

        <div class="m4l-recorder-reader-frame">
          <canvas id="m4l-recorder-canvas" aria-label="Selected reader page"></canvas>
          <div id="m4l-recorder-audio-stage" class="m4l-recorder-audio-stage" hidden>
            <span class="m4l-recorder-audio-symbol" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            <span>Audio only</span>
          </div>
        </div>

        <div class="m4l-recorder-controls" aria-label="Recording controls">
          <div class="m4l-recorder-control-copy">
            <p id="m4l-recorder-helper" class="m4l-recorder-helper helper-text">Microphone permission will be requested when you tap Record.</p>
            <p id="m4l-recorder-recording-status" class="m4l-recorder-recording-status" hidden>
              Recording stops automatically in
              <output id="m4l-recorder-countdown" aria-live="polite">02:00</output>
            </p>
          </div>

          <button id="m4l-recorder-record-btn" class="m4l-recorder-record-action" type="button" aria-label="Start recording">
            <img class="m4l-recorder-native-icon" src="/icons/record.svg?v=92.4" alt="" aria-hidden="true" />
            <span class="m4l-recorder-record-label">Record</span>
          </button>

          <button id="m4l-recorder-stop-btn" class="m4l-recorder-record-action" type="button" aria-label="Stop recording" hidden>
            <img class="m4l-recorder-native-icon" src="/icons/stoprecord.svg?v=92.4" alt="" aria-hidden="true" />
            <span class="m4l-recorder-record-label">Stop</span>
          </button>
        </div>
      </section>

      <section id="m4l-recorder-preview-view" class="m4l-recorder-view m4l-recorder-view--preview" aria-labelledby="m4l-recorder-preview-title">
        <div class="m4l-recorder-view-header m4l-recorder-view-header--clean">
          <h2 id="m4l-recorder-preview-title" class="m4l-recorder-view-title">Preview</h2>
          <button id="m4l-recorder-preview-pages" class="m4l-recorder-back-icon-btn" type="button" aria-label="Return to page selector" title="Return to page selector">
            <span class="m4l-recorder-back-icon" aria-hidden="true"></span>
            <span class="m4l-recorder-back-label">Return to page selector</span>
          </button>
        </div>

        <div class="m4l-recorder-preview-media">
          <video id="m4l-recorder-preview-video" class="m4l-recorder-preview-video" controls playsinline hidden></video>
          <div id="m4l-recorder-preview-audio-panel" class="m4l-recorder-preview-audio-panel" hidden>
            <img id="m4l-recorder-preview-page-image" class="m4l-recorder-preview-page-image" alt="Selected reader page" hidden />
            <div class="m4l-recorder-audio-player-card">
              <span id="m4l-recorder-preview-audio-label" class="m4l-recorder-audio-player-label">Audio recording</span>
              <audio id="m4l-recorder-preview-audio" controls preload="metadata"></audio>
            </div>
          </div>
        </div>

        <p id="m4l-recorder-recording-meta" class="m4l-recorder-helper helper-text">Review before sharing.</p>

        <div class="m4l-recorder-preview-actions" aria-label="Recording actions">
          <button id="m4l-recorder-rerecord-btn" class="m4l-recorder-preview-action" type="button">
            <img class="m4l-recorder-preview-icon" src="/icons/cancelredo.svg?v=92.4" alt="" aria-hidden="true" />
            <span>Redo</span>
          </button>
          <button id="m4l-recorder-share-btn" class="m4l-recorder-preview-action" type="button">
            <img class="m4l-recorder-preview-icon" src="/icons/share.svg?v=92.4" alt="" aria-hidden="true" />
            <span id="m4l-recorder-share-label">Share</span>
          </button>
          <button id="m4l-recorder-download-btn" class="m4l-recorder-preview-action" type="button">
            <span class="m4l-recorder-action-glyph m4l-recorder-action-glyph--download" aria-hidden="true"></span>
            <span>Download</span>
          </button>
        </div>

        <div id="m4l-recorder-pair-actions" class="m4l-recorder-pair-actions" hidden>
          <div id="m4l-recorder-separate-share-actions" class="m4l-recorder-pair-action-group" hidden>
            <p>Share separately</p>
            <div>
              <button id="m4l-recorder-share-audio-btn" class="m4l-recorder-secondary-action" type="button">Share Audio</button>
              <button id="m4l-recorder-share-page-btn" class="m4l-recorder-secondary-action" type="button">Share Page</button>
            </div>
          </div>
          <div id="m4l-recorder-separate-download-actions" class="m4l-recorder-pair-action-group" hidden>
            <p>Download separately</p>
            <div>
              <button id="m4l-recorder-download-audio-btn" class="m4l-recorder-secondary-action" type="button">Download Audio</button>
              <button id="m4l-recorder-download-page-btn" class="m4l-recorder-secondary-action" type="button">Download Page</button>
            </div>
          </div>
        </div>
      </section>
    `;

    return true;
  }

  function cacheElements() {
    els.root = document.querySelector("[data-m4l-recorder-root]");
    if (!els.root) return false;
    renderRecorderInterface(els.root);
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
    els.recordingStatus = $("m4l-recorder-recording-status");
    els.readerFrame = els.canvas && els.canvas.closest(".m4l-recorder-reader-frame");
    els.audioStage = $("m4l-recorder-audio-stage");
    els.previewVideo = $("m4l-recorder-preview-video");
    els.previewAudioPanel = $("m4l-recorder-preview-audio-panel");
    els.previewAudio = $("m4l-recorder-preview-audio");
    els.previewAudioLabel = $("m4l-recorder-preview-audio-label");
    els.previewPageImage = $("m4l-recorder-preview-page-image");
    els.rerecordBtn = $("m4l-recorder-rerecord-btn");
    els.shareBtn = $("m4l-recorder-share-btn");
    els.shareLabel = $("m4l-recorder-share-label");
    els.downloadBtn = $("m4l-recorder-download-btn");
    els.pairActions = $("m4l-recorder-pair-actions");
    els.separateShareActions = $("m4l-recorder-separate-share-actions");
    els.separateDownloadActions = $("m4l-recorder-separate-download-actions");
    els.shareAudioBtn = $("m4l-recorder-share-audio-btn");
    els.sharePageBtn = $("m4l-recorder-share-page-btn");
    els.downloadAudioBtn = $("m4l-recorder-download-audio-btn");
    els.downloadPageBtn = $("m4l-recorder-download-page-btn");
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

  function isRecorderScreenActive() {
    const screen = document.getElementById("record-lesson-screen");
    return !!(screen && screen.classList.contains("active"));
  }

  function getRecorderHistoryApi() {
    return window.M4LAppHistory || window.M4LShell || null;
  }

  function getRecorderHistoryContext() {
    const pageIndex = state.selectedPage
      ? state.pages.findIndex(page => page && page.id === state.selectedPage.id)
      : -1;

    return {
      sourceMode: state.sourceMode,
      bookId: String(state.selectedBookId || ""),
      pageId: String(state.selectedPage && state.selectedPage.id || ""),
      pageIndex,
      pageTitle: String(state.selectedPage && state.selectedPage.title || "")
    };
  }

  function recordRecorderHistory(viewName, options = {}) {
    if (options.recordHistory === false || !isRecorderScreenActive()) {
      return false;
    }

    const historyApi = getRecorderHistoryApi();
    if (!historyApi) return false;

    if (viewName === "pages") {
      const recordHome = historyApi.recordSectionHome || historyApi.recordAppSectionHome;
      return typeof recordHome === "function"
        ? recordHome("recorder", {
            screenId: "record-lesson-screen",
            replace: options.replace !== false,
            context: {
              view: "pages",
              bookId: String(state.selectedBookId || "")
            }
          })
        : false;
    }

    const recordView = historyApi.recordSectionView || historyApi.recordAppSectionView;
    if (typeof recordView !== "function") return false;

    return recordView("recorder", viewName, {
      screenId: "record-lesson-screen",
      context: getRecorderHistoryContext(),
      nested: options.nested === true,
      replace: options.replace === true
    });
  }

  function showView(viewName, options = {}) {
    const views = {
      pages: els.pageView,
      record: els.recordView,
      preview: els.previewView
    };

    if (!views[viewName]) return false;

    Object.values(views).forEach(view => {
      if (view) view.classList.toggle("active", view === views[viewName]);
    });

    state.currentView = viewName;
    recordRecorderHistory(viewName, options);
    return true;
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

    const audioOnlyOption = document.createElement("option");
    audioOnlyOption.value = "__audio_only";
    audioOnlyOption.textContent = "Record audio only";
    els.bookSelect.appendChild(audioOnlyOption);

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
    state.sourceMode = "page";
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
     /* 
     const subtitle = page.type === "cover"
        ? "Cover"
        : page.lesson
          ? `Lesson ${page.lesson}`
          : `Page ${page.pageNo || index + 1}`;
       */
      const button = document.createElement("button");
      button.type = "button";
      button.className = "m4l-recorder-page-card";
      button.dataset.pageIndex = String(index);
      button.setAttribute("aria-label", `Select ${page.title}`);
      
      /*
      button.innerHTML = `
        <span class="m4l-recorder-page-thumb"><img src="${escapeAttribute(page.src)}" alt="" loading="lazy"></span>
        <span class="m4l-recorder-page-title">${escapeHtml(page.title)}</span>
        <span class="m4l-recorder-page-subtitle">${escapeHtml(subtitle)}</span>
      `;
      */
     button.innerHTML = `
  <span class="m4l-recorder-page-thumb">
    <img src="${escapeAttribute(page.src)}" alt="" loading="lazy">
  </span>
  <span class="m4l-recorder-page-title">${escapeHtml(page.title)}</span>
`;
      els.pageGrid.appendChild(button);
    });

    return true;
  }

  async function loadManifest(options = {}) {
    if (state.manifestLoaded && options.force !== true) return true;

    const applyManifest = manifest => {
      const books = normalizeManifest(manifest || {});
      const preserveUploadedPages = state.selectedBookId === "__upload" && state.pages.length > 0;
      const preserveActiveSession = state.currentView !== "pages" || isRecordingActive();

      state.books = books;
      state.manifestLoaded = true;

      if (!books.length) {
        if (preserveUploadedPages || preserveActiveSession) return true;

        state.selectedBookId = "";
        state.pages = [];
        renderBookSelector();
        renderPageGrid();
        setStatus("No books were found in /recorder/pages/manifest.json.", { kind: "error" });
        return false;
      }

      const currentBook = books.find(book => book.id === state.selectedBookId);
      const nextBookId = currentBook
        ? currentBook.id
        : getDefaultBookId(manifest, books);
      const nextBook = books.find(book => book.id === nextBookId) || books[0];

      if (!preserveUploadedPages && nextBook && (!preserveActiveSession || currentBook)) {
        state.selectedBookId = nextBook.id;
        state.pages = nextBook.pages;
      }

      // A shared-cache refresh must not navigate away from a recording or
      // preview, replace an uploaded image, or reveal the selected media mode.
      if (state.currentView === "pages" && !isRecordingActive()) {
        renderBookSelector();
        renderPageGrid();

        if (preserveUploadedPages) {
          setStatus(`Own image loaded · ${state.pages.length} page${state.pages.length === 1 ? "" : "s"}`);
        } else if (nextBook) {
          setStatus(`${nextBook.bookTitle} loaded · ${nextBook.pages.length} pages`);
        }
      }

      return true;
    };

    let freshFetchAttempted = false;
    const fetchFresh = async () => {
      freshFetchAttempted = true;
      const manifestUrl = `${MANIFEST_URL}?t=${Date.now()}`;
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
      return response.json();
    };

    try {
      const cached = window.M4LCache && window.M4LCache.getEntry(RECORDER_MANIFEST_CACHE_KEY, {
        scope: "shared",
        ttl: RECORDER_MANIFEST_CACHE_TTL_MS,
        allowStale: true
      });

      if (!cached || options.force === true) setStatus("Loading image sets...");

      if (!window.M4LCache) {
        return applyManifest(await fetchFresh());
      }

      const manifest = await window.M4LCache.getOrFetch(RECORDER_MANIFEST_CACHE_KEY, fetchFresh, {
        scope: "shared",
        ttl: RECORDER_MANIFEST_CACHE_TTL_MS,
        force: options.force === true,
        background: options.force !== true,
        onCached: applyManifest,
        onUpdate: fresh => applyManifest(fresh)
      });

      if (!cached || options.force === true) return applyManifest(manifest);
      return true;
    } catch (error) {
      // If the shared cache itself is unavailable, retain the recorder's
      // original direct-fetch path before showing a terminal load error.
      if (window.M4LCache && !freshFetchAttempted) {
        try {
          return applyManifest(await fetchFresh());
        } catch (fallbackError) {
          console.error("Recorder manifest cache and direct fetch both failed", error, fallbackError);
        }
      } else {
        console.error("Recorder manifest could not be loaded", error);
      }

      const hasUsableRecorderState = Boolean(
        state.books.length ||
        state.pages.length ||
        state.selectedPage ||
        state.sourceMode === "audio-only"
      );

      if (hasUsableRecorderState) {
        if (state.currentView === "pages" && !isRecordingActive()) {
          setStatus("Image sets could not be refreshed. Using the available pages.", { kind: "error" });
        }
        return false;
      }

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

    state.sourceMode = "page";
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

  function updateRecordStage() {
    const audioOnly = state.sourceMode === "audio-only";
    if (els.canvas) els.canvas.hidden = audioOnly;
    if (els.audioStage) els.audioStage.hidden = !audioOnly;
    if (els.readerFrame) {
      els.readerFrame.classList.toggle("is-audio-only", audioOnly);
    }
    return true;
  }

  function selectAudioOnly() {
    if (isRecordingActive()) {
      alert("Stop the recording before changing recording type.");
      return false;
    }

    cleanup({ keepPages: true, keepSourceMode: false });
    state.sourceMode = "audio-only";
    state.selectedPage = null;
    state.selectedImage = null;
    if (els.recordTitle) els.recordTitle.textContent = "Audio only";
    if (els.previewTitle) els.previewTitle.textContent = "Preview · Audio only";
    if (els.helper) els.helper.textContent = "Microphone permission will be requested when you tap Record.";
    updateRecordStage();
    resetTimer();
    setStatus("Ready");
    showView("record");
    return true;
  }

  async function selectPage(pageIndex) {
    const page = state.pages[pageIndex];
    if (!page) return false;

    setStatus("Loading page...");
    state.sourceMode = "page";
    state.selectedPage = page;
    state.selectedImage = await loadImage(page.src);
    drawSelectedPage();
    resetTimer();

    const title = `${page.bookTitle ? `${page.bookTitle} · ` : ""}${page.title}`;
    if (els.recordTitle) els.recordTitle.textContent = title;
    if (els.previewTitle) els.previewTitle.textContent = `Preview · ${page.title}`;

    updateRecordStage();
    setStatus("Ready");
    showView("record");
    return true;
  }

  function updateSelectedPageTitles(page) {
    if (!page) return false;

    const title = `${page.bookTitle ? `${page.bookTitle} · ` : ""}${page.title}`;
    if (els.recordTitle) els.recordTitle.textContent = title;
    if (els.previewTitle) els.previewTitle.textContent = `Preview · ${page.title}`;
    return true;
  }

  async function restoreSelectedPageFromHistory(context = {}) {
    if (String(context.sourceMode || "") === "audio-only") {
      state.sourceMode = "audio-only";
      state.selectedPage = null;
      state.selectedImage = null;
      if (els.recordTitle) els.recordTitle.textContent = "Audio only";
      if (els.previewTitle) els.previewTitle.textContent = "Preview · Audio only";
      updateRecordStage();
      resetTimer();
      setStatus("Ready");
      return true;
    }

    state.sourceMode = "page";
    const requestedBookId = String(context.bookId || "");
    const requestedPageId = String(context.pageId || "");
    const requestedPageIndex = Number(context.pageIndex);

    if (requestedBookId && requestedBookId !== state.selectedBookId) {
      const requestedBook = state.books.find(book => String(book.id || "") === requestedBookId);
      if (requestedBook) {
        state.selectedBookId = requestedBook.id;
        state.pages = requestedBook.pages;
        renderBookSelector();
        renderPageGrid();
      }
    }

    let page = requestedPageId
      ? state.pages.find(candidate => String(candidate && candidate.id || "") === requestedPageId)
      : null;

    if (!page && Number.isInteger(requestedPageIndex) && requestedPageIndex >= 0) {
      page = state.pages[requestedPageIndex] || null;
    }

    if (!page && state.selectedPage) {
      page = state.selectedPage;
    }

    if (!page) {
      return false;
    }

    state.selectedPage = page;

    if (!state.selectedImage || state.selectedImage.src !== page.src) {
      state.selectedImage = await loadImage(page.src);
    }

    drawSelectedPage();
    updateRecordStage();
    resetTimer();
    updateSelectedPageTitles(page);
    setStatus("Ready");
    return true;
  }

  function isRecordingActive() {
    return !!(
      state.mediaRecorder &&
      state.mediaRecorder.state === "recording"
    );
  }

  async function restoreHistoryState(payload = {}) {
    const viewId = String(payload.viewId || "pages");
    const context = payload.context || {};

    if (viewId !== "record" && isRecordingActive()) {
      alert("Stop the recording before leaving this page.");
      return false;
    }

    if (viewId === "pages" || viewId === "home") {
      cleanup({ keepPages: true });
      renderBookSelector();
      showView("pages", { recordHistory: false });
      return true;
    }

    if (viewId === "record") {
      const restored = await restoreSelectedPageFromHistory(context);
      if (!restored) {
        showView("pages", { recordHistory: false });
        return true;
      }

      showView("record", { recordHistory: false });
      return true;
    }

    if (viewId === "preview") {
      const restored = await restoreSelectedPageFromHistory(context);
      if (!restored || !state.recordingFile || !state.recordingUrl) {
        return false;
      }

      renderResultPreview();
      showView("preview", { recordHistory: false });
      return true;
    }

    showView("pages", { recordHistory: false });
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
    if (state.frameRefreshId) window.clearInterval(state.frameRefreshId);
    state.timerId = 0;
    state.stopTimeoutId = 0;
    state.frameRefreshId = 0;
  }

  function updateTimer() {
    if (!state.startedAt) {
      resetTimer();
      return;
    }

    const elapsed = Date.now() - state.startedAt;
    const remaining = MAX_RECORDING_MS - elapsed;
    if (els.countdown) els.countdown.textContent = formatTime(remaining);

    if (remaining <= 0) {
      stopRecording("limit");
    }
  }

  function isIOSDevice() {
    const userAgent = String(navigator.userAgent || "");
    const platform = String(navigator.platform || "");
    return /iPad|iPhone|iPod/i.test(userAgent)
      || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isAppleSafariBrowser() {
    const userAgent = String(navigator.userAgent || "");
    const vendor = String(navigator.vendor || "");
    const isAlternativeBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA/i.test(userAgent);

    if (!/AppleWebKit/i.test(userAgent) || isAlternativeBrowser) return false;
    if (isIOSDevice()) return true;
    return /Safari/i.test(userAgent) && /Apple/i.test(vendor);
  }

  function getSupportedMp4MimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    // Chromium can report MP4 recording support while producing a file that
    // WhatsApp does not accept as a playable video. Use the proven Apple
    // Safari path only; every other browser records audio plus a JPEG.
    if (!isAppleSafariBrowser()) return "";
    if (typeof MediaRecorder.isTypeSupported !== "function") {
      return isIOSDevice() ? "video/mp4" : "";
    }

    const candidates = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4;codecs=h264,aac",
      "video/mp4"
    ];

    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function shouldAttemptCombinedPairShare() {
    // Mixed image/audio shares are destination-dependent. On the non-Safari
    // fallback path, present the reliable separate actions immediately.
    return isAppleSafariBrowser();
  }

  function getSupportedAudioMimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    if (typeof MediaRecorder.isTypeSupported !== "function") {
      return isIOSDevice() ? "audio/mp4" : "";
    }

    const iosCandidates = [
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4"
    ];

    const androidAndOtherCandidates = [
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm"
    ];

    const candidates = isIOSDevice() ? iosCandidates : androidAndOtherCandidates;
    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function redrawRecordingFrame(videoTrack) {
    if (!state.selectedImage || !els.canvas || !state.canvasContext) return false;

    const width = els.canvas.width;
    const height = els.canvas.height;
    if (!width || !height) return false;

    state.canvasContext.fillStyle = "#ffffff";
    state.canvasContext.fillRect(0, 0, width, height);
    state.canvasContext.drawImage(state.selectedImage, 0, 0, width, height);

    if (videoTrack && typeof videoTrack.requestFrame === "function") {
      try {
        videoTrack.requestFrame();
      } catch (error) {
        console.warn("Could not request a canvas frame", error);
      }
    }

    return true;
  }

  function getFileExtension(mimeType, resultKind) {
    const cleanType = String(mimeType || "").toLowerCase();
    if (resultKind === "video-mp4") return "mp4";
    if (cleanType.includes("mp4")) return "m4a";
    if (cleanType.includes("ogg")) return "ogg";
    if (cleanType.includes("wav")) return "wav";
    if (cleanType.includes("mpeg")) return "mp3";
    return "webm";
  }

  function getPortableFileMimeType(mimeType, resultKind) {
    const cleanType = String(mimeType || "")
      .toLowerCase()
      .split(";", 1)[0]
      .trim();

    if (resultKind === "video-mp4") return "video/mp4";
    if (cleanType === "audio/mp4") return "audio/mp4";
    if (cleanType.startsWith("audio/")) return cleanType;
    return resultKind === "audio-only" || resultKind === "audio-image"
      ? "audio/webm"
      : cleanType || "application/octet-stream";
  }

  function createRecordingShareFile(recordingFile, resultKind) {
    if (!recordingFile) return null;
    const shareAsDocument = !isAppleSafariBrowser()
      && (resultKind === "audio-image" || resultKind === "audio-only");

    if (!shareAsDocument) return recordingFile;
    return new File([recordingFile], recordingFile.name, {
      type: "application/octet-stream",
      lastModified: recordingFile.lastModified || Date.now()
    });
  }

  function cleanObjectUrl(url) {
    if (!url) return;
    try { URL.revokeObjectURL(url); } catch (error) { console.warn("Could not revoke object URL", error); }
  }

  function stopTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
  }

  function safeFilePart(value, fallback = "recording") {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback;
  }

  function canvasToJpegBlob(canvas, quality = 0.9) {
    return new Promise((resolve, reject) => {
      if (!canvas || typeof canvas.toBlob !== "function") {
        reject(new Error("Could not create the page image."));
        return;
      }

      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not create the page image."));
        }
      }, "image/jpeg", quality);
    });
  }

  async function preparePageImageFile() {
    if (!state.selectedImage || !els.canvas) {
      throw new Error("No page is available for the image.");
    }

    drawSelectedPage();
    const imageBlob = await canvasToJpegBlob(els.canvas);
    const safeTitle = safeFilePart(state.selectedPage && state.selectedPage.title, "page");
    const fileName = `${safeTitle}.jpg`;

    cleanObjectUrl(state.pageImageUrl);
    state.pageImageBlob = imageBlob;
    state.pageImageFile = new File([imageBlob], fileName, { type: "image/jpeg" });
    state.pageImageUrl = URL.createObjectURL(imageBlob);
    return state.pageImageFile;
  }

  function buildVideoRecorder(mimeType) {
    if (!els.canvas || typeof els.canvas.captureStream !== "function") {
      throw new Error("Canvas recording is not available.");
    }

    state.canvasStream = els.canvas.captureStream(CANVAS_FPS);
    const canvasVideoTrack = state.canvasStream.getVideoTracks()[0];
    if (!canvasVideoTrack || canvasVideoTrack.readyState !== "live") {
      throw new Error("The page video track is not available.");
    }

    state.combinedStream = new MediaStream([
      canvasVideoTrack,
      ...state.audioStream.getAudioTracks()
    ]);
    state.selectedMimeType = mimeType;
    const recorder = new MediaRecorder(state.combinedStream, { mimeType });
    if (recorder.mimeType && !String(recorder.mimeType).toLowerCase().includes("mp4")) {
      throw new Error("The browser did not accept MP4 recording.");
    }
    return { recorder, canvasVideoTrack };
  }

  function buildAudioRecorder(mode) {
    state.recordingMode = mode;
    state.selectedMimeType = getSupportedAudioMimeType();

    if (state.selectedMimeType) {
      try {
        return new MediaRecorder(state.audioStream, { mimeType: state.selectedMimeType });
      } catch (error) {
        console.warn("Preferred audio format was unavailable at start; using browser default.", error);
      }
    }

    state.selectedMimeType = "";
    return new MediaRecorder(state.audioStream);
  }

  function configureRecorder(recorder) {
    state.mediaRecorder = recorder;
    state.chunks = [];
    state.actualMimeType = "";

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) {
        state.chunks.push(event.data);
        if (!state.actualMimeType && event.data.type) {
          state.actualMimeType = event.data.type;
        }
      }
    };
    recorder.onstop = finalizeRecording;
    recorder.onerror = event => {
      console.error("Recorder error", event.error || event);
      stopRecording("error");
    };
  }

  function setRecordingUi(active) {
    if (els.recordBtn) els.recordBtn.hidden = active;
    if (els.stopBtn) {
      els.stopBtn.hidden = !active;
      els.stopBtn.disabled = false;
    }
    if (els.recordingStatus) els.recordingStatus.hidden = !active;
    if (!active) resetTimer();
  }

  async function startRecording() {
    const audioOnly = state.sourceMode === "audio-only";

    if (!audioOnly && !state.selectedImage) {
      alert("Select a page before recording.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      alert("This browser does not support recording. Please try a newer Safari or Chrome browser.");
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      alert("This browser cannot access the microphone for recording.");
      return;
    }

    try {
      cleanup({
        keepPages: true,
        keepSelectedPage: !audioOnly,
        keepSourceMode: true
      });
      updateRecordStage();
      if (!audioOnly) drawSelectedPage();

      if (els.helper) els.helper.textContent = "Allow microphone access if prompted.";
      if (els.recordBtn) els.recordBtn.disabled = true;

      state.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      let recorder;
      let canvasVideoTrack = null;
      const mp4MimeType = audioOnly || state.forceAudioImage ? "" : getSupportedMp4MimeType();

      if (!audioOnly && mp4MimeType && els.canvas && typeof els.canvas.captureStream === "function") {
        try {
          state.recordingMode = "video-mp4";
          const videoSetup = buildVideoRecorder(mp4MimeType);
          recorder = videoSetup.recorder;
          canvasVideoTrack = videoSetup.canvasVideoTrack;
          configureRecorder(recorder);
          recorder.start(1000);
        } catch (error) {
          console.warn("MP4 page recording was unavailable; continuing with audio and page image.", error);
          state.forceAudioImage = true;
          if (recorder) {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            recorder.onerror = null;
          }
          stopTracks(state.canvasStream);
          state.canvasStream = null;
          state.combinedStream = null;
          state.chunks = [];
          await preparePageImageFile();
          recorder = buildAudioRecorder("audio-image");
          configureRecorder(recorder);
          recorder.start(1000);
        }
      } else {
        if (!audioOnly) await preparePageImageFile();
        recorder = buildAudioRecorder(audioOnly ? "audio-only" : "audio-image");
        configureRecorder(recorder);
        recorder.start(1000);
      }

      state.startedAt = Date.now();
      state.stopReason = "manual";

      if (state.recordingMode === "video-mp4" && canvasVideoTrack) {
        redrawRecordingFrame(canvasVideoTrack);
        state.frameRefreshId = window.setInterval(() => {
          redrawRecordingFrame(canvasVideoTrack);
        }, 1000);
      }

      if (els.helper) els.helper.textContent = "";
      if (els.recordBtn) els.recordBtn.disabled = false;
      setRecordingUi(true);
      updateTimer();
      state.timerId = window.setInterval(updateTimer, 250);
      state.stopTimeoutId = window.setTimeout(() => stopRecording("limit"), MAX_RECORDING_MS + 250);
    } catch (error) {
      console.error(error);
      cleanup({
        keepPages: true,
        keepSelectedPage: !audioOnly,
        keepSourceMode: true
      });
      if (els.recordBtn) els.recordBtn.disabled = false;
      alert(error && error.name === "NotAllowedError"
        ? "Microphone permission was not allowed. Please allow microphone access to record."
        : error && /page image/i.test(String(error.message || ""))
          ? "The selected page could not be prepared for recording."
          : "Recording could not start on this device/browser.");
    }
  }

  function stopRecording(reason = "manual") {
    clearTimers();
    if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") return;

    state.stopReason = reason;
    if (els.stopBtn) els.stopBtn.disabled = true;
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
    const recorderMimeType = state.mediaRecorder && state.mediaRecorder.mimeType;
    const durationMs = state.startedAt ? Date.now() - state.startedAt : 0;
    const resultKind = state.recordingMode;
    state.startedAt = 0;

    stopTracks(state.audioStream);
    stopTracks(state.canvasStream);
    stopTracks(state.combinedStream);
    state.audioStream = null;
    state.canvasStream = null;
    state.combinedStream = null;
    state.mediaRecorder = null;

    setRecordingUi(false);

    const fallbackMimeType = resultKind === "video-mp4"
      ? "video/mp4"
      : isIOSDevice()
        ? "audio/mp4"
        : "audio/webm";
    const mimeType = state.actualMimeType || recorderMimeType || state.selectedMimeType || fallbackMimeType;
    if (resultKind === "video-mp4" && !String(mimeType).toLowerCase().includes("mp4")) {
      state.forceAudioImage = true;
      cleanup({
        keepPages: true,
        keepSelectedPage: true,
        keepSourceMode: true
      });
      if (els.helper) els.helper.textContent = "Please record again.";
      alert("This device did not create a compatible recording. Please try again.");
      return;
    }
    state.recordingBlob = new Blob(state.chunks, { type: mimeType });
    if (!state.recordingBlob.size) {
      cleanup({
        keepPages: true,
        keepSelectedPage: state.sourceMode === "page",
        keepSourceMode: true
      });
      if (els.helper) els.helper.textContent = "No audio was captured. Please try again.";
      alert("No recording was captured. Please try again.");
      return;
    }

    const extension = getFileExtension(mimeType, resultKind);
    const safeTitle = state.sourceMode === "audio-only"
      ? "audio"
      : safeFilePart(state.selectedPage && state.selectedPage.title, "page");
    const fileName = `${OUTPUT_BASENAME}-${safeTitle}.${extension}`;
    const fileMimeType = getPortableFileMimeType(mimeType, resultKind);

    cleanObjectUrl(state.recordingUrl);
    state.recordingUrl = URL.createObjectURL(state.recordingBlob);
    state.recordingFile = new File([state.recordingBlob], fileName, { type: fileMimeType });
    state.recordingShareFile = createRecordingShareFile(state.recordingFile, resultKind);
    state.resultKind = resultKind;
    state.recordingDurationMs = durationMs;
    state.shareCapabilities = evaluateShareCapabilities();

    renderResultPreview();
    showView("preview", { nested: true });
  }

  function resetPreviewMedia() {
    if (els.previewVideo) {
      els.previewVideo.pause();
      els.previewVideo.hidden = true;
      els.previewVideo.removeAttribute("src");
      els.previewVideo.load();
    }
    if (els.previewAudio) {
      els.previewAudio.pause();
      els.previewAudio.removeAttribute("src");
      els.previewAudio.load();
    }
    if (els.previewAudioPanel) els.previewAudioPanel.hidden = true;
    if (els.previewPageImage) {
      els.previewPageImage.hidden = true;
      els.previewPageImage.removeAttribute("src");
    }
  }

  function canShareFiles(files) {
    if (!navigator.share) return false;
    if (!navigator.canShare) return null;
    try {
      return navigator.canShare({ files });
    } catch (error) {
      console.warn("Could not preflight file sharing.", error);
      return null;
    }
  }

  function evaluateShareCapabilities() {
    const recordingFile = state.recordingShareFile || state.recordingFile;
    const recording = recordingFile ? canShareFiles([recordingFile]) : false;
    const page = state.pageImageFile ? canShareFiles([state.pageImageFile]) : false;
    const together = shouldAttemptCombinedPairShare() && recordingFile && state.pageImageFile
      ? canShareFiles([state.pageImageFile, recordingFile])
      : false;
    return { recording, page, together };
  }

  function revealPairShareActions() {
    if (els.pairActions) els.pairActions.hidden = false;
    if (els.separateShareActions) els.separateShareActions.hidden = false;
    if (els.shareAudioBtn) els.shareAudioBtn.disabled = state.shareCapabilities && state.shareCapabilities.recording === false;
    if (els.sharePageBtn) els.sharePageBtn.disabled = state.shareCapabilities && state.shareCapabilities.page === false;
  }

  function revealPairDownloadActions() {
    if (els.pairActions) els.pairActions.hidden = false;
    if (els.separateDownloadActions) els.separateDownloadActions.hidden = false;
  }

  function showAudioDownloadRecovery() {
    revealPairDownloadActions();
    if (els.recordingMeta) {
      els.recordingMeta.textContent = "Direct audio sharing is unavailable. Download Audio and share it as a document.";
    }
  }

  function updateResultActions() {
    const pair = state.resultKind === "audio-image";
    const capabilities = state.shareCapabilities || evaluateShareCapabilities();
    state.shareCapabilities = capabilities;

    if (els.pairActions) els.pairActions.hidden = true;
    if (els.separateShareActions) els.separateShareActions.hidden = true;
    if (els.separateDownloadActions) els.separateDownloadActions.hidden = true;
    if (els.shareBtn) {
      els.shareBtn.hidden = false;
      els.shareBtn.disabled = false;
      els.shareBtn.removeAttribute("title");
    }
    if (els.shareLabel) els.shareLabel.textContent = "Share";
    if (els.downloadBtn) els.downloadBtn.disabled = !state.recordingFile;

    if (pair) {
      if (capabilities.together === false) {
        if (els.shareBtn) els.shareBtn.hidden = true;
        revealPairShareActions();
        if (capabilities.recording === false) showAudioDownloadRecovery();
      }
      return;
    }

    if (els.shareBtn && capabilities.recording === false) {
      els.shareBtn.disabled = true;
      els.shareBtn.title = "Native file sharing is unavailable on this device.";
    }
  }

  function renderResultPreview() {
    resetPreviewMedia();
    const seconds = Math.min(120, Math.max(0, Math.round(state.recordingDurationMs / 1000)));
    const pageTitle = state.selectedPage ? state.selectedPage.title : "Audio recording";

    if (state.resultKind === "video-mp4") {
      if (els.previewVideo) {
        els.previewVideo.src = state.recordingUrl;
        els.previewVideo.hidden = false;
      }
    } else {
      if (els.previewAudioPanel) {
        els.previewAudioPanel.hidden = false;
        els.previewAudioPanel.classList.toggle("is-audio-only", state.resultKind === "audio-only");
      }
      if (els.previewAudio) {
        els.previewAudio.src = state.recordingUrl;
        els.previewAudio.load();
      }
      if (els.previewAudioLabel) {
        els.previewAudioLabel.textContent = state.resultKind === "audio-only" ? "Audio recording" : "Page reading";
      }
      if (state.resultKind === "audio-image" && els.previewPageImage) {
        els.previewPageImage.src = state.pageImageUrl;
        els.previewPageImage.hidden = false;
      }
    }

    if (els.previewTitle) {
      els.previewTitle.textContent = state.resultKind === "audio-only"
        ? "Preview · Audio only"
        : `Preview · ${pageTitle}`;
    }
    if (els.recordingMeta) {
      els.recordingMeta.textContent = `${pageTitle} · ${seconds} seconds`;
    }
    updateResultActions();
  }

  function cleanup(options = {}) {
    clearTimers();
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.ondataavailable = null;
      state.mediaRecorder.onstop = null;
      state.mediaRecorder.onerror = null;
      try { state.mediaRecorder.stop(); } catch (error) { console.warn("Could not cancel recorder.", error); }
    }
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
    state.actualMimeType = "";
    state.recordingMode = "";
    state.stopReason = "manual";
    state.shareCapabilities = null;

    if (!options.keepRecordingFile) {
      cleanObjectUrl(state.recordingUrl);
      cleanObjectUrl(state.pageImageUrl);
      state.recordingUrl = "";
      state.recordingBlob = null;
      state.recordingFile = null;
      state.recordingShareFile = null;
      state.pageImageUrl = "";
      state.pageImageBlob = null;
      state.pageImageFile = null;
      state.resultKind = "";
      state.recordingDurationMs = 0;
      resetPreviewMedia();
    }

    if (!options.keepSelectedPage) {
      state.selectedPage = null;
      state.selectedImage = null;
      state.currentView = "pages";
    }
    if (!options.keepSourceMode) state.sourceMode = "page";

    if (els.recordBtn) els.recordBtn.disabled = false;
    setRecordingUi(false);
    updateRecordStage();
    if (els.helper) els.helper.textContent = "Microphone permission will be requested when you tap Record.";
  }

  async function shareFiles(files) {
    if (!files.length || !navigator.share) throw new Error("File sharing is unavailable.");
    const title = state.selectedPage ? state.selectedPage.title : "Audio recording";
    const text = state.selectedPage ? `${title} reading` : "Audio recording";
    await navigator.share({ title, text, files });
  }

  async function shareRecording() {
    if (!state.recordingFile) {
      alert("No recording is ready to share.");
      return;
    }

    const pair = state.resultKind === "audio-image";
    if (pair && !shouldAttemptCombinedPairShare()) {
      if (els.shareBtn) els.shareBtn.hidden = true;
      revealPairShareActions();
      if (els.recordingMeta) els.recordingMeta.textContent = "Share the audio and page separately.";
      return;
    }

    const recordingFile = state.recordingShareFile || state.recordingFile;
    const files = pair
      ? [state.pageImageFile, recordingFile].filter(Boolean)
      : [recordingFile];
    const capability = canShareFiles(files);
    if (capability === false) {
      if (pair) {
        if (els.shareBtn) els.shareBtn.hidden = true;
        revealPairShareActions();
      } else {
        updateResultActions();
        alert("This device cannot share the recording file.");
      }
      return;
    }

    try {
      await shareFiles(files);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      console.error("Recording share failed", error);
      if (pair) {
        if (els.shareBtn) els.shareBtn.hidden = true;
        revealPairShareActions();
        if (els.recordingMeta) els.recordingMeta.textContent = "Share the audio and page separately.";
      } else {
        alert("The recording could not be shared on this device.");
      }
    }
  }

  async function shareSingleFile(file, description) {
    if (!file) return alert(`${description} is not ready.`);
    const shareFile = description === "Audio"
      ? state.recordingShareFile || file
      : file;
    if (canShareFiles([shareFile]) === false) {
      if (description === "Audio") {
        showAudioDownloadRecovery();
        alert("Direct audio sharing is unavailable. Use Download Audio, then share the file as a document.");
        return;
      }
      alert(`This device cannot share the ${description.toLowerCase()}.`);
      return;
    }
    try {
      await shareFiles([shareFile]);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      console.error(`${description} share failed`, error);
      if (description === "Audio") {
        showAudioDownloadRecovery();
        alert("Chrome did not accept direct audio sharing. Use Download Audio, then share the file as a document.");
        return;
      }
      alert(`The ${description.toLowerCase()} could not be shared on this device.`);
    }
  }

  function downloadFile(file, objectUrl) {
    if (!file) return false;
    const url = objectUrl || URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (!objectUrl) window.setTimeout(() => cleanObjectUrl(url), 1000);
    return true;
  }

  function downloadRecording() {
    if (state.resultKind === "audio-image") {
      revealPairDownloadActions();
      return true;
    }
    return downloadFile(state.recordingFile, state.recordingUrl);
  }

  function goToPages() {
    if (isRecordingActive()) {
      alert("Stop the recording before changing page.");
      return false;
    }

    const previousView = state.currentView;
    const currentHistoryState = window.history && window.history.state;
    const isRecorderHistoryState = !!(
      currentHistoryState &&
      currentHistoryState.app === "maktab4life" &&
      String(currentHistoryState.section || "") === "recorder"
    );

    cleanup({ keepPages: true });
    renderBookSelector();

    if (isRecorderHistoryState && previousView === "preview" && typeof window.history.go === "function") {
      window.history.go(-2);
      return true;
    }

    if (isRecorderHistoryState && previousView === "record" && typeof window.history.back === "function") {
      window.history.back();
      return true;
    }

    showView("pages", { replace: true });
    return true;
  }

  function rerecordSelectedPage() {
    const audioOnly = state.sourceMode === "audio-only";
    if (!audioOnly && (!state.selectedPage || !state.selectedImage)) {
      return goToPages();
    }

    cleanup({
      keepPages: true,
      keepSelectedPage: !audioOnly,
      keepSourceMode: true
    });
    if (!audioOnly) drawSelectedPage();
    updateRecordStage();

    const currentHistoryState = window.history && window.history.state;
    const isPreviewHistoryState = !!(
      currentHistoryState &&
      currentHistoryState.app === "maktab4life" &&
      String(currentHistoryState.section || "") === "recorder" &&
      String(currentHistoryState.viewId || "") === "preview"
    );

    if (isPreviewHistoryState && typeof window.history.back === "function") {
      window.history.back();
      return true;
    }

    showView("record", { replace: true });
    return true;
  }

  function bindEvents() {
    if (els.bookSelect) {
      els.bookSelect.addEventListener("change", event => {
        const value = String(event.target.value || "");
        if (value === "__upload") {
          event.target.value = state.selectedBookId || "";
          if (els.pageUpload) els.pageUpload.click();
          return;
        }
        if (value === "__audio_only") {
          selectAudioOnly();
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
      els.rerecordBtn.addEventListener("click", rerecordSelectedPage);
    }
    if (els.shareBtn) els.shareBtn.addEventListener("click", shareRecording);
    if (els.downloadBtn) els.downloadBtn.addEventListener("click", downloadRecording);
    if (els.shareAudioBtn) {
      els.shareAudioBtn.addEventListener("click", () => shareSingleFile(state.recordingFile, "Audio"));
    }
    if (els.sharePageBtn) {
      els.sharePageBtn.addEventListener("click", () => shareSingleFile(state.pageImageFile, "Page"));
    }
    if (els.downloadAudioBtn) {
      els.downloadAudioBtn.addEventListener("click", () => downloadFile(state.recordingFile, state.recordingUrl));
    }
    if (els.downloadPageBtn) {
      els.downloadPageBtn.addEventListener("click", () => downloadFile(state.pageImageFile, state.pageImageUrl));
    }

    window.addEventListener("pagehide", () => cleanup({
      keepPages: true,
      keepSelectedPage: true,
      keepSourceMode: true
    }));
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
    updateRecordStage();
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

    const hasActiveSource = state.sourceMode === "audio-only" || state.selectedImage;
    const viewName = hasActiveSource && state.currentView !== "pages"
      ? state.currentView
      : "pages";

    showView(viewName);
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
    loadManifest,
    restoreHistoryState,
    getCurrentView() {
      return state.currentView;
    },
    isRecordingActive
  };
})();
