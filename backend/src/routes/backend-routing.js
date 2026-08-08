import { getAuthUser } from "../lib/auth.js";
import { getBackendRoutingDiagnostics } from "../lib/backend-routing.js";
import { json } from "../lib/http.js";
import { getGoogleServiceAccountEmailDiagnostics } from "../lib/google-service-account-email.js";

export async function backendRoutingDiagnosticsEndpoint(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  return json({
    success: true,
    service: "backend-routing",
    ...getBackendRoutingDiagnostics(env),
    googleServiceAccount: getGoogleServiceAccountEmailDiagnostics(env)
  });
}
