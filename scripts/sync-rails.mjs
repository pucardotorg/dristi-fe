import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectRails } from "./lib/agent-rails.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  const { output, problems } = inspectRails(root);
  // Never silently remove unmatched files or write through a symlink. Unexpected
  // files may be someone's custom instructions, so migration must be explicit.
  const unsafe = problems.filter((problem) => /^(Unexpected|Invalid)/.test(problem));
  if (unsafe.length) throw new Error(unsafe.join("\n"));
  for (const [path, content] of output) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  console.log(`sync:rails — generated ${output.size} files; validate with npm run verify:agents`);
} catch (error) {
  console.error(`sync:rails — ${error.message}`);
  process.exitCode = 1;
}
