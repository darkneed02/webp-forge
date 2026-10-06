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
