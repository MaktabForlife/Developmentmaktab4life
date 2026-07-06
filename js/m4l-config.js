/* M4L v86-dev-config - Runtime frontend environment config.
   Load before /app.js in both /admin/index.html and /student/index.html.

   Purpose:
   - Keep app.js free of hard-coded production/development URLs.
   - Allow the same app.js to run safely on production and development.
   - Select the correct frontend/backend URLs from the browser hostname.

   IMPORTANT:
   - Confirm DEV_API_BASE matches your actual DEV Worker URL.
   - APPS_SCRIPT_URL stays private inside the Worker environment variables.
*/
(function () {
  "use strict";

  const host = String(window.location.hostname || "").toLowerCase();

  const PRODUCTION_HOSTS = new Set([
    "rebootyourmaktab.maktab4life.org"
  ]);

  const DEVELOPMENT_HOSTS = new Set([
    "developmentmaktab4life.pages.dev"
  ]);

  const PROD_CONFIG = {
    ENV_NAME: "production",
    API_BASE: "https://rebootworker.maktab4life.workers.dev",
    STUDENT_LOGIN_BASE: "https://rebootyourmaktab.maktab4life.org/student/"
  };

  const DEV_CONFIG = {
    ENV_NAME: "development",
    API_BASE: "https://devrebootworker.maktab4life.workers.dev",
    STUDENT_LOGIN_BASE: "https://developmentmaktab4life.pages.dev/student/"
  };

  function isDevelopmentHost(hostname) {
    if (DEVELOPMENT_HOSTS.has(hostname)) return true;

    // Useful for local or temporary preview testing.
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;

    // Keeps Cloudflare development preview aliases safe if the exact alias changes.
    if (hostname.endsWith(".pages.dev") && hostname.includes("development")) return true;
    if (hostname.endsWith(".pages.dev") && hostname.includes("develop")) return true;

    return false;
  }

  function isProductionHost(hostname) {
    return PRODUCTION_HOSTS.has(hostname);
  }

  const selectedConfig = isDevelopmentHost(host)
    ? DEV_CONFIG
    : PROD_CONFIG;

  window.M4L_CONFIG = Object.freeze({
    ...selectedConfig,
    HOSTNAME: host,
    IS_DEVELOPMENT: selectedConfig.ENV_NAME === "development",
    IS_PRODUCTION: selectedConfig.ENV_NAME === "production",
    isKnownProductionHost: isProductionHost(host),
    isKnownDevelopmentHost: isDevelopmentHost(host)
  });

  if (window.M4L_CONFIG.IS_DEVELOPMENT) {
    console.info("M4L config loaded:", window.M4L_CONFIG.ENV_NAME, window.M4L_CONFIG.API_BASE);
  }
})();
