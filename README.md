# WebP Forge

Fast batch image conversion for the web. A local Next.js application that converts JPG, JPEG, and PNG images to WebP with Sharp. One container, no database, no cloud services.

## Features

- Drag and drop or select multiple images; preview, remove, and clear selections.
- Automatic light/dark appearance follows your system theme, including live changes, text, controls, statuses, and transparency previews.
- Small (60), Balanced (80), High (90), Lossless, and Custom (1–100) quality.
- A bounded conversion queue shared across requests; four concurrent conversions by default.
- Per-image status, progress, understandable errors, size comparisons, and total storage savings.
- Automatic filesystem output, collision-safe names, individual downloads, and streamed ZIP downloads containing only successful images from the selected batch.
- The results download button saves a `.webp` directly when one image succeeds, or one ZIP when multiple images succeed.
- PNG transparency, automatic EXIF orientation, and metadata removal.
- Optional batch resizing by maximum width, height, or both, preserving proportions without cropping or enlargement. Results show original and output dimensions.
- Validated file extension, MIME type, decoded image format, file count, upload byte count, and a 40-megapixel decoded image limit. Animated PNG is rejected in V1.

## Requirements

For Docker: Docker Desktop on macOS/Windows, or Docker Engine with the Compose plugin on Linux. Allow several GB of free disk space for the image build and converted files.

For development: Node.js 22 LTS, npm, and Git. Use Terminal or Git Bash for the Git workflow setup and checks. Sharp runs on the server; the browser does not perform conversion. Platform-specific native Sharp dependencies are installed by npm.

## Quick start with Docker

```bash
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000). Compose creates `./output` and mounts it at `/app/data/output`. Files remain there when the container stops or is rebuilt. The port is bound to localhost by default.

The entrypoint prepares the output and temporary directory roots as root, then runs Node as the unprivileged `node` user (UID 1000). It does not recursively change existing file ownership. Temporary uploads use a 4 GB tmpfs mount and are deleted after each conversion, including failures. Abandoned application uploads are removed at startup.

## Configure the host output folder

Create `.env` beside `docker-compose.yml`, optionally starting from `.env.example`. Set `HOST_OUTPUT_DIR` to the desired **host** directory; `OUTPUT_DIR` denotes the directory **inside** the container. Compose fixes the container path at `/app/data/output`.

Examples for `.env`:

| System | Host folder setting |
| --- | --- |
| macOS | `HOST_OUTPUT_DIR=/Users/yourname/Pictures/WebP` |
| Linux | `HOST_OUTPUT_DIR=/home/yourname/Pictures/WebP` |
| Windows Docker Desktop | `HOST_OUTPUT_DIR=C:/Users/YourName/Pictures/WebP` |
| Windows WSL | `HOST_OUTPUT_DIR=/mnt/c/Users/YourName/Pictures/WebP` |
| Relative directory | `HOST_OUTPUT_DIR=./output` |

Create custom folders first and allow Docker Desktop to access them. Paths containing spaces can be quoted in `.env`, e.g. `HOST_OUTPUT_DIR="C:/Users/YourName/My Pictures/WebP"`. Recreate the container after changes:

```bash
docker compose up -d --force-recreate
```

Alternatively change the bind mount's `source` directly in Compose. If running the image without Compose, mount your host directory at `/app/data/output` and supply `OUTPUT_DIR` and `UPLOAD_DIR` as needed. Do not share the upload directory between separate app instances.

## Environment variables

Values are validated when the Node application starts. Invalid integers, empty paths, identical upload/output directories, or inaccessible directories prevent startup.

| Variable | Default | Allowed values / purpose |
| --- | --- | --- |
| `OUTPUT_DIR` | `/app/data/output` in Docker; `data/output` locally | Output filesystem directory |
| `UPLOAD_DIR` | `/app/data/uploads` in Docker; `data/uploads` locally | Temporary upload directory |
| `WEBP_QUALITY` | `80` | Integer 1–100; initial UI quality |
| `MAX_UPLOAD_MB` | `30` | Integer 1–500; binary MB per image |
| `MAX_FILES` | `100` | Integer 1–1000 per batch |
| `CONVERSION_CONCURRENCY` | `4` | Integer 1–32; global queue limit |
| `HOST_OUTPUT_DIR` | `./output` | Compose host bind mount source |
| `HOST_PORT` | `3000` | Compose host listening port |

`WEBP_QUALITY` supplies the initial setting; users can choose another quality in the UI. Raising concurrency increases memory use. The pixel limit protects against very large decoded images independently of the upload byte limit.

## Local development

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without an environment file, output and temporary uploads use `data/output` and `data/uploads` in this repository.

To customize local settings, copy `.env.example` to `.env.local`, and change its directory entries:

```env
OUTPUT_DIR=./data/output
UPLOAD_DIR=./data/uploads
```

On PowerShell, use `Copy-Item .env.example .env.local`; on macOS/Linux, use `cp .env.example .env.local`. Next.js loads `.env.local`. Keep it out of version control. If you already created a Docker `.env`, use `.env.local` to override its container paths for local development.

## Build and validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

`typecheck` checks strict TypeScript; `lint` runs ESLint with Next.js rules; `test` covers queue recovery, concurrency, filename reservations, sanitization, and batch validation. `build` creates the production Next.js standalone output. `start` serves the production build.

With the application running, execute the API acceptance tests:

```bash
npm run test:integration
```

These tests assume the default upload and batch limits. They generate fixtures, verify JPEG and transparent PNG conversion, a 100-image batch, conflicts, downloads, ZIP contents, invalid inputs, and filesystem output. They delete only their own generated output files. For a Docker instance on macOS/Linux:

```bash
TEST_OUTPUT_DIR=./output npm run test:integration
```

On PowerShell: `$env:TEST_OUTPUT_DIR='./output'; npm run test:integration`. Use the actual host directory if customized. `TEST_BASE_URL` changes the target URL, and `TEST_UPLOAD_DIR` changes the temporary directory checked by local tests. Docker's tmpfs is internal; inspect cleanup separately with `docker compose exec webp-forge sh -c 'ls -la /app/data/uploads'`.

The same API test can run directly against route handlers without opening sockets:

```bash
TEST_IN_PROCESS=1 npm run test:integration
```

This mode checks conversion and filesystem behavior but does not verify the HTTP server, Docker, or a bind mount. It uses the application defaults unless `OUTPUT_DIR`/`UPLOAD_DIR` are explicitly supplied; unlike Next.js, the test runner does not load `.env.local`.

For browser acceptance testing, start the app and run:

```bash
npx playwright install chromium
npm run test:browser
```

The browser test checks selection, previews, quality controls, conversion, downloads, error handling, and responsive layout, and saves screenshots in `test-results/`. There is no fixed coverage percentage requirement.

## Docker commands

```bash
docker compose build                  # Build the production image
docker compose up -d                  # Start in the background
docker compose ps                     # Check service and health status
docker compose logs -f webp-forge      # Follow application logs
docker compose restart webp-forge      # Restart; download sessions reset
docker compose down                   # Stop; host output files remain
docker compose config --quiet         # Validate Compose configuration
```

The image uses a multi-stage Debian-based Node build, installs Sharp's Linux binaries inside Docker, and checks `/api/health` for readable/writable storage. Do not copy host `node_modules` into the image.

## Resize images

Enable **Resize images** under **Image dimensions**, then enter a maximum width and/or height in pixels (whole numbers from 1 to 16383). Leave one field empty to calculate it from the image's proportions. For example, a 2400 × 1600 image with width `1200` becomes 1200 × 800; a `1200` × `600` bounding box produces 900 × 600. Smaller images keep their dimensions. These settings apply to every image in the next batch and work with all quality presets, including lossless WebP encoding; resizing itself changes pixels.

Resize is off by default. Outputs keep PNG transparency and automatic orientation, and use the same collision-safe filenames, output folder, individual WebP downloads, and multi-image ZIP. Each completed row reports actual original and output pixel dimensions. The implementation uses Sharp's [`inside` fit and `withoutEnlargement`](https://sharp.pixelplumbing.com/api-resize/).

## Architecture and behavior

```text
Browser → Next.js route handlers → bounded queue → Sharp → host-mounted output
```

The browser registers a batch manifest, then sends each image as a separate streamed request. Uploads stream to temporary files within the same queue, avoiding a full 100-file multipart buffer. Sharp writes the converted image to an atomically reserved filename. `product.jpg` becomes `product.webp`, then `product-1.webp` if that name already exists. Filenames use ASCII letters, numbers, hyphens, and underscores; unsafe path components and reserved device names are removed.

Download links identify an in-memory batch and file, never an arbitrary filesystem path. Sessions expire after 24 hours, and at most 100 recent batches are retained. Restarting the container clears sessions, but saved output files remain accessible on the host. There is no conversion history or automatic deletion of output files. Run one Node process/container; the registry and queue are deliberately process-local.

Savings compare successfully converted inputs with their outputs; failed images are excluded. WebP can be larger for small images or lossless output, in which case the UI reports a storage increase. ZIP files stream without permanent archives; already-compressed WebP entries are stored without recompression. Browser downloads use a temporary Blob, so very large downloads also require browser memory.

## Troubleshooting

- **Port already in use:** set `HOST_PORT=3001` in `.env`, recreate the container, and open `http://localhost:3001`.
- **Permission denied on output:** verify that the host folder is writable and shared with Docker Desktop. On Linux, the container's Node UID is 1000. For restrictive NAS/root-squashed mounts, set appropriate ownership or ACLs yourself and run the container with a matching `user` after preparing both directories. Do not grant world-writable permissions as a blanket fix.
- **Application fails at startup:** check `docker compose logs webp-forge` for invalid environment settings or inaccessible storage. Missing directories are created automatically where permissions allow.
- **Sharp installation fails:** use supported Node 22 and install dependencies on the target platform. For Docker, rebuild without host dependencies: `docker compose build --no-cache`.
- **Image fails to convert:** check its extension, actual format, 30 MB default size limit, and 40-megapixel decoded limit. Corrupted images and animated PNG files are rejected; other images in the batch continue.
- **Disk or temporary space is full:** free host output space, lower concurrency, or increase the tmpfs size in Compose when raising upload limits.
- **ZIP or download fails:** ensure the host output files still exist. Retry the download after transient failures. If the app restarted or the session expired, retrieve files from the host folder or convert again.
- **Local development tries to write `/app`:** override Docker environment paths in `.env.local` with repository-relative paths.

## What belongs in Git

Branch, commit, testing, and release rules are in [CONTRIBUTING.md](CONTRIBUTING.md). Start each independent feature or bug fix on a separate task branch. `main` is stable; `develop` is for integration/testing. Run `npm run git:setup` once per clone to create the local branch structure and enable the commit guard.

Commit the hook template `.githooks/pre-commit.sh`. The installed `.githooks/pre-commit` is generated locally and ignored, allowing it to keep working across branch switches.

| Include in the repository | Keep local; excluded by `.gitignore` |
| --- | --- |
| Application source: `app/`, `components/`, `lib/`, `instrumentation.ts` | Installed dependencies: `node_modules/` |
| Automated tests: `tests/` | Screenshots and reports: `test-results/`, `playwright-report/`, `coverage/` |
| Public application assets: `public/` | Uploaded and converted images: `data/`, `output/`, `uploads/` |
| `package.json` and **`package-lock.json`** | Generated builds and types: `.next/`, `out/`, `dist/`, `build/`, `next-env.d.ts`, `*.tsbuildinfo` |
| TypeScript, Next.js, Tailwind/PostCSS, ESLint, and shadcn configuration | Private `.env` files, including `.env.local` and `.env.production` |
| Dockerfile, Compose, entrypoint, `.dockerignore`, `.gitignore` | Logs, caches, editor settings, and operating system files |
| Sanitized `.env.example` | Actual personal paths, credentials, and runtime configuration values in local environment files |
| README, contributor guidance, third-party notices, validation notes | Temporary files created while running or testing the app |
| `data/output/.gitkeep` and `data/uploads/.gitkeep` | Everything else inside those runtime directories |

Keep the npm lockfile so collaborators and Docker use the same dependency versions. Application assets and intentional test fixtures can be committed; image extensions are **not** globally ignored. Keep private images in the runtime folders above. If a custom host output directory is inside the repository, add its exact directory to `.gitignore` too, or place it outside the repository.

Review inclusion before committing:

```bash
git status --short                     # Pending repository changes
git status --ignored --short           # Include ignored local files
git ls-files -ci --exclude-standard    # Tracked files now matching ignore rules
```

Ignore rules do not remove files that were already tracked. For the generated Next.js type declaration, stop tracking it while retaining the local file:

```bash
git rm --cached -- next-env.d.ts
```

Next.js regenerates that file when development or a build starts. Do not use force-add for private environment files or runtime images.

## Project structure

```text
app/                  App Router page, layout, styles, and API routes
  api/batches/        Register validated batch manifests
  api/convert/        Stream uploads and convert individual files
  api/download/       Stream a completed image
  api/zip/            Dynamically stream successful batch outputs
  api/health/         Check storage availability
components/           Reusable upload, queue, settings, progress, results UI
  ui/                 Locally owned, adapted shadcn/ui primitives
lib/                  Config, queue, conversion, storage, validation, types
tests/                Unit, API acceptance, and browser tests
data/                 Local development output and temporary uploads
public/               Favicon
Dockerfile            Multi-stage production build
docker-compose.yml    Local port, host mount, environment, temporary storage
```

Future output formats and other transformations can extend `lib/converter.ts` and the typed conversion options without changing upload, queue, or download responsibilities. Batch resizing is available; other future transformations are not implemented.

Framework references: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Sharp WebP output](https://sharp.pixelplumbing.com/api-output/#webp), and [shadcn/ui](https://ui.shadcn.com/docs).
