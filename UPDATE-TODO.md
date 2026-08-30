# V103.1 UPDATE TODO

1. Apply all files in this changed-files overlay to the complete deployed **V102.12.8** development repository.
2. Deploy **Pages and Worker from the same commit**.
3. Confirm Worker health reports `103.1`.
4. Hard-refresh/reload the development PWA so the new System Settings script is loaded.
5. Keep the Platform workbook unchanged:
   - `PlatformConfig!B3 = 102.0.8`;
   - 19 required Platform tabs.
6. Before linking, confirm the existing **Central account migration** for Reboot is current. V103.1 relies on existing `UserAccounts` and `UserCourseAccess` mappings.
7. Open **Admin → System Settings → Platform Sheet → V103.1 Identity links**.
8. Choose **Preview Identity Links**.
9. Review all blockers/warnings. Do **not** commit if the preview reports ambiguity or a conflicting existing AccountID.
10. A clean first preview should show the planned `AccountID` header additions (if they do not already exist) plus the number of staff/student identity links to write.
11. Type the displayed `LINK <COURSEID>` confirmation and choose **Link Reboot Identities**.
12. Run **Preview Identity Links** again. It should report that identity links are current with zero planned writes.
13. Confirm `AdminRecords` and `StudentRecords` now each contain one `AccountID` header and normal user rows have the expected central link. `StudentRecords` system rows remain blank/excluded.
14. Regression smoke-check existing behaviour before starting V103.2:
    - student login;
    - Admin/Senior/Teacher login;
    - Attendance;
    - Progress;
    - Weekly Planner;
    - Reboot timetable;
    - Library/resources;
    - student/admin management;
    - task assignment.
15. Do not start consuming `AccountID` as Reboot operational authority in V103.1. That cut-over belongs to later V103 components.
16. Keep the major roadmap boundary: **V103 Central Identity → V104 Program Builder → V105 Reboot migration**.
