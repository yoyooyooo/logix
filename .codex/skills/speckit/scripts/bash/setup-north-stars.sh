#!/usr/bin/env bash

set -euo pipefail

JSON_MODE=false
SYNC=false
FORCE_OVERWRITE=false
REPO_ROOT_OVERRIDE=""

usage() {
  cat << 'EOF'
Usage:
  setup-north-stars.sh [--json] [--sync] [--force] [--repo-root <path>]

Options:
  --json               Output machine JSON
  --sync               Sync GENERATED block from docs/ssot/platform/foundation/04-north-stars.md
  --force              Overwrite existing file (destructive) OR rewrite when markers missing
  --repo-root <path>   Override repo root detection
  --help, -h           Show help

Notes:
  - Default is non-destructive: create file only if missing/empty.
  - Sync updates only the GENERATED block between markers.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_MODE=true
      shift
      ;;
    --sync)
      SYNC=true
      shift
      ;;
    --force)
      FORCE_OVERWRITE=true
      shift
      ;;
    --repo-root)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --repo-root requires a value." >&2
        exit 1
      fi
      REPO_ROOT_OVERRIDE="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --*)
      echo "ERROR: Unknown option '$1'. Use --help for usage information." >&2
      exit 1
      ;;
    *)
      echo "ERROR: Unknown argument '$1'. Use --help for usage information." >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(CDPATH="" cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/common.sh"

REPO_ROOT="${REPO_ROOT_OVERRIDE:-$(get_repo_root)}"
MEMORY_DIR="$REPO_ROOT/.specify/memory"
TARGET="$MEMORY_DIR/north-stars.md"
SOURCE_OF_TRUTH="$REPO_ROOT/docs/ssot/platform/foundation/04-north-stars.md"
TEMPLATE="$SKILL_DIR/assets/templates/north-stars-template.md"

mkdir -p "$MEMORY_DIR"

CREATED=false
UPDATED=false
NOOP=false
ERROR=""

emit_json() {
  local mode="$1"
  local created="$2"
  local updated="$3"
  local noop="$4"
  local error="$5"

  local error_json
  error_json="$(python3 - "$error" <<'PY'
import json
import sys

print(json.dumps(sys.argv[1]))
PY
)"

  printf '{"mode":"%s","repoRoot":"%s","northStarsFile":"%s","sourceOfTruth":"%s","created":%s,"updated":%s,"noop":%s,"error":%s}\n' \
    "$mode" "$REPO_ROOT" "$TARGET" "$SOURCE_OF_TRUTH" \
    "$created" "$updated" "$noop" \
    "$error_json"
}

generate_block() {
  python3 - "$SOURCE_OF_TRUTH" <<'PY'
import re
import sys
from pathlib import Path

src_path = Path(sys.argv[1])
if not src_path.exists():
    print("")
    sys.exit(0)

text = src_path.read_text(encoding="utf-8")

ns = []
for m in re.finditer(r"^###\s+NS-(\d+)：(.+?)\s*$", text, flags=re.M):
    ns_id = int(m.group(1))
    title = m.group(2).strip()
    ns.append((ns_id, title))
ns.sort(key=lambda x: x[0])

kf = []
for m in re.finditer(r"^####\s+KF-(\d+)\.\s+(.+?)\s+→\s+NS-(\d+)\s*$", text, flags=re.M):
    kf_id = int(m.group(1))
    title = m.group(2).strip()
    ns_id = int(m.group(3))
    kf.append((kf_id, title, ns_id))
kf.sort(key=lambda x: x[0])

def normalize_punct(s: str) -> str:
    # Keep output stable and match repo doc style
    s = s.replace("(", "（").replace(")", "）")
    s = s.replace('（"', '（“').replace('"）', '”）')
    return s

lines = []
lines.append("<!-- BEGIN GENERATED: north-stars-index -->")
lines.append("## North Stars（NS-*）")
lines.append("")
for ns_id, title in ns:
    lines.append(f"- NS-{ns_id}：{normalize_punct(title)}")
lines.append("")
lines.append("## Kill Features（KF-*）")
lines.append("")
for kf_id, title, ns_id in kf:
    lines.append(f"- KF-{kf_id}：{normalize_punct(title)} → NS-{ns_id}")
lines.append("")
lines.append("<!-- END GENERATED: north-stars-index -->")

print("\n".join(lines).rstrip() + "\n")
PY
}

ensure_file_exists() {
  if [[ -s "$TARGET" && "$FORCE_OVERWRITE" != true ]]; then
    return 0
  fi

  if [[ -f "$TEMPLATE" ]]; then
    cp "$TEMPLATE" "$TARGET"
  else
    # Minimal fallback
    cat > "$TARGET" <<'EOF'
# North Stars / Kill Features 索引（派生）

<!-- BEGIN GENERATED: north-stars-index -->
## North Stars（NS-*）

- TODO

## Kill Features（KF-*）

- TODO
<!-- END GENERATED: north-stars-index -->
EOF
  fi
  CREATED=true
}

sync_generated_block() {
  if [[ "$SYNC" != true ]]; then
    return 0
  fi

  if [[ ! -f "$SOURCE_OF_TRUTH" ]]; then
    ERROR="source-of-truth not found: $SOURCE_OF_TRUTH"
    return 1
  fi

  local new_block
  new_block="$(generate_block)"
  if [[ -z "$new_block" ]]; then
    ERROR="failed to generate block (empty output)"
    return 1
  fi

  python3 - "$TARGET" "$new_block" "$FORCE_OVERWRITE" <<'PY'
import sys
from pathlib import Path

target_path = Path(sys.argv[1])
new_block = sys.argv[2]
force = sys.argv[3].lower() == "true"

text = target_path.read_text(encoding="utf-8") if target_path.exists() else ""

begin = "<!-- BEGIN GENERATED: north-stars-index -->"
end = "<!-- END GENERATED: north-stars-index -->"

bi = text.find(begin)
ei = text.find(end)

if bi == -1 or ei == -1 or ei < bi:
    if not force:
        raise SystemExit("missing GENERATED markers (use --force to rewrite)")
    # Rewrite entire file (destructive) using the new block + minimal header
    text = "# North Stars / Kill Features 索引（派生）\n\n" + new_block
    target_path.write_text(text, encoding="utf-8")
    raise SystemExit(0)

ei_end = ei + len(end)
after = text[ei_end:]

updated = text[:bi] + new_block + after
target_path.write_text(updated, encoding="utf-8")
PY
  UPDATED=true
}

MODE="init"
if [[ "$SYNC" == true ]]; then MODE="sync"; fi

if ensure_file_exists; then
  :
fi

if sync_generated_block; then
  :
fi

if [[ "$CREATED" != true && "$UPDATED" != true ]]; then
  NOOP=true
fi

if $JSON_MODE; then
  emit_json "$MODE" "$CREATED" "$UPDATED" "$NOOP" "$ERROR"
else
  if [[ -n "$ERROR" ]]; then
    echo "ERROR: $ERROR" >&2
    exit 1
  fi
  echo "Repo: $REPO_ROOT"
  echo "NorthStars: $TARGET"
  if [[ "$CREATED" == true ]]; then echo "Created: yes"; fi
  if [[ "$UPDATED" == true ]]; then echo "Updated: yes"; fi
  if [[ "$NOOP" == true ]]; then echo "No-op"; fi
fi
