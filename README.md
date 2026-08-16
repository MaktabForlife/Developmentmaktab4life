# Maktabhelper

Current development release: V102.7 protected Global Resources.

V102.7 is applied over deployed V102.6.3. A `GLOBAL_ADMIN` designates one private
Google Drive folder for central global resources. Authorised Admins browse only
that folder and its descendants when adding or replacing a global resource.
Resources store a protected Worker file route rather than a public Drive URL,
and access is issued through a short-lived signed URL after account and
global-subject entitlement checks.

The folder ID is stored centrally under PlatformConfig key
`GlobalResourceDriveRootFolderID`. No new tab or header is introduced and
`PlatformConfig!B3` remains `102.0.4`. The first folder configuration and each
global resource change increment `GlobalCurriculumVersion`; saving the same
folder again does not. Account migration must not be rerun. No new Worker
variable, secret, binding, course Sheet or Apps Script deployment is required.

Start installation with the root-level `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.7-GITHUB-UPDATE-FROM-V102.6.3.zip` directly over the
deployed V102.6.3 development repository. A full repository upload is not
required.

Production remains stable at V101.1. It must not receive this development-only
incremental package; production will receive a separate, rehearsed merge after
the V102 development programme is complete.
