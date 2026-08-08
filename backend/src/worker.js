/* M4L V100.5 - Fixed backend ownership; retired migration selectors removed.
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
          version: "100.5"
        });
      }

      const routedResponse = routeRequest(request, env, url.pathname);

      if (routedResponse) {
        return routedResponse;
      }

      return json({ success: false, error: "Not found" }, 404);
    } catch (err) {
      // Deliberately return no exception detail. Authentication requests may contain
      // sensitive values, so request bodies, PINs and hashes are never echoed or logged.
      return json({
        success: false,
        error: "Worker error"
      }, 500);
    }
  }
};
