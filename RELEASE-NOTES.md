# Maktabhelper V102.12.2

V102.12.2 is an Academy Calendar usability refinement on top of V102.12.1.

The Calendar and Terms now occupy the full page width. Islamic Dates and Public Holidays share the next row equally on larger screens and stack on smaller screens. All Calendar management happens inline; the old separate editing area is no longer used.

Public Holidays remain automatically generated from the South African rules, but Admin can now edit the effective date, remove a day with `×`, or add another Public Holiday using the `+` action after the list. Only the exceptions are persisted.

Islamic event descriptions remain those from the supplied reference document. The Islamic date is displayed beneath the description. `First Fast` is removed from Calendar display and Ramadaan is derived from First Taraweeh instead.

There is no Platform Sheet migration. Keep `PlatformConfig!B3 = 102.0.8` and the existing 19 required tabs.
