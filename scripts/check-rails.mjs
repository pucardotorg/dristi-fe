#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectRails } from "./lib/agent-rails.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  const { problems, roles, skills, rules } = inspectRails(root);
  if (problems.length) throw new Error(problems.join("\n"));
  console.log(`check:rails — ok (${skills} skills with resources, ${roles} roles, ${rules} rules; Codex, Claude, Cursor)`);
} catch (error) {
  console.error(`check:rails — ${error.message}\nEdit canonical sources, then run npm run sync:rails.`);
  process.exitCode = 1;
}
