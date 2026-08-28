import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [adminHtml, js, css, styles] = await Promise.all([
  readFile(new URL("../../admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../../js/m4l-global-delivery.js", import.meta.url), "utf8"),
  readFile(new URL("../../css/m4l-26-global-delivery.css", import.meta.url), "utf8"),
  readFile(new URL("../../styles.css", import.meta.url), "utf8")
]);

assert.match(adminHtml, /data-gcm-delivery-action="show"[^>]*>Delivery</);
assert.match(adminHtml, /m4l-global-delivery\.js\?v=102\.11/);
assert.match(styles, /m4l-26-global-delivery\.css\?v=102\.10/);
assert.match(js, /\/api\/admin\/platform\/global\/delivery\/get/);
assert.match(js, /\/api\/admin\/platform\/global\/policy\/save/);
assert.match(js, /\/api\/admin\/platform\/global\/run\/save/);
assert.match(js, /FREE is implicit for every active central account/);
assert.match(js, /Ending a run does not deactivate the subject, revoke subscriptions, or hide historical resources/);
assert.match(js, /Africa\/Johannesburg/);
assert.match(js, /model\.loading = false;\n\s+await load\(true\)/, "A successful save must release the saving lock before reloading Delivery state");
assert.match(js, /handleDeliveryCapture/, "Header reload must stay on the Delivery tab instead of falling through to the V102.7 renderer");
assert.match(js, /closeAction[\s\S]*model\.active = false/, "Closing Global Curriculum must deactivate the additive Delivery renderer");
assert.match(css, /\.global-delivery-shell/);
assert.match(css, /\.global-delivery-badge/);
assert.match(css, /@media \(max-width:/);

console.log("V102.11 Global Curriculum Delivery coexistence UI checks passed.");
