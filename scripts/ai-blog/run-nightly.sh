#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
NODE_EXECUTABLE=${BLOG_NODE_EXECUTABLE:-/usr/local/bin/node}
CAFFEINATE_EXECUTABLE=${BLOG_CAFFEINATE_EXECUTABLE:-/usr/bin/caffeinate}
NIGHTLY_RUNNER="$PROJECT_ROOT/scripts/ai-blog/native-nightly.mjs"
REPORT_FILE="$PROJECT_ROOT/.ai-blog/nightly-state/report.json"

usage() {
  printf '%s\n' \
    'Usage:' \
    '  scripts/ai-blog/run-nightly.sh' \
    '  scripts/ai-blog/run-nightly.sh --dry-run' \
    '  scripts/ai-blog/run-nightly.sh --verify-report REPORT.json' >&2
}

verify_report() {
  report=$1
  if [ ! -f "$report" ]; then
    printf 'Nightly report does not exist: %s\n' "$report" >&2
    return 1
  fi

  "$NODE_EXECUTABLE" -e '
    const fs = require("node:fs");
    const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const text = report.text?.state ?? "missing";
    const deployment = report.deployment?.state ?? "missing";
    const audio = report.audio?.state ?? "missing";
    if (!["pushed", "already-pushed"].includes(text)) {
      console.error(`Text publication is incomplete: ${text}`);
      process.exit(1);
    }
    if (deployment !== "verified") {
      console.error(`Deployment verification is incomplete: ${deployment}`);
      process.exit(1);
    }
    process.stdout.write(`${JSON.stringify({ state: "ready", text, deployment, audio })}\n`);
  ' "$report"
}

case ${1-} in
  --dry-run)
    [ "$#" -eq 1 ] || { usage; exit 2; }
    printf '%s -is %s %s\n' "$CAFFEINATE_EXECUTABLE" "$NODE_EXECUTABLE" "$NIGHTLY_RUNNER"
    ;;
  --verify-report)
    [ "$#" -eq 2 ] || { usage; exit 2; }
    verify_report "$2"
    ;;
  '')
    [ "$#" -eq 0 ] || { usage; exit 2; }
    [ -x "$NODE_EXECUTABLE" ] || { printf 'Node executable is unavailable: %s\n' "$NODE_EXECUTABLE" >&2; exit 1; }
    [ -x "$CAFFEINATE_EXECUTABLE" ] || { printf 'caffeinate is unavailable: %s\n' "$CAFFEINATE_EXECUTABLE" >&2; exit 1; }
    cd "$PROJECT_ROOT"
    "$CAFFEINATE_EXECUTABLE" -is "$NODE_EXECUTABLE" "$NIGHTLY_RUNNER"
    verify_report "$REPORT_FILE"
    ;;
  *)
    usage
    exit 2
    ;;
esac
