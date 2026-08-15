/* M4L V102.4 - Per-request verified identity cache.
   The WeakMap is internal to the Worker isolate and cannot be populated by a
   request header, URL parameter or submitted CourseID. */

const requestAuthUsers = new WeakMap();

export function setRequestAuthUser(request, user) {
  if (request && typeof request === "object" && user && typeof user === "object") {
    requestAuthUsers.set(request, Object.freeze({ ...user }));
  }
}

export function getRequestAuthUser(request) {
  return request && typeof request === "object"
    ? requestAuthUsers.get(request) || null
    : null;
}
