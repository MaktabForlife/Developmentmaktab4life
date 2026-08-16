# Approved authentication session policy

## Status

Approved for implementation for all users, but deliberately not implemented
in V102.6. It must be delivered as a separate security change so that session
storage behaviour is not mixed with global curriculum and subscription
management.

## Required behaviour

1. A successful PIN login creates a browser-session login by default.
2. Closing the browser should normally require the PIN again on the next visit.
3. The login screen may offer **Keep me signed in on this device** for a trusted
   personal device.
4. Persistent sign-in must never be selected automatically, including for
   `GLOBAL_ADMIN`, `ADMIN`, `SENIOR` and `TEACHER` accounts.
5. **Log out** must clear both session-only and remembered authentication data,
   course context and course-specific caches.
6. Central account, credential, course membership, role and course registration
   checks remain mandatory on every authenticated request.
7. A remembered browser token must retain a finite expiry. The current maximum
   session-token lifetime is seven days unless a later reviewed policy changes
   it.
8. A PIN change/reset, account deactivation, access deactivation, role change or
   course deactivation must continue invalidating or rejecting the existing
   session at the next request.

## Intended storage model

- Default login: store the central account token and active context in
  `sessionStorage`.
- Explicit remembered login: store them in `localStorage` only after the user
  selects **Keep me signed in on this device**.
- Operational workspace handoff must use the same selected storage policy.
- Logout and session-invalid responses must clear both stores.
- Course-data cache isolation by CourseID remains unchanged.

Browser session restoration can sometimes restore a recently closed session;
therefore the user-facing promise should say closing the browser **normally**
requires the PIN again, not claim that every browser can guarantee it.

## Migration requirement

The security update must include a one-time client storage-policy version. On
first load after deployment, old V102.3–V102.6 automatically persistent account
tokens must be removed unless the user has explicitly opted into the new
remembered-device policy. This prevents the old seven-day `localStorage`
behaviour from silently surviving the policy change.

## Tests required before deployment

- default login survives navigation but not a normal new browser session;
- remembered-device login survives browser restart until expiry;
- the checkbox is off by default for every role;
- logout clears both storage locations and all account/workspace keys;
- context switching preserves the chosen storage policy and issues a newly
  scoped token;
- invalidated credentials or access reject tokens from either store;
- legacy direct login routes follow the same final policy until they are
  retired.

## V102.6 boundary

V102.6 retains the existing seven-day token in `localStorage`. This document is
the approved implementation requirement, not a claim that the policy is
already active.
