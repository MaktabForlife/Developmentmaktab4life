/* M4L v96.2-dev - Behaviour-preserving Worker modularisation.
   Wrangler bundles this entry point and its imported modules into one Worker.
*/
import { corsResponse, json } from "./lib/http.js";
import { routeRequest } from "./router.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (request.method === "OPTIONS") {
        return corsResponse();
      }

      if (url.pathname === "/") {
        return json({
          success: true,
          service: "rebootworker",
          version: "2.1"
        });
      }

      const routedResponse = routeRequest(request, env, url.pathname);

      if (routedResponse) {
        return routedResponse;
      }

      return json({ success: false, error: "Not found" }, 404);
    } catch (err) {
      return json({
        success: false,
        error: "Worker error",
        detail: err && err.message ? err.message : String(err)
      }, 500);
    }
  }
};

