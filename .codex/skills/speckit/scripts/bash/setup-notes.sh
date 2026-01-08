#!/usr/bin/env bash

set -e

JSON_MODE=false
FORCE_OVERWRITE=false
DRY_RUN=false
FEATURE_OVERRIDE=""
POSITIONAL=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)
            JSON_MODE=true
            shift
            ;;
        --force)
            FORCE_OVERWRITE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --feature)
            if [[ $# -lt 2 || "$2" == --* ]]; then
                echo "Error: --feature requires a value" >&2
                exit 1
            fi
            FEATURE_OVERRIDE="$2"
            shift 2
            ;;
        --feature=*)
            FEATURE_OVERRIDE="${1#--feature=}"
            shift
            ;;
        --help|-h)
            cat << 'EOF'
Usage: setup-notes.sh [--json] [--dry-run] [--force] [--feature <NNN|NNN-name>] [NNN|NNN-name]

Ensure `specs/<feature>/notes/` exists with minimal skeleton files (no overwrite by default).

OPTIONS:
  --json        Output results in JSON format
  --dry-run     Preview what would be created/overwritten without writing
  --force       Overwrite existing notes files from templates
  --feature     Target a specific spec (e.g., 025 or 025-my-feature)
  --help        Show this help message
EOF
            exit 0
            ;;
        --*)
            echo "Error: Unknown option '$1' (use --help for usage information)" >&2
            exit 1
            ;;
        *)
            POSITIONAL+=("$1")
            shift
            ;;
    esac
done

if [[ -n "$FEATURE_OVERRIDE" ]]; then
    SPECIFY_FEATURE="$FEATURE_OVERRIDE"
fi

if [[ ${#POSITIONAL[@]} -gt 0 ]]; then
    if [[ -z "$FEATURE_OVERRIDE" && ${#POSITIONAL[@]} -eq 1 && "${POSITIONAL[0]}" =~ ^[0-9]{3}(-.+)?$ ]]; then
        SPECIFY_FEATURE="${POSITIONAL[0]}"
    else
        echo "Error: Unknown argument(s): ${POSITIONAL[*]} (use --help for usage information)" >&2
        exit 1
    fi
fi

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(CDPATH="" cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/common.sh"

eval $(get_feature_paths)
check_feature_branch "$CURRENT_BRANCH" || exit 1

if [[ ! -d "$FEATURE_DIR" ]]; then
    echo "ERROR: Feature directory not found: $FEATURE_DIR" >&2
    echo 'Run $speckit specify first to create the feature structure.' >&2
    exit 1
fi

NOTES_DIR="$FEATURE_DIR/notes"
SESSIONS_DIR="$NOTES_DIR/sessions"
NOTES_README="$NOTES_DIR/README.md"
NOTES_ENTRYPOINTS="$NOTES_DIR/entrypoints.md"
NOTES_QUESTIONS="$NOTES_DIR/questions.md"

TEMPLATE_README="$SKILL_DIR/assets/templates/notes-readme-template.md"
TEMPLATE_ENTRYPOINTS="$SKILL_DIR/assets/templates/notes-entrypoints-template.md"
TEMPLATE_QUESTIONS="$SKILL_DIR/assets/templates/notes-questions-template.md"

declare -a would_create=()
declare -a would_overwrite=()

if [[ ! -d "$NOTES_DIR" ]]; then
    would_create+=("notes/")
fi
if [[ ! -d "$SESSIONS_DIR" ]]; then
    would_create+=("notes/sessions/")
fi

if [[ ! -f "$NOTES_README" || ! -s "$NOTES_README" ]]; then
    would_create+=("notes/README.md")
elif $FORCE_OVERWRITE; then
    would_overwrite+=("notes/README.md")
fi

if [[ ! -f "$NOTES_ENTRYPOINTS" || ! -s "$NOTES_ENTRYPOINTS" ]]; then
    would_create+=("notes/entrypoints.md")
elif $FORCE_OVERWRITE; then
    would_overwrite+=("notes/entrypoints.md")
fi

if [[ ! -f "$NOTES_QUESTIONS" || ! -s "$NOTES_QUESTIONS" ]]; then
    would_create+=("notes/questions.md")
elif $FORCE_OVERWRITE; then
    would_overwrite+=("notes/questions.md")
fi

if ! $DRY_RUN; then
    mkdir -p "$SESSIONS_DIR"

    if $FORCE_OVERWRITE || [[ ! -s "$NOTES_README" ]]; then
        if [[ -f "$TEMPLATE_README" ]]; then
            cp "$TEMPLATE_README" "$NOTES_README"
        else
            [[ -f "$NOTES_README" ]] || touch "$NOTES_README"
        fi
    fi

    if $FORCE_OVERWRITE || [[ ! -s "$NOTES_ENTRYPOINTS" ]]; then
        if [[ -f "$TEMPLATE_ENTRYPOINTS" ]]; then
            cp "$TEMPLATE_ENTRYPOINTS" "$NOTES_ENTRYPOINTS"
        else
            [[ -f "$NOTES_ENTRYPOINTS" ]] || touch "$NOTES_ENTRYPOINTS"
        fi
    fi

    if $FORCE_OVERWRITE || [[ ! -s "$NOTES_QUESTIONS" ]]; then
        if [[ -f "$TEMPLATE_QUESTIONS" ]]; then
            cp "$TEMPLATE_QUESTIONS" "$NOTES_QUESTIONS"
        else
            [[ -f "$NOTES_QUESTIONS" ]] || touch "$NOTES_QUESTIONS"
        fi
    fi
fi

if $JSON_MODE; then
    if [[ ${#would_create[@]} -eq 0 ]]; then
        json_create="[]"
    else
        json_create=$(printf '"%s",' "${would_create[@]}")
        json_create="[${json_create%,}]"
    fi

    if [[ ${#would_overwrite[@]} -eq 0 ]]; then
        json_overwrite="[]"
    else
        json_overwrite=$(printf '"%s",' "${would_overwrite[@]}")
        json_overwrite="[${json_overwrite%,}]"
    fi

    printf '{"FEATURE_DIR":"%s","NOTES_DIR":"%s","NOTES_README":"%s","NOTES_ENTRYPOINTS":"%s","NOTES_QUESTIONS":"%s","SESSIONS_DIR":"%s","WOULD_CREATE":%s,"WOULD_OVERWRITE":%s,"DRY_RUN":%s}\n' \
        "$FEATURE_DIR" "$NOTES_DIR" "$NOTES_README" "$NOTES_ENTRYPOINTS" "$NOTES_QUESTIONS" "$SESSIONS_DIR" \
        "$json_create" "$json_overwrite" "$DRY_RUN"
else
    echo "FEATURE_DIR: $FEATURE_DIR"
    echo "NOTES_DIR: $NOTES_DIR"
    echo "NOTES_README: $NOTES_README"
    echo "NOTES_ENTRYPOINTS: $NOTES_ENTRYPOINTS"
    echo "NOTES_QUESTIONS: $NOTES_QUESTIONS"
    echo "SESSIONS_DIR: $SESSIONS_DIR"
    echo "DRY_RUN: $DRY_RUN"
fi

