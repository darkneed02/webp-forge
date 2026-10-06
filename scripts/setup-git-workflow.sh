#!/bin/sh
set -eu

root=$(git rev-parse --show-toplevel) || exit 1
cd "$root"

git show-ref --verify --quiet refs/heads/main || {
  echo "Setup requires an existing main branch with an initial commit." >&2
  exit 1
}

hook_path=$(git config --get core.hooksPath || true)
if [ -n "$hook_path" ] && [ "$hook_path" != ".githooks" ]; then
  echo "Setup stopped: core.hooksPath is already configured as $hook_path." >&2
  exit 1
fi

branch=$(git symbolic-ref --quiet --short HEAD) || {
  echo "Setup requires a named branch; detached HEAD is not supported." >&2
  exit 1
}

if ! git show-ref --verify --quiet refs/heads/develop; then
  git branch develop main
fi

case "$branch" in
  main|develop)
    if git show-ref --verify --quiet refs/heads/chore/git-workflow; then
      git switch chore/git-workflow
    else
      git switch -c chore/git-workflow develop
    fi
    ;;
esac

chmod +x .githooks/pre-commit
git config --local core.hooksPath .githooks
echo "Git workflow enabled. Current branch: $(git branch --show-current)"
echo "No commits, merges, tags, remote connections, or pushes were made."
