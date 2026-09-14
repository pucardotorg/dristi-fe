import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const profiles = JSON.parse(readFileSync(join(root, ".agents/verification.json"), "utf8"));
const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;
const profile = process.argv[2];
const commands = Object.hasOwn(profiles, profile) ? profiles[profile] : null;
if (!Array.isArray(commands) || !commands.length || commands.some((name) =>
  typeof name !== "string" || !Object.hasOwn(scripts, name) || name.startsWith("verify:") ||
  /^(dev|start|postinstall|setup:ds|ds:bump|sync:)/.test(name))) {
  console.error(`Invalid verification profile: ${profile}`);
  process.exit(1);
}
// npm_execpath avoids shell interpolation and npm.cmd issues on Windows.
const npmPath = process.env.npm_execpath;
for (const name of commands) {
  const command = npmPath ? process.execPath : "npm";
  const args = npmPath ? [npmPath, "run", name] : ["run", name];
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0) {
    console.error(`Verification stopped at ${name}: ${result.error?.message ?? result.signal ?? result.status}`);
    process.exit(result.status || 1);
  }
}
