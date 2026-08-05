import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const output = ".ade-test";
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const localTsc = process.platform === "win32"
  ? join("node_modules", ".bin", "tsc.cmd")
  : join("node_modules", ".bin", "tsc");
const command = existsSync(localTsc) ? localTsc : "tsc";
const compile = spawnSync(command, [
  "--module", "commonjs",
  "--moduleResolution", "node",
  "--target", "es2022",
  "--esModuleInterop",
  "--strict",
  "--skipLibCheck",
  "--outDir", output,
  "--rootDir", ".",
  "tests/ade-core.test.ts",
  "lib/ade/index.ts",
  "lib/ade/types.ts",
  "lib/ade/utils.ts",
  "lib/ade/opportunity-dna.ts",
  "lib/ade/confidence.ts",
  "lib/ade/business-temperature.ts",
  "lib/ade/explainability.ts",
  "lib/ade/recommendation.ts",
  "lib/ade/flow-engine.ts",
], { stdio: "inherit", shell: process.platform === "win32" });

if (compile.status !== 0) process.exit(compile.status ?? 1);
writeFileSync(join(output, "package.json"), JSON.stringify({ type: "commonjs" }));
const tests = spawnSync(process.execPath, ["--test", join(output, "tests", "ade-core.test.js")], { stdio: "inherit" });
rmSync(output, { recursive: true, force: true });
process.exit(tests.status ?? 1);
