#!/usr/bin/env bash

set -e

# Parse command line arguments
JSON_MODE=false
FORCE_OVERWRITE=false
ARGS=()

for arg in "$@"; do
    case "$arg" in
        --json) 
            JSON_MODE=true 
            ;;
        --force)
            FORCE_OVERWRITE=true
            ;;
        --help|-h) 
            echo "Usage: $0 [--json]"
            echo "  --json    Output results in JSON format"
            echo "  --force   Overwrite existing plan.md from template"
            echo "  --help    Show this help message"
            exit 0 
            ;;
        *) 
            ARGS+=("$arg") 
            ;;
    esac
done

# Get script directory and load common functions
SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get all paths and variables from common functions
eval $(get_feature_paths)

# Check if we have a valid feature id
check_feature_branch "$CURRENT_BRANCH" || exit 1

# Ensure the feature directory exists
mkdir -p "$FEATURE_DIR"

# Copy plan template if it exists (but do not overwrite by default)
TEMPLATE="$REPO_ROOT/.specify/templates/plan-template.md"
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
