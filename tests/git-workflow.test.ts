import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const execute = promisify(execFile);
const source = fileURLToPath(new URL("../", import.meta.url));

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "forge-git-workflow-"));
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = path.join(directory, "test-global-gitconfig");
  const git = async (...args: string[]) => (await execute("git", args, { cwd: directory, env })).stdout.trim();
  try {
    await writeFile(env.GIT_CONFIG_GLOBAL, "");
    await git("init", "-b", "main");
    await git("config", "user.name", "Workflow Test");
    await git("config", "user.email", "workflow@example.invalid");
    await git("config", "commit.gpgsign", "false");
    await git("config", "core.hooksPath", ".git/hooks");
    await writeFile(path.join(directory, "README.md"), "baseline\n");
    await git("add", "README.md");
    await git("commit", "-m", "Initial test fixture");
    await git("config", "--unset", "core.hooksPath");
    await mkdir(path.join(directory, ".githooks"));
    await mkdir(path.join(directory, "scripts"));
    await copyFile(path.join(source, ".githooks/pre-commit.sh"), path.join(directory, ".githooks/pre-commit.sh"));
    await writeFile(path.join(directory, ".gitignore"), "/.githooks/pre-commit\n");
    await copyFile(path.join(source, "scripts/setup-git-workflow.sh"), path.join(directory, "scripts/setup-git-workflow.sh"));
    const setup = () => execute("sh", ["scripts/setup-git-workflow.sh"], { cwd: directory, env });
    const change = async (text: string) => { await writeFile(path.join(directory, "README.md"), text); await git("add", "README.md"); };
    const clearChange = async () => { await git("restore", "--staged", "README.md"); await git("restore", "README.md"); };
    return { directory, git, setup, change, clearChange };
  } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
}

test("workflow setup preserves dirty files, creates branches, and supports repeat setup", async () => {
  const repo = await fixture();
  try {
    await writeFile(path.join(repo.directory, "README.md"), "unfinished setup work\n");
    await repo.setup();
    assert.equal(await repo.git("branch", "--show-current"), "chore/git-workflow");
    assert.equal(await repo.git("rev-parse", "develop"), await repo.git("rev-parse", "main"));
    assert.equal(await repo.git("config", "--local", "--get", "core.hooksPath"), ".githooks");
    assert.equal(await readFile(path.join(repo.directory, "README.md"), "utf8"), "unfinished setup work\n");
    await repo.setup();
    assert.equal(await repo.git("branch", "--show-current"), "chore/git-workflow");
  } finally { await rm(repo.directory, { recursive: true, force: true }); }
});

test("commit guard blocks protected, invalid and detached branches, allows task and merge commits", async () => {
  const repo = await fixture();
  try {
    await repo.setup();
    // Track only templates/configuration, exactly as a real repository does.
    // Main and develop remain at the baseline without those tracked files.
    await repo.git("add", ".gitignore", ".githooks/pre-commit.sh", "scripts/setup-git-workflow.sh");
    await repo.change("workflow change\n");
    await repo.git("commit", "-m", "chore: test workflow");
    for (const branch of ["main", "develop"]) {
      await repo.git("switch", branch);
      assert.ok((await readFile(path.join(repo.directory, ".githooks/pre-commit"), "utf8")).includes("Commit blocked"), "Installed hook survives switching to branches without its template");
      const before = await repo.git("rev-parse", "HEAD");
      await repo.change("must not commit here\n");
      await assert.rejects(() => repo.git("commit", "-m", "Attempt direct commit"), /Commit blocked/);
      assert.equal(await repo.git("rev-parse", "HEAD"), before);
      await repo.clearChange();
    }
    for (const branch of ["feature/image-resize", "fix/download-error", "hotfix/output-permission"]) {
      await repo.git("switch", "-c", branch, branch.startsWith("hotfix/") ? "main" : "develop");
      await repo.change(`${branch}\n`);
      await repo.git("commit", "-m", "test: verify allowed task branch");
    }
    await repo.git("switch", "main");
    await repo.git("merge", "--no-commit", "--no-ff", "chore/git-workflow");
    await repo.git("commit", "-m", "Merge verified workflow change");
    assert.equal((await repo.git("rev-list", "--parents", "-n", "1", "HEAD")).split(" ").length, 3);
    await repo.git("switch", "-c", "random-work");
    await repo.change("invalid branch\n");
    await assert.rejects(() => repo.git("commit", "-m", "Attempt invalid branch commit"), /Commit blocked/);
    await repo.clearChange();
    await repo.git("switch", "--detach");
    await repo.change("detached work\n");
    await assert.rejects(() => repo.git("commit", "-m", "Attempt detached commit"), /Commit blocked/);
  } finally { await rm(repo.directory, { recursive: true, force: true }); }
});

test("setup refuses to replace an existing different hooks configuration", async () => {
  const repo = await fixture();
  try {
    await repo.git("config", "core.hooksPath", "custom-hooks");
    await assert.rejects(repo.setup, /already configured/);
    assert.equal(await repo.git("config", "core.hooksPath"), "custom-hooks");
    assert.equal(await repo.git("branch", "--show-current"), "main");
    await assert.rejects(() => repo.git("show-ref", "--verify", "refs/heads/develop"));
  } finally { await rm(repo.directory, { recursive: true, force: true }); }
});
