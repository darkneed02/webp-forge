#!/bin/sh
set -eu

branch=$(git symbolic-ref --quiet --short HEAD) || {
  echo "Commit blocked: check out a named task branch first." >&2
  exit 1
}

case "$branch" in
  main|develop)
    if git rev-parse --quiet --verify MERGE_HEAD >/dev/null 2>&1; then
      exit 0
    fi
    echo "Commit blocked: $branch accepts reviewed merges, not direct commits." >&2
    echo "Start a feature/<slug>, fix/<slug>, hotfix/<slug>, or chore/<slug> branch." >&2
    exit 1
    ;;
esac

if ! printf '%s\n' "$branch" | LC_ALL=C grep -Eq '^(feature|fix|hotfix|chore)/[a-z0-9]+(-[a-z0-9]+)*$'; then
  echo "Commit blocked: use a lowercase branch such as feature/image-resize or fix/download-error." >&2
  exit 1
fi
