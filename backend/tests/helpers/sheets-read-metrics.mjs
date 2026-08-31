import assert from "node:assert/strict";

export function createSheetsReadMetrics() {
  const requests = [];

  return {
    record(input, init = {}) {
      const url = input instanceof URL ? new URL(input.href) : new URL(String(input));
      const method = String(init.method || "GET").toUpperCase();
      if (url.hostname !== "sheets.googleapis.com" || method !== "GET") return;

      const spreadsheetId = extractSpreadsheetId(url.pathname);
      let kind = "other-get";
      let ranges = [];

      if (url.pathname.endsWith("/values:batchGet")) {
        kind = "batch-get";
        ranges = url.searchParams.getAll("ranges");
      } else if (url.pathname.includes("/values/")) {
        kind = "direct-read";
        ranges = [decodeURIComponent(url.pathname.split("/values/")[1] || "")];
      } else if (url.searchParams.has("fields")) {
        kind = "metadata-read";
      }

      requests.push({
        spreadsheetId,
        kind,
        ranges: ranges.slice(),
        url: url.href
      });
    },

    mark() {
      return requests.length;
    },

    requestsSince(mark = 0) {
      return requests.slice(Number(mark) || 0).map(item => ({
        ...item,
        ranges: item.ranges.slice()
      }));
    },

    summary(mark = 0) {
      return summarize(requests.slice(Number(mark) || 0));
    }
  };
}

export function assertSheetsReadBudget(metrics, mark, expected = {}, message = "Google Sheets read budget") {
  const actual = metrics.summary(mark);
  const keys = [
    "totalRequests",
    "batchGets",
    "directReads",
    "metadataReads",
    "otherGets",
    "rangeCount"
  ];

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(expected, key)) {
      assert.equal(actual[key], expected[key], `${message}: ${key}`);
    }
  }

  if (expected.spreadsheets) {
    assert.deepEqual(actual.spreadsheets, expected.spreadsheets, `${message}: spreadsheets`);
  }

  return actual;
}

function summarize(requests) {
  const spreadsheets = {};
  let batchGets = 0;
  let directReads = 0;
  let metadataReads = 0;
  let otherGets = 0;
  let rangeCount = 0;

  for (const request of requests) {
    const spreadsheetId = request.spreadsheetId || "unknown";
    spreadsheets[spreadsheetId] = (spreadsheets[spreadsheetId] || 0) + 1;
    rangeCount += request.ranges.length;

    if (request.kind === "batch-get") batchGets += 1;
    else if (request.kind === "direct-read") directReads += 1;
    else if (request.kind === "metadata-read") metadataReads += 1;
    else otherGets += 1;
  }

  return {
    totalRequests: requests.length,
    batchGets,
    directReads,
    metadataReads,
    otherGets,
    rangeCount,
    spreadsheets
  };
}

function extractSpreadsheetId(pathname) {
  const match = /\/v4\/spreadsheets\/([^/:]+)/.exec(String(pathname || ""));
  return match ? decodeURIComponent(match[1]) : "";
}
