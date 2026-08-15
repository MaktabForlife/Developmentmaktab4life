/* M4L V102.4 - Course-isolated online-first application cache.
   Provides memory + localStorage caching, TTLs, stale-while-revalidate,
   in-flight request deduplication, manual invalidation, and scoped keys.
   This is a classic script and must load after app.js, before feature modules. */
(() => {
  "use strict";

  const CACHE_VERSION = "102.4";
  const STORAGE_PREFIX = "m4l_app_cache_v102_4";
  const memory = new Map();
  const inFlight = new Map();

  const TTL = Object.freeze({
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000
  });

  function stableString(value) {
    if (value === null || value === undefined) return "";
    if (typeof value !== "object") return String(value);
    if (Array.isArray(value)) return `[${value.map(stableString).join(",")}]`;
    return `{${Object.keys(value).sort().map(key => `${key}:${stableString(value[key])}`).join(",")}}`;
  }

  function simpleHash(value) {
    const text = String(value || "");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function getDefaultScope() {
    const path = String(window.location && window.location.pathname || "app");
    let userType = "";
    try { userType = String(localStorage.getItem("maktab_user_type") || ""); } catch (error) {}
    const course = typeof getM4LCourseCacheScope === "function"
      ? getM4LCourseCacheScope()
      : "LEGACY";
    return `${course}:${path}:${userType}`;
  }

  function normalizeScope(scope) {
    if (scope === "shared") {
      const course = typeof getM4LCourseCacheScope === "function"
        ? getM4LCourseCacheScope()
        : "LEGACY";
      return simpleHash(`shared:${course}`);
    }
    return simpleHash(scope || getDefaultScope());
  }

  function buildKey(key, options = {}) {
    const cleanKey = String(key || "").trim();
    if (!cleanKey) throw new Error("Cache key is required.");
    return `${STORAGE_PREFIX}:${normalizeScope(options.scope)}:${cleanKey}`;
  }

  function readStorage(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== CACHE_VERSION || !Number(parsed.savedAt)) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeStorage(storageKey, entry) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entry));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getEntry(key, options = {}) {
    const storageKey = buildKey(key, options);
    let entry = memory.get(storageKey) || null;
    if (!entry) {
      entry = readStorage(storageKey);
      if (entry) memory.set(storageKey, entry);
    }
    if (!entry) return null;

    const age = Math.max(0, Date.now() - Number(entry.savedAt || 0));
    const ttl = Number(options.ttl || entry.ttl || 0);
    const stale = ttl > 0 && age > ttl;

    if (stale && options.allowStale !== true) return null;
    return { ...entry, age, stale };
  }

  function get(key, options = {}) {
    const entry = getEntry(key, options);
    return entry ? entry.data : null;
  }

  function set(key, data, options = {}) {
    const storageKey = buildKey(key, options);
    const entry = {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      ttl: Number(options.ttl || 0),
      fingerprint: simpleHash(stableString(data)),
      data
    };
    memory.set(storageKey, entry);
    writeStorage(storageKey, entry);
    return data;
  }

  function remove(key, options = {}) {
    const storageKey = buildKey(key, options);
    memory.delete(storageKey);
    inFlight.delete(storageKey);
    try { localStorage.removeItem(storageKey); } catch (error) {}
    return true;
  }

  function clear(options = {}) {
    const scopePrefix = `${STORAGE_PREFIX}:${normalizeScope(options.scope)}:`;
    [...memory.keys()].forEach(key => {
      if (key.startsWith(scopePrefix)) memory.delete(key);
    });
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith(scopePrefix)) localStorage.removeItem(key);
      }
    } catch (error) {}
    return true;
  }

  async function fetchAndStore(key, fetcher, options = {}) {
    const storageKey = buildKey(key, options);
    if (inFlight.has(storageKey)) return inFlight.get(storageKey);

    const request = Promise.resolve()
      .then(() => fetcher())
      .then(data => {
        const previous = getEntry(key, { ...options, allowStale: true });
        const nextFingerprint = simpleHash(stableString(data));
        set(key, data, options);
        if (typeof options.onUpdate === "function" && (!previous || previous.fingerprint !== nextFingerprint)) {
          options.onUpdate(data, previous ? previous.data : null);
        }
        return data;
      })
      .finally(() => inFlight.delete(storageKey));

    inFlight.set(storageKey, request);
    return request;
  }

  async function getOrFetch(key, fetcher, options = {}) {
    const force = options.force === true;
    const cached = force ? null : getEntry(key, { ...options, allowStale: true });

    if (cached && typeof options.onCached === "function") {
      options.onCached(cached.data, cached);
    }

    if (cached && options.background !== false && navigator.onLine !== false) {
      fetchAndStore(key, fetcher, options).catch(error => {
        if (typeof options.onBackgroundError === "function") options.onBackgroundError(error);
      });
      return cached.data;
    }

    if (cached && !cached.stale && options.background === false) {
      return cached.data;
    }

    return fetchAndStore(key, fetcher, options);
  }

  window.M4LCache = Object.freeze({
    version: CACHE_VERSION,
    TTL,
    get,
    getEntry,
    set,
    remove,
    clear,
    getOrFetch,
    fetchAndStore,
    buildKey
  });
})();
