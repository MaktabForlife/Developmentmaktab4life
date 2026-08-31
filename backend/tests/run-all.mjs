import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const testFiles = (await readdir(testsDir))
  .filter(name => name.endsWith(".test.mjs"))
  .sort((a, b) => a.localeCompare(b));

let passed = 0;
const failed = [];

for (const file of testFiles) {
  console.log(`\n=== ${file} ===`);
  const result = spawnSync(process.execPath, [path.join(testsDir, file)], {
    cwd: path.dirname(testsDir),
    stdio: "inherit",
    env: process.env
  });

  if (result.status === 0) {
    passed += 1;
  } else {
    failed.push(file);
  }
}

console.log(`\nM4L backend regression: ${passed}/${testFiles.length} test files passed.`);
if (failed.length) {
  console.error(`Failed: ${failed.join(", ")}`);
  process.exitCode = 1;
}
