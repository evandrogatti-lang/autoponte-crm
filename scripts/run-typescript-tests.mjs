import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = readdirSync("tests", { recursive: true })
  .map(String)
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => `tests/${file.replaceAll("\\", "/")}`)
  .sort();

if (!files.length) throw new Error("Nenhum teste TypeScript encontrado.");

const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
