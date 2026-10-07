# Validation record

Checked in this workspace on 2026-10-06.

Re-run at the user's request on 2026-10-06: TypeScript, lint, all six unit tests, the in-process API acceptance suite (including 100 images), and the production build passed again. Compose configuration and entrypoint syntax also passed. Docker startup was retried and denied access to the daemon socket; `npm start -- --hostname 127.0.0.1` was retried and failed to bind port 3000 with `EPERM`. No live server was left running, and browser tests could not proceed without one.

## Passed

- Dependency installation from an available npm cache; lockfile includes Linux Sharp dependencies.
- `npm run typecheck`: strict TypeScript checks.
- `npm run lint`: Next.js and TypeScript ESLint rules.
- `npm test`: global queue concurrency and recovery, 100 queued tasks, filename sanitization, atomic conflicts, and batch validation.
- `npm run build`: optimized Next.js production build.
- `TEST_IN_PROCESS=1 npm run test:integration`: actual route handlers, Sharp, and filesystem output. Covers JPEG, PNG alpha preservation, lossless mode, 100-image batch, corrupted and spoofed images, MIME/size rejection, conflict handling without overwrite, individual downloads, ZIP contents and failed-file exclusion, cross-site rejection, and temporary cleanup.
- `docker compose config --quiet`: Compose configuration syntax.
- `bash -n docker-entrypoint.sh`: entrypoint syntax.

## Blocked by execution permissions

- `docker build -t webp-forge:local .` and `docker compose up -d --build`: access to the Docker daemon socket is denied.
- `npm run dev`: listening on `127.0.0.1:3000` is denied (`EPERM`).
- Browser acceptance: launching Chromium is denied by the macOS sandbox. The browser tool also rejects local `file:` URLs, so the static render could not be visually inspected.

Consequently, this record does **not** certify Docker image execution, Compose startup, live HTTP behavior, browser interaction, or files appearing through a Docker bind mount. API tests here used the local filesystem, not a Docker mount.

## System theme and adaptive downloads update

Checked on 2026-10-06 after introducing system light/dark themes and direct single-image downloads:

- TypeScript, lint, six unit tests, in-process API acceptance, and the updated production build passed.
- Server-rendered result controls and their callbacks were checked for one successful image (WebP), multiple successful images (ZIP), a mixed batch with one success (WebP), and no successful images (disabled).
- Calculated palette contrast passed 4.5:1 for sampled body, card, secondary text, button, success, error, and warning pairs in both themes. This checks the defined colors, not a browser screenshot.
- Browser acceptance now covers system theme changes without losing selections, contrast, mobile layouts, and adaptive downloads. Running it was attempted; Chromium launch was denied by the sandbox before those browser checks could execute.

## Git workflow update

Checked on 2026-10-06:

- Shell syntax checks, TypeScript, lint, and all nine unit tests passed.
- Three Git workflow tests use isolated disposable repositories. They verify setup with existing working changes, idempotence, task branch commits, rejection of direct `main`/`develop` commits, invalid names and detached HEAD, merge commits, and preservation of an existing different hook configuration.
- The actual repository setup was attempted using `npm run git:setup`. Creating `develop` failed because writing `.git/refs/heads/develop.lock` is denied. The actual repository still has only `main`; the new workflow files are uncommitted and `core.hooksPath` is not enabled here.
- Run `npm run git:setup` from an unrestricted Terminal to activate the workflow for this repository. No release tag, remote connection, merge, or push was made.
- Follow-up verification after the user ran setup: `main`, `develop`, and `chore/git-workflow` now exist, the active branch is `chore/git-workflow`, and local `core.hooksPath` is `.githooks`. Both shell files are executable and the pre-commit guard accepts this task branch. The setup's earlier permission failure is resolved by the user's Terminal run; workflow changes are still pending commit at this verification point.
- The initial workflow and tracking changes were then committed as `107fdfd`. Verification found that the installed hook must remain local rather than tracked: setup now installs it from `.githooks/pre-commit.sh`, while `.githooks/pre-commit` is ignored. The nine tests passed again, including switching to baseline `main`/`develop` branches that do not contain the tracked template and verifying that their direct commits are still blocked.

## Image resize feature

Implemented on `feature/image-resize` on 2026-10-06; resize is optional and disabled by default.

- Strict TypeScript, ESLint, all ten unit tests, and the production Next.js build passed.
- In-process route/Sharp acceptance passed: width-only, height-only, bounding-box fit, no enlargement, original dimensions when disabled, EXIF orientation, PNG transparency in lossy/lossless modes, a 100-image resized batch, conflict-safe output, individual downloads, exact ZIP contents, invalid resize rejection, and temporary cleanup.
- Browser acceptance was expanded to cover resize enable/disable, missing dimensions, persistence across quality/theme changes, actual downloaded dimensions, readable fields in both themes, and mobile layout. Execution was attempted but Chromium launch failed with macOS `bootstrap_check_in` permission denied; no browser assertions ran.
- A production HTTP server on `127.0.0.1:3001` was attempted but denied with `EPERM`. Live HTTP checks of this feature remain outstanding.
- `docker compose build` was attempted but denied while writing Docker Buildx's activity file under `~/.docker/buildx/activity`. `docker compose ps` could read the daemon and reported the existing container healthy; that container predates this feature, so this is not verification of the new Docker image or resize through a bind mount. Rebuild from an unrestricted Terminal using the commands below before testing the feature at localhost.
- No protected branch merge, release version bump, tag, or push was performed.

## Tool selection and original-format resize flow

Checked on `feature/image-resize` on 2026-10-06:

- TypeScript, ESLint, all 15 unit tests, and the production Next.js build passed. Build output includes `/`, `/resize`, and `/convert`.
- Server-rendered checks verify the two tool links, direct downloads with actual JPG/JPEG/PNG/WebP labels even after partial failure, mixed-format ZIP controls, and disabled downloads without successful outputs. These do not replace browser interaction checks.
- In-process API acceptance passed for original-format JPG/JPEG/PNG resizing, actual decoded output format/dimensions, PNG alpha, correct download Content-Type, mixed-format ZIP bytes, conflict handling without overwrite, resize-to-WebP, unchanged default WebP conversion, invalid output format rejection, the 100-image resized WebP batch, and upload cleanup.
- Browser tests now navigate from the chooser through both tools, verify original-format defaults and downloads, and resize to WebP. Attempting execution still failed at Chromium launch with macOS `bootstrap_check_in` permission denied. Browser interaction, screenshots, and theme/mobile checks remain unverified.
- `docker compose build` again failed on a denied Buildx activity-file write, and production HTTP startup on port 3001 again failed with `EPERM`. The new flow has not been verified in a newly built Docker container or through its host bind mount.
- This is a related follow-up on the existing resize feature branch. No protected branch merge, release version bump, tag, or push was performed.

## Per-image and percentage resize settings

Checked on `feature/image-resize` on 2026-10-06 as a related resize follow-up:

- Strict TypeScript, ESLint, all 18 unit tests, and the production Next.js build passed.
- Unit checks cover percentage validation, mutual exclusion of pixel/percentage values, rounding and the 1 px minimum, batch fallback vs individual overrides, manifest snapshots, and separate DOM IDs/values for each image editor.
- In-process route/Sharp acceptance passed for mixed per-image width/height/percentage settings with Original and WebP output, all 20–80% presets plus 100%, EXIF orientation, tiny images, PNG alpha, ZIP bytes, download MIME, invalid individual settings, and a 100-image batch mixing batch defaults with individual percentages. Upload cleanup and filename conflict checks also passed.
- Browser acceptance now covers editing individual sizes, invalid percentages, presets, switching scopes while retaining individual settings, shared 50% output, individual output, and theme changes. Chromium launch was attempted and denied by macOS `bootstrap_check_in`; these interaction and screenshot checks did not run.
- Docker rebuild was attempted and denied while updating the Buildx activity file. HTTP startup on `127.0.0.1:3001` was attempted and denied with `EPERM`. Live HTTP, current Docker image execution/bind-mount output, and browser acceptance remain outstanding; in-process checks do not certify them.
- No protected branch merge, version bump, release tag, or push was performed.

## Remaining acceptance checks

On a machine/session with Docker and browser access:

```bash
docker compose up -d --build
docker compose ps
TEST_OUTPUT_DIR=./output npm run test:integration
docker compose exec webp-forge sh -c 'ls -la /app/data/uploads'
npx playwright install chromium
TEST_OUTPUT_DIR=./output npm run test:browser
```

Use the configured host output path and `TEST_BASE_URL` if different from the defaults. The tests create their own fixtures and remove their own generated outputs after verification.
