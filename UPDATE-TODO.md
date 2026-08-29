# V102.12.3 app-loader hotfix — deployment

1. Apply the changed-files overlay to the current V102.12.3 development repository.
2. Confirm repository root contains `app.js`.
3. Deploy Cloudflare Pages from the updated commit. If the Worker auto-deploys from the same commit, no Worker configuration change is required.
4. Hard-refresh the Reboot workspace once after deployment.
5. Confirm DevTools Network shows `/app.js?v=102.12.3` returning HTTP 200 with JavaScript content.
6. Confirm the prior `ReferenceError: state is not defined` is gone.
7. Open both an Admin/Teacher Reboot workspace and a Student Reboot workspace.
8. No Platform Sheet/schema change is required.
