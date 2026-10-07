# Repository Guidelines

## Project Structure & Module Organization

WebP Forge uses Next.js App Router, strict TypeScript, Tailwind CSS, owned UI primitives, and server-side Sharp. `app/` contains pages and API routes; `components/` contains reusable UI; `lib/` contains configuration, conversion, queue, and filesystem logic. Tests live in `tests/`, public assets in `public/`, and local runtime files in `data/`. Keep the single-container architecture without a database.

## Build, Test, and Development Commands

Use `npm ci`, `npm run dev`, and `docker compose up -d --build` for installation, local development, and Docker startup. Validate application changes with `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Run `TEST_IN_PROCESS=1 npm run test:integration` for route/Sharp checks; it does not verify Docker or HTTP. See `README.md` for browser and live-server tests.

## Coding Style & Naming Conventions

Use two-space indentation, descriptive names, and strict types. Components use kebab-case filenames. Follow ESLint's Next.js/TypeScript rules and existing styles. Keep processing on the server and preserve shared concurrency limits, validation, and cleanup.

## Testing Guidelines

Node's test runner covers `tests/*.test.ts`; integration fixtures exercise Sharp and storage; Playwright covers UI. Test changed behavior and relevant edge cases. Record blocked checks in `VALIDATION.md`; do not count them as passes or release with required checks outstanding.

## Version Control Workflow

Read `CONTRIBUTING.md` before every new task. Inspect Git status and preserve unrelated changes. Create `feature/<slug>` or `fix/<slug>` from `develop` before implementing independent features or bug fixes. Use `chore/<slug>` for maintenance and `hotfix/<slug>` from `main` for urgent released bugs. Related follow-ups remain on their task branch.

`main` is stable; `develop` integrates tested changes. Never implement directly on either. If Git permissions block branch creation, report it before starting implementation. Verify branches and commits before claiming they exist. Do not automatically push, merge protected branches, tag releases, delete branches, or rewrite history without the user's instruction.

## Commit & Pull Request Guidelines

Commit completed, checked task changes with prefixes such as `feat:`, `fix:`, or `chore:`. Review staged changes and keep unrelated work out. Pull requests target `develop` and explain behavior, verification, issues, and screenshots for UI changes. Version bumps and annotated release tags follow `CONTRIBUTING.md`.

## Security & Configuration

Keep secrets, runtime images, dependencies, and build output out of Git. Commit sanitized `.env.example`, the npm lockfile, and runtime directory placeholders. Follow `.gitignore` and `README.md`.
