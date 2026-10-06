#!/bin/sh
set -eu
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$OUTPUT_DIR" "$UPLOAD_DIR"
  # Change ownership of the mount roots only; leave existing output files alone.
  chown node:node "$OUTPUT_DIR" "$UPLOAD_DIR"
  chmod u+rwx "$OUTPUT_DIR" "$UPLOAD_DIR"
  exec gosu node "$@"
fi
exec "$@"
