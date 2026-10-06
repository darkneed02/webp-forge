# Contributing to WebP Forge

## Branch roles

| Branch | Purpose | Start from | Merge into |
| --- | --- | --- | --- |
| `main` | Stable, release-ready application | — | — |
| `develop` | Integration and acceptance testing | `main` initially | `main` for an authorized release |
| `feature/<slug>` | One new feature: `feature/image-resize` | `develop` | `develop` |
| `fix/<slug>` | One normal bug fix: `fix/single-image-download` | `develop` | `develop` |
| `hotfix/<slug>` | Urgent fix to a released version | `main` | `main`, then back into `develop` |
| `chore/<slug>` | Documentation, tooling, or maintenance | `develop` | `develop` |

Use lowercase kebab-case slugs. `develop` is the shared testing branch; no additional permanent `test` branch is needed. Test each task branch before integration and the combined application before release.

## One-time setup

Run in Terminal or Git Bash:

```bash
npm run git:setup
```

This creates `develop` from `main` if needed, checks out `chore/git-workflow` when starting on a protected branch, and enables `.githooks`. The repository contains `.githooks/pre-commit.sh`; setup copies it to the ignored local `.githooks/pre-commit` so branch switches cannot remove the installed guard. Existing working files are preserved. Setup does not commit, merge, tag, push, or connect a remote. It refuses to replace a different existing `core.hooksPath` setting. Each new clone must run setup once, and rerun it after changes to the hook template.

If an agent sandbox cannot write `.git`, run setup in your own Terminal. Until setup succeeds, the branch structure and local commit guard are not active.

## Before every new feature or bug fix

1. Read this guide and inspect `git status --short --branch`.
2. Finish or isolate unrelated changes; never discard another task's work to obtain a clean checkout.
3. Create a separate task branch from the correct base before implementation. Related follow-up work stays on its task branch; independent work gets a new branch.

```bash
git switch develop
git switch -c feature/image-resize
# Or: git switch -c fix/single-image-download
```

When a remote exists, fetch and fast-forward the clean base before branching. Do not overwrite local commits or force-push to resolve divergence. Do not implement features directly on `main` or `develop`. If branch creation is blocked, report the blocker before beginning implementation on a protected branch.

## Verify and commit

For application changes, run:

```bash
npm run typecheck
npm run lint
npm test
TEST_IN_PROCESS=1 npm run test:integration
npm run build
```

Conversion, upload, download, environment, and Docker changes also need live HTTP/Docker acceptance checks. UI changes need browser checks in relevant themes and screen sizes. Documentation-only changes need command/link review; hook changes need guard behavior checks. Record unavailable checks in `VALIDATION.md`; blocked checks do not count as passes.

Stage only task files, inspect `git diff --cached --check` and `git diff --cached`, and make a focused commit once the requested work and available checks are finished. Preserve unrelated changes. Use descriptive prefixes:

- `feat: add image resize options`
- `fix: download a single result as WebP`
- `chore: configure Git workflow`
- `docs: explain host folder setup`
- `test: cover transparent PNG conversion`
- `refactor: simplify conversion validation`

If Git write access is blocked, report uncommitted changes and remaining commands. Never claim that a branch or commit exists without verifying it.

## Integration and release

Integrate checked task branches into `develop` through reviewed pull requests, or local merges when the user authorizes integration:

```bash
git switch develop
git merge --no-ff feature/image-resize
```

Resolve conflicts deliberately and repeat checks affected by integration. Keep task branches until merged; do not integrate unfinished work.

Promote `develop` to `main` only for an explicitly requested release after required tests pass. Carry released hotfixes back into `develop`. Agents must not automatically merge into protected branches, push, connect a remote, tag releases, delete branches, or rewrite history without the user's instruction for that action.

## Release versions

Versions identify releases, not every branch or commit. From `1.0.0`, a compatible fix becomes `1.0.1`, a compatible feature becomes `1.1.0`, and a breaking change becomes `2.0.0`.

Prepare authorized releases on a task branch with `npm version patch --no-git-tag-version` (or `minor` / `major`) to update both package files. After verification and merging into `main`, create an annotated tag such as `git tag -a v1.1.0 -m "Release v1.1.0"`. Do not tag the existing baseline merely to initialize this workflow: its Docker/browser validation remains incomplete.

## Commit guard and future remote protection

The pre-commit hook blocks direct commits on `main`/`develop`, detached HEAD commits, and invalid task branch names. It permits merge commits on protected branches. Use reviewed `--no-ff` merges; the hook is a guardrail, not a substitute for tests and review.

After a remote is connected, configure server-side protection for `main` and `develop`: reviewed pull requests, successful checks, and no force-push or branch deletion. No remote protection has been configured yet.
