# V102.7 update to-do

Apply V102.7 only over the deployed V102.6.3 development repository using:

`Rebootyourmaktab-V102.7-GITHUB-UPDATE-FROM-V102.6.3.zip`

This is a modified-files overlay, not a full repository. Production remains
stable at V101.1 and must not receive this ZIP.

## 1. Confirm and back up V102.6.3

- [ ] Confirm the development Worker root reports `102.6.3`.
- [ ] Confirm `/account/<uniqueid>` displays `V102.6.3`.
- [ ] Back up the development GitHub repository.
- [ ] Export or back up the central Platform Sheet.
- [ ] Record the current value of `PlatformConfig!B4`
  (`GlobalCurriculumVersion`).
- [ ] Confirm `PlatformConfig!B3` is `102.0.4`.

Do not rerun account migration. V102.7 adds no tab or header and does not change
`PlatformConfig!B3`.

## 2. Prepare the private Global Resources folder

- [ ] In Google Drive, create or choose the folder that will contain central
  global resources.
- [ ] Keep General access set to **Restricted**. Do not make the folder public.
- [ ] Share the folder with the service-account email already shown in the
  development Worker setting `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL`.
- [ ] Give the service account **Viewer** access. V102.7 reads files but does not
  upload or delete Drive content.
- [ ] Add a small test PDF, preferably inside one test subfolder.
- [ ] Copy the folder URL. Do not put the folder ID into a Cloudflare variable.

This folder is separate from the existing course Library root. V102.7 uses the
same Google credential, but it stores the global root centrally in
`PlatformConfig`.

## 3. Update the GitHub development repository

- [ ] Extract `Rebootyourmaktab-V102.7-GITHUB-UPDATE-FROM-V102.6.3.zip`.
- [ ] Upload every included file to its matching path in the existing
  development repository.
- [ ] Replace existing files and add new files while preserving folder names.
- [ ] Do not delete any repository file.
- [ ] Confirm root `version.json` and `js/version.json` both contain `102.7`.
- [ ] Confirm this `UPDATE-TODO.md` is present at repository root.
- [ ] Commit the complete overlay together so Cloudflare receives one coherent
  Worker/Pages source revision.

Cloudflare may start Worker and Pages deployments immediately. The old Pages UI
cannot call the new controls, and the new UI must not be tested until both
deployments have completed.

## 4. Confirm deployment

- [ ] Wait for both Worker and Pages deployments to finish successfully.
- [ ] Preserve every existing Worker variable, secret and binding.
- [ ] Confirm the Worker root reports `102.7`.
- [ ] Hard-refresh Pages or use a private window.
- [ ] Confirm `/account/<uniqueid>` displays `V102.7`.
- [ ] Confirm GLOBAL_ADMIN and Student unified login still succeed.
- [ ] Confirm an incorrect PIN clears, re-enables and accepts the next attempt.

No Worker variable, secret, binding, course Sheet or Apps Script change is
required for V102.7.

## 5. Configure the folder in the application

- [ ] Sign in as `GLOBAL_ADMIN`.
- [ ] Open **Admin → Global Curriculum → Resources**.
- [ ] In **Global Resources Google Drive folder**, paste the folder URL and
  select **Save Folder**.
- [ ] Confirm the status changes to **Configured**.
- [ ] Open the Platform Sheet and verify the key/value row.

For the standard V102.6.3 PlatformConfig layout, the exact cells are:

| Cell | Required value |
| --- | --- |
| `PlatformConfig!A5` | `GlobalResourceDriveRootFolderID` |
| `PlatformConfig!B5` | The Google Drive folder ID only |
| `PlatformConfig!C5` | The save timestamp |
| `PlatformConfig!D5` | The GLOBAL_ADMIN AccountID |
| `PlatformConfig!E5` | The GLOBAL_ADMIN display name |

If another configuration row already occupies row 5, V102.7 appends the key to
the next empty row. In that case, locate the row whose column A value is exactly
`GlobalResourceDriveRootFolderID`; the folder ID is in column B of that same
row. There must be only one such row.

- [ ] Confirm `PlatformConfig!B3` is still `102.0.4`.
- [ ] Confirm `PlatformConfig!B4` increased by exactly 1 after the first folder
  save.
- [ ] Confirm `PlatformAuditLog` contains
  `SET_GLOBAL_RESOURCE_DRIVE_ROOT`.
- [ ] Save the same folder again and confirm `PlatformConfig!B4` does not
  increase again.

## 6. Verify Global Resource browsing and saving

- [ ] As GLOBAL_ADMIN, return to **Global Curriculum → Resources**.
- [ ] Select an active global subject, module/task if required, name and type.
- [ ] Select **Browse Global Resources Google Folder**.
- [ ] Confirm the browser starts at the configured root and can open its test
  subfolder.
- [ ] Select the test PDF as `EBOOK` or `PRINTABLE`.
- [ ] Confirm the format is filled automatically as `PDF`.
- [ ] Save the global resource.
- [ ] Confirm `GlobalResources.ResourceLink` contains a protected Worker route
  ending `/api/library/drive/file/<fileId>`, not a public Drive sharing URL.
- [ ] Confirm the new resource has a namespaced UUID `ResourceID`.
- [ ] Confirm `PlatformConfig!B4` increased by 1 for the new resource.
- [ ] Confirm `PlatformAuditLog` contains `CREATE_GLOBAL_RESOURCE`.

Expected file compatibility:

- `EBOOK` and `PRINTABLE`: PDF.
- `AUDIO`: downloadable audio files.
- `VIDEO`: downloadable video files such as MP4.
- `OTHER`: supported images, text, ZIP, Word or PowerPoint files.
- Google-native Docs, Sheets and Slides are not downloadable global resources
  in V102.7.

## 7. Permission and safety checks

- [ ] Sign in as an ordinary course `ADMIN` and confirm Global Curriculum can
  browse and manage global resources but cannot change the folder setting.
- [ ] Confirm SENIOR/SENIOR TEACHER, TEACHER and STUDENT do not see the Global
  Curriculum management control.
- [ ] Attempt to add the same Drive file again and confirm it is rejected as a
  duplicate.
- [ ] Confirm the browser cannot navigate above the configured root.
- [ ] As GLOBAL_ADMIN, attempt to replace the root with a folder that does not
  contain the saved Drive-backed resource and confirm the change is blocked.
- [ ] Open **System Settings → Validate Platform Sheet** and confirm the success
  summary says **Global Resources folder is configured**.
- [ ] Confirm the validation summary still reports the correct global-subject
  and subscription counts.

## 8. Subscription access boundary

V102.7 adds the protected access endpoint used for later learner delivery. It
revalidates the central account and requires one active
`UserGlobalSubjectAccess` row for the resource's subject unless the account is
ADMIN or GLOBAL_ADMIN. The resulting file URL is short-lived and signed.

- [ ] Confirm the resource remains active only while its subject and any linked
  module/task are active.
- [ ] Confirm direct subscription activation/deactivation still works.
- [ ] Confirm subscription changes do not change `PlatformConfig!B4`.

V102.7 does not yet merge global resources into the learner Library screen and
does not add billing, expiry or payment processing.

## 9. Regression checks

- [ ] Confirm Profile shows the account name, courses and roles and can switch
  context without another PIN.
- [ ] Confirm restricted Admin Home tiles remain absent for SENIOR and TEACHER.
- [ ] Confirm the UI displays `SENIOR TEACHER` while stored role values remain
  `SENIOR`.
- [ ] Confirm course Library browsing and course resource creation still use the
  existing course Drive root.
- [ ] Confirm Attendance, Weekly Planner, Progress and current published
  timetable behaviour are unchanged.

## 10. Rollback

- [ ] Revert the V102.7 GitHub commit or redeploy the backed-up V102.6.3 source.
- [ ] Confirm Worker and Pages both return to `102.6.3`.
- [ ] Do not rerun account migration.
- [ ] Do not delete the `GlobalResourceDriveRootFolderID` row, global resource
  rows or audit rows created during V102.7 testing.
- [ ] Keep the increased `GlobalCurriculumVersion`; do not manually reduce B4.

V102.6.3 safely ignores the additional PlatformConfig key. Retaining the data
keeps rollback non-destructive and allows V102.7 to be redeployed later.

## Completion record

- Development GitHub commit: ____________________
- Worker deployment ID: ____________________
- Pages deployment ID: ____________________
- PlatformConfig folder row: ____________________
- B4 before update: ____________________
- B4 after folder setup: ____________________
- B4 after test resource: ____________________
- Verified by: ____________________
- Verification date: ____________________
- Result: ____________________
