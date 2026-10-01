import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { expectedRails, inspectRails, skillMetadata } from "./lib/agent-rails.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function write(root, path, body) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), body);
}

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "dristi-agent-rails-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const path of [".agents", ".codex", ".claude", ".cursor", "scripts", "package.json", "AGENTS.md", "CLAUDE.md"]) {
    cpSync(join(root, path), join(directory, path), { recursive: true });
  }
  // Only existence is relevant to local-reference checks: fixtures need no app code,
  // dependencies, running server, or historical document contents.
  for (const path of [
    "docs/README.md", "docs/product/README.md", "docs/product/open-questions.md",
    "docs/design/design-system.md", "docs/design/ds-diagnosis.md", "docs/design/ds-requests.md",
    "docs/design/features/README.md", "docs/design/proposals/README.md",
    "docs/design/explorations/README.md", "docs/design-mode.md",
    "apps/dristi-app/scripts/resolve-ds.mjs", "apps/dristi-app/src/components/chrome/table-plate.ts",
    "apps/dristi-app/src/components/chrome/motion.ts", "apps/dristi-app/src/components/filing/form-card.tsx",
    "apps/dristi-app/src/app/globals.css", "apps/dristi-app/public/design-mode.js",
  ]) write(directory, path, "fixture\n");
  assert.deepEqual(inspectRails(directory).problems, [], "Every mutation starts from a valid fixture");
  return directory;
}

function cli(directory, script, args = [], env = {}) {
  return spawnSync(process.execPath, [join(directory, "scripts", script), ...args], {
    cwd: directory, encoding: "utf8", env: { ...process.env, ...env },
  });
}

test("repository adapters and full skill resources match canonical sources", () => {
  assert.deepEqual(inspectRails(root).problems, []);
});

for (const path of [
  ".codex/agents/ui-reviewer.toml",
  ".agents/skills/pull-ui-from-ds/SKILL.md",
  ".cursor/skills/design-ui/references/staff-ux-thinking.md",
  ".claude/skills/ui-craft/references/surfaces.md",
  "AGENTS.md",
]) {
  test(`detects drift in ${path}`, (t) => {
    const directory = fixture(t);
    writeFileSync(join(directory, path), readFileSync(join(directory, path), "utf8") + "\nChanged fixture instructions.\n");
    assert.ok(inspectRails(directory).problems.some((problem) => /differs/.test(problem)));
  });
}

test("detects a missing Codex role", (t) => {
  const directory = fixture(t);
  rmSync(join(directory, ".codex/agents/ui-reviewer.toml"));
  assert.ok(inspectRails(directory).problems.some((problem) => problem.includes("Missing generated file: .codex/agents/ui-reviewer.toml")));
});

for (const path of [".cursor/skills/extra/SKILL.md", ".cursor/rules/extra.mdc", ".codex/agents/extra.toml"]) {
  test(`detects unmatched ${path} and sync refuses to delete it`, (t) => {
    const directory = fixture(t);
    write(directory, path, "owner's extra configuration\n");
    assert.ok(inspectRails(directory).problems.some((problem) => problem.includes(path)));
    const result = cli(directory, "sync-rails.mjs");
    assert.equal(result.status, 1);
    assert.equal(readFileSync(join(directory, path), "utf8"), "owner's extra configuration\n");
  });
}

test("broken skill-relative links fail even when all mirrors match", (t) => {
  const directory = fixture(t);
  for (const prefix of [".agents", ".claude", ".cursor"]) {
    const path = join(directory, prefix, "skills/design-ui/SKILL.md");
    writeFileSync(path, readFileSync(path, "utf8") + "\n[missing](references/missing.md)\n");
  }
  assert.throws(() => inspectRails(directory), /Broken local reference/);
});

test("broken repo-relative policy links fail", (t) => {
  const directory = fixture(t);
  writeFileSync(join(directory, ".agents/policies/project.md"), "Read `.agents/policies/missing.md`.\n");
  assert.throws(() => expectedRails(directory), /Broken local reference/);
});

test("documents cannot require nonexistent root scripts", (t) => {
  const directory = fixture(t);
  writeFileSync(join(directory, ".agents/policies/verification.md"), "Run `npm run check:missing`.\n");
  assert.throws(() => expectedRails(directory), /Unknown root command/);
});

for (const mutation of [
  (role) => { delete role.codexSandbox; },
  (role) => { role.claudeTools.push("Bash"); },
  (role) => { role.claudeTools.push("Write"); },
]) {
  test("cannot regenerate weakened reviewer restrictions into matching files", (t) => {
    const directory = fixture(t);
    const path = join(directory, ".agents/rails.json");
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    mutation(manifest.roles.find((role) => role.name === "ui-reviewer"));
    writeFileSync(path, JSON.stringify(manifest));
    assert.throws(() => expectedRails(directory), /Read-only role adapter weakened/);
  });
}

test("removed canonical required skill cannot silently disappear from every tool", (t) => {
  const directory = fixture(t);
  rmSync(join(directory, ".agents/skills/document-ui-feature"), { recursive: true });
  assert.throws(() => expectedRails(directory), /Missing required skill/);
});

test("generation restores missing mirrors and is idempotent", (t) => {
  const directory = fixture(t);
  rmSync(join(directory, ".codex/agents/ui-designer.toml"));
  assert.equal(cli(directory, "sync-rails.mjs").status, 0);
  assert.deepEqual(inspectRails(directory).problems, []);
  const first = [...expectedRails(directory).output].map(([path]) => [path, readFileSync(join(directory, path))]);
  assert.equal(cli(directory, "sync-rails.mjs").status, 0);
  for (const [path, content] of first) assert.deepEqual(readFileSync(join(directory, path)), content);
});

test("new canonical skills carry nested resources into every mirror", (t) => {
  const directory = fixture(t);
  write(directory, ".agents/skills/extra/SKILL.md", '---\nname: extra\ndescription: "Fixture skill"\n---\n\n[Resource](references/nested/example.md)\n');
  write(directory, ".agents/skills/extra/references/nested/example.md", "nested fixture\n");
  const result = cli(directory, "sync-rails.mjs");
  assert.equal(result.status, 0, result.stderr);
  for (const tool of [".claude", ".cursor"]) {
    assert.equal(readFileSync(join(directory, tool, "skills/extra/references/nested/example.md"), "utf8"), "nested fixture\n");
  }
  assert.deepEqual(inspectRails(directory).problems, []);
});

test("sync refuses to write through a generated-file symlink", (t) => {
  const directory = fixture(t);
  const path = join(directory, ".codex/agents/ui-reviewer.toml");
  const target = join(directory, "unrelated.txt");
  writeFileSync(target, "untouched\n");
  rmSync(path);
  symlinkSync(target, path);
  assert.equal(cli(directory, "sync-rails.mjs").status, 1);
  assert.equal(readFileSync(target, "utf8"), "untouched\n");
});

test("skill metadata rejects malformed and duplicate fields", () => {
  assert.throws(() => skillMetadata("no metadata", "fixture"), /frontmatter/);
  assert.throws(() => skillMetadata('---\nname: example\nname: again\ndescription: "test"\n---\n', "fixture"), /duplicate/);
});

test("Codex string encoding preserves quotes, newlines, and Unicode from the role", (t) => {
  const directory = fixture(t);
  const body = 'A "quoted" instruction.\nUse Unicode → and literal \\ paths.\n';
  writeFileSync(join(directory, ".agents/roles/ui-designer.md"), body);
  const toml = expectedRails(directory).output.get(".codex/agents/ui-designer.toml");
  const value = /^developer_instructions = (.+)$/m.exec(toml)[1];
  assert.equal(JSON.parse(value), body);
});

test("verification stops on failure, uses argument arrays, and never starts later commands", (t) => {
  const directory = fixture(t);
  const fakeNpm = join(directory, "fake-npm.cjs");
  writeFileSync(fakeNpm, 'require("node:fs").appendFileSync("commands.log", JSON.stringify(process.argv.slice(2))+"\\n"); process.exit(process.argv[3] === "lint" ? 7 : 0);');
  const result = cli(directory, "verify-agent-work.mjs", ["ui"], { npm_execpath: fakeNpm });
  assert.equal(result.status, 7);
  const log = readFileSync(join(directory, "commands.log"), "utf8").trim().split("\n").map(JSON.parse);
  assert.deepEqual(log, [["run", "check:ds-fresh"], ["run", "lint"]]);
});

test("verification rejects unknown or recursive profiles before execution", (t) => {
  const directory = fixture(t);
  assert.equal(cli(directory, "verify-agent-work.mjs", ["unknown"]).status, 1);
  const profiles = JSON.parse(readFileSync(join(directory, ".agents/verification.json"), "utf8"));
  profiles.ui = ["verify:ui"];
  writeFileSync(join(directory, ".agents/verification.json"), JSON.stringify(profiles));
  assert.equal(cli(directory, "verify-agent-work.mjs", ["ui"]).status, 1);
  assert.equal(existsSync(join(directory, "commands.log")), false);
});

test("required verification coverage cannot disappear from the profile", (t) => {
  const directory = fixture(t);
  const profiles = JSON.parse(readFileSync(join(directory, ".agents/verification.json"), "utf8"));
  profiles.ui = ["lint"];
  writeFileSync(join(directory, ".agents/verification.json"), JSON.stringify(profiles));
  assert.throws(() => expectedRails(directory), /Required verification coverage missing/);
});

test("unsupported role configuration is rejected rather than silently ignored", (t) => {
  const directory = fixture(t);
  const path = join(directory, ".agents/rails.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  manifest.roles[0].sandbox = "misspelled-config";
  writeFileSync(path, JSON.stringify(manifest));
  assert.throws(() => expectedRails(directory), /Unknown role adapter field/);
});
