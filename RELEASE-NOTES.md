# V102.12.7 Release Notes

V102.12.7 is a focused correction to V102.12.6. It preserves the V102.12.6 batch-editing and responsive Global/Academic Calendar work while correcting teacher publication semantics and polishing the Calendar controls on desktop/mobile.

## Publishable TBA sessions

A Global Course session no longer requires a confirmed teacher before publication. `TBA` means the teacher is not yet confirmed, but the session is valid and publishable.

For TBA sessions, `TeacherAccountID` remains blank. No synthetic TBA account is created. Publication snapshots retain the immutable display value `TeacherName = TBA`, so published delivery can show TBA consistently. If a real teacher is selected later, the session can be revised and republished normally.

A nonblank TeacherAccountID is still validated and must resolve to an active account.

## Academic Calendar toolbar

The Month navigator, Today button and Year control remain on one compact responsive row. The Today button now explicitly opts out of the application's global full-width button rule, preventing it from stretching across the Calendar toolbar or pushing the Year control off screen.

## Mobile Holidays

Holiday rows on phones now remain a neat one-line list:

`Description | Date | ×`

The description flexes, the date stays compact, and the remove action remains at the right. The existing batch-save behaviour is unchanged: `×` marks a pending removal and the Holidays section Save commits all changes together.

There is **no Sheet migration**. `PlatformSchemaVersion` remains `102.0.8` with 19 required tabs.
