
===============================================================================
MAKTABHELPER — APPS SCRIPT MIGRATION STATUS
Last verified: 27 July 2026
Production milestone: V98.0
===============================================================================
Addedd doogledrive app to appscript



===============================================================================
MAKTABHELPER — APPS SCRIPT MIGRATION STATUS
Last verified: 20 July 2026
Production milestone: V97.1.3
===============================================================================

The application is being migrated gradually from Apps Script to direct
Cloudflare Worker-to-Google Sheets API access.

MIGRATED TO DIRECT GOOGLE SHEETS API:
- Resource/Library reads
  Legacy Apps Script action retained: getStudentResources
- Timetable reads
  Legacy Apps Script action retained: getTimetable
- Weekly Planner reads and writes
  Weekly Planner records use the direct Google Sheets API.
  The Google Drive preview submission remains a narrow Apps Script action because it uses DriveApp.

STILL ACTIVE ON APPS SCRIPT:
- Student and Admin authentication
- PIN setup and reset
- Attendance reads and writes
- Progress reads and writes
- Timetable Zoom-link writes
- Student management
- Curriculum and task management
- Student-task assignment

IMPORTANT:
- Migrated functions marked LEGACY ROLLBACK must not be modified, reused or
  removed without first checking the active Worker routing configuration.
- Reads and writes are migrated separately. A migrated read does not mean its
  related write operation has also migrated.
- getStudentResources and getTimetable remain here only as rollback paths.
- updateTimetableZoomLink remains an active Apps Script operation.
- Remove a legacy function and its doPost action together only after the
  rollback path has been explicitly retired.
- Record every future migration in:
  apps-script/MIGRATION-CHANGELOG.md

Backend routing is controlled by backend/wrangler.jsonc.
Encrypted credentials remain in Cloudflare Worker secrets.
===============================================================================
*/

/* M4L v96.0 - Targeted StudentTasks progress writes
   Baseline: deployed v95.3.1. Progress status batches are validated as one unit,
   serialized with a script lock, and write only the requested status/date cells.
   Existing action names and single/batch request formats remain unchanged.
*/

const SHEET_NAME = "StudentRecords";
const BASE_STUDENT_LOGIN_URL = "ttps://rebootyourmaktab.maktabhelper.app/student/";
const DEFAULT_STUDENT_GROUP = 1;
const DEFAULT_WHATSAPP6 = "999999";
const WEEKLY_PLANNER_PREVIEW_DRIVE_FOLDER_ID = "1Uz-unVcnO729RE88_pr9Y1cNp8lNgRcX";
const WEEKLY_PLANNER_PREVIEW_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1Uz-unVcnO729RE88_pr9Y1cNp8lNgRcX?usp=share_link";
const WEEKLY_PLANNER_PREVIEW_DRIVE_FOLDER_LABEL = "Weekly Planner";



function normalizeWhatsapp6_(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
Editing Rebootyourmaktab/apps-script/code.gs at main · MaktabForlife/Rebootyourmaktab
