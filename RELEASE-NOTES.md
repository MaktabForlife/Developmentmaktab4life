V102.12

Academy timetable delivery over V102.11.2.

- Academy timetable becomes Home after central-account login.
- Combines current Program Timetables and current published Global Courses.
- Adds backend-enforced DETAIL/LABEL redaction.
- Program membership is revalidated against the Program's own active identity before DETAIL is returned.
- FREE Global Courses show detail to active accounts; PAID Global Courses require current entitlement or authorised teaching/admin access.
- Zoom is shown only where the backend authorises the session.
- Relevant classes are prominent; label-only Academy activity is muted.
- Academy Home times use `13h00` format and support week navigation.
- Existing Program and Global timetable builders remain separate and unchanged.
- Platform schema remains `102.0.7`; no Sheet migration is required.
- No repository paths are intentionally deleted.
