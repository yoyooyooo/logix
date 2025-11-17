#!/usr/bin/env bash

set -e

JSON_MODE=false
FORCE_OVERWRITE=false
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
            echo "Usage: $0 [--json] [--force] [--feature <NNN|NNN-name>] [NNN|NNN-name]"
            echo "  --json        Output results in JSON format"
            echo "  --force       Overwrite existing plan.md from template"
            echo "  --feature     Target a specific spec (e.g., 025 or 025-my-feature)"
            echo "  --help        Show this help message"
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

# Get script directory and load common functions
SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(CDPATH="" cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get all paths and variables from common functions
eval $(get_feature_paths)

# Check if we have a valid feature id
check_feature_branch "$CURRENT_BRANCH" || exit 1

# Ensure the feature directory exists
mkdir -p "$FEATURE_DIR"

# Copy plan template if it exists (but do not overwrite by default)
TEMPLATE="$SKILL_DIR/assets/templates/plan-template.md"
if [[ -f "$TEMPLATE" ]]; then
    if $FORCE_OVERWRITE || [[ ! -s "$IMPL_PLAN" ]]; then
        cp "$TEMPLATE" "$IMPL_PLAN"
        if ! $JSON_MODE; then
            echo "Copied plan template to $IMPL_PLAN"
        fi
    else
        if ! $JSON_MODE; then
            echo "Plan already exists at $IMPL_PLAN (use --force to overwrite)"
        fi
    fi
else
    if ! $JSON_MODE; then
        echo "Warning: Plan template not found at $TEMPLATE"
    fi
    # Create a basic plan file if template doesn't exist
    if [[ ! -f "$IMPL_PLAN" ]]; then
        touch "$IMPL_PLAN"
    fi
fi

# Output results
if $JSON_MODE; then
    printf '{"FEATURE_SPEC":"%s","IMPL_PLAN":"%s","SPECS_DIR":"%s","BRANCH":"%s"}\n' \
        "$FEATURE_SPEC" "$IMPL_PLAN" "$FEATURE_DIR" "$CURRENT_BRANCH"
else
    echo "FEATURE_SPEC: $FEATURE_SPEC"
    echo "IMPL_PLAN: $IMPL_PLAN" 
    echo "SPECS_DIR: $FEATURE_DIR"
    echo "BRANCH: $CURRENT_BRANCH"
fi
