# Repository Guidelines

## Project Structure & Module Organization

This workspace is currently empty apart from this guide. No source code, assets, tests, or dependency manifests have been added, and Git has not been initialized. Do not assume a language, framework, or existing application architecture.

When adding the initial implementation, use a clear layout appropriate to the selected stack. Suggested directories are `src/` for application code, `tests/` for automated tests, `assets/` for static resources, and `docs/` for supporting documentation. Document the actual layout in `README.md` once established.

## Build, Test, and Development Commands

There are currently no configured build, test, or development commands. Add reproducible commands with the initial toolchain and describe them in `README.md`, including prerequisites and expected outputs.

Prefer project scripts over undocumented global tools. Only document commands such as `npm test` or `make build` after their corresponding configuration exists.

## Coding Style & Naming Conventions

No formatting or linting rules are configured yet. Follow the selected language’s standard conventions and add a shared formatter or linter configuration when introducing code. Keep indentation consistent within each file and use descriptive names for modules, functions, and variables. Avoid unrelated formatting changes.

## Testing Guidelines

No test framework or coverage threshold has been established. Introduce tests alongside meaningful behavior, covering normal operation, invalid input, and relevant edge cases. Use the framework’s conventional test filenames and document how to run the suite. Tests should be repeatable and should not depend on private credentials or production services.

## Commit & Pull Request Guidelines

There is no Git history from which to infer commit conventions. Once version control is initialized, use concise, imperative commit subjects, for example `Add image conversion module`. Keep commits focused.

Pull requests should explain the problem, changes, and verification performed. Link relevant issues and include screenshots for visible interface changes. Explicitly identify checks that could not be run.

## Security & Configuration

Never commit secrets or local credentials. When environment configuration is introduced, provide a sanitized example file and ignore local configuration, generated output, and installed dependencies.
