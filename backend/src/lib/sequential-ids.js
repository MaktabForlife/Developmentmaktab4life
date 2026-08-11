/* M4L V101.2 - counter-free sequential identifiers sourced from sheet data. */

export function nextSequentialId(rows, prefix, options = {}) {
  return nextSequentialIds(rows, prefix, 1, options)[0];
}

export function nextSequentialIds(rows, prefix, count, options = {}) {
  const normalizedPrefix = clean(prefix).toUpperCase();
  const idColumn = Number.isInteger(options.idColumn) && options.idColumn >= 0
    ? options.idColumn
    : 0;
  const requestedCount = Number(count);

  if (!normalizedPrefix || !/^[A-Z][A-Z0-9]*$/.test(normalizedPrefix)) {
    throw new Error("ID prefix must contain only letters and numbers and start with a letter");
  }

  if (!Number.isSafeInteger(requestedCount) || requestedCount < 1) {
    throw new Error("ID count must be a positive whole number");
  }

  const existing = new Set();
  let maximum = 0;
  const matcher = new RegExp(`^${escapeRegExp(normalizedPrefix)}(\\d+)$`, "i");

  (Array.isArray(rows) ? rows.slice(1) : []).forEach(row => {
    const id = clean(Array.isArray(row) ? row[idColumn] : "").toUpperCase();
    if (!id) return;

    existing.add(id);
    const match = matcher.exec(id);

    if (!match) return;

    const suffix = Number(match[1]);
    if (Number.isSafeInteger(suffix) && suffix > maximum) {
      maximum = suffix;
    }
  });

  const ids = [];
  let candidate = Math.max(1, maximum + 1);

  while (ids.length < requestedCount) {
    if (!Number.isSafeInteger(candidate)) {
      throw new Error(`Unable to allocate another ${normalizedPrefix} identifier`);
    }

    const id = `${normalizedPrefix}${candidate}`;

    if (!existing.has(id)) {
      ids.push(id);
      existing.add(id);
    }

    candidate += 1;
  }

  return ids;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
