import { callAppsScript } from "../lib/apps-script.js";
import { getAuthUser } from "../lib/auth.js";
import { json } from "../lib/http.js";

export async function getResourcesEndpoint(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const result = await callAppsScript(env, {
    action: "getStudentResources",
    data: {}
  });

  return json(result);
}


