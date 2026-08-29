# V102.12.3 app-loader hotfix

Apply this overlay on top of V102.12.3.

This is a Pages/runtime-loader correction only. The deployed console symptom was `/app.js` returning 404, followed by `m4l-shell.js` throwing `ReferenceError: state is not defined`. `state` is defined by root `app.js`, so the shell error is downstream of the missing loader.
