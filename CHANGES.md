# V102.12.5 Changes

- Renames the user-facing **Academy Calendar** to **Academic Calendar**.
- Refreshes the Academic Calendar styling to match the newer Academy Home timetable language: clean white cards, softer borders, rounded controls and compact pill-style calendar markers.
- Renames **Public Holidays** to **Holidays** in the Admin UI.
- South African statutory holidays still generate automatically and default to the description `Public Holiday`.
- Holiday descriptions are now editable inline, so Admin can add a more useful description when needed.
- Holiday dates remain editable, removable with `×`, and additional holidays can still be added with `+`.
- Removes the Alternate Date field from the Islamic Dates UI and stops exposing alternate Islamic dates through the calendar API.
- Removes the Teaching field from Islamic Dates; Islamic dates are always informational.
- Retains the Islamic date underneath the event description.
- Save and Refresh icons on Academic Calendar use transparent/no-fill backgrounds.
- No Platform Sheet/schema change: `PlatformSchemaVersion` remains `102.0.8` with 19 required tabs.
