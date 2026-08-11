import assert from "node:assert/strict";
import {
  nextSequentialId,
  nextSequentialIds
} from "../src/lib/sequential-ids.js";

assert.equal(nextSequentialId([
  ["SubjectID", "SubjectName"],
  ["SUBJ1", "Aqidah"],
  ["SUBJ9", "Quran"],
  ["SUBJ17", ""]
], "SUBJ"), "SUBJ18", "Blank placeholder rows still reserve their IDs");

assert.equal(nextSequentialId([
  ["StudentID", "Name"],
  ["SYSTEM1", "System"],
  ["MAKTAB40", "Student"]
], "MAKTAB"), "MAKTAB41", "Unrelated prefixes must be ignored");

assert.deepEqual(nextSequentialIds([
  ["StudentTaskID"],
  ["STASK8504"],
  ["STASK8506"]
], "STASK", 3), ["STASK8507", "STASK8508", "STASK8509"]);

assert.equal(nextSequentialId([["ResourceID"]], "RES"), "RES1");
assert.throws(() => nextSequentialIds([], "TASK", 0), /positive whole number/);
assert.throws(() => nextSequentialId([], "TASK-"), /letters and numbers/);

console.log("Counter-free sequential ID tests passed.");
