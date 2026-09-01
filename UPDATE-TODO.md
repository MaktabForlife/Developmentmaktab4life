# V104.5.4 UPDATE TODO — Course / Academy Timetable UI Refinement

## Apply / deploy

1. Apply this changed-files-only V104.5.4 overlay to the completed **V104.5.3** source tree.
2. Deploy Worker and Pages/app assets together.
3. Confirm Worker health `/` reports `104.5.4`.
4. Confirm Account UI displays `V104.5.4` and the updated Account/Admin asset cache versions load.
5. **Do not run Prepare Scheduling.** Platform schema remains `102.0.12`; V104.5.4 has no Sheet migration.

## Courses acceptance

6. Open Global Curriculum → Courses. Confirm saved published Courses show a visible but disabled berry Publish button.
7. Revise a saved Course. Before the main Save, confirm Publish stays visible but disabled. Save the Course; confirm Publish becomes enabled when the saved revision is otherwise eligible.
8. Confirm an inactive saved Course, a saved Course without a schedule, and an ONGOING Course without a valid saved Publish window each retain a disabled Publish button.
9. Confirm a brand-new unsaved `+ Add Course` draft does not show Publish until it has been saved and receives a RunID.
10. Confirm DERIVED action reads **Exception** on one line; EXPLICIT continues to read **Sessions**.
11. Open a recurring Schedule. Confirm new Start/End fields are blank and display `--h--`.
12. Confirm the old top-right `+ Another Time Slot` button is gone and **+ Add another time slot** appears beneath the rows at lower left.
13. Confirm each schedule row uses the Lucide trash/delete icon rather than an X.

## Academy acceptance

14. Confirm published Hifz DERIVED sessions appear on the expected recurring days in Academy.
15. Confirm an EXPLICIT Course whose Course Name differs from its Global Subject uses **Course Name** as the large pill title (for example `History of the Quran`, not `Tafseer & Tadabbur`).
16. Confirm cancelled/rescheduled explicit occurrences retain the Course Name.
17. Confirm large detailed pills centre their text.
18. During an actually current session with authorised Zoom access, confirm the **entire pill** becomes the purple Zoom action and displays the link icon beside `Zoom`.
19. Confirm cancelled sessions never become an active Zoom link.

## Regression

20. Run `cd backend && npm test`; expected result: **68/68** backend test files passed.
21. Run `node tests/v10454-course-calendar-ui.test.mjs`.
22. Confirm `node tests/v10453-ongoing-derived-window.test.mjs` remains green.
23. Confirm V104.3 request-read deduplication remains green.
24. Confirm V104.4 read audit remains **23 direct-read call sites across 17 files / 15 batch-read call sites**.
25. Smoke-test central account login, Academy timetable, one EXPLICIT Course, one DERIVED Course, Attendance and one Program timetable path.

## Rollback

26. V104.5.4 is code/UI-only. Rollback to V104.5.3 requires restoring the V104.5.3 code/assets only; the Platform workbook remains at schema `102.0.12` and does not need restoration.
