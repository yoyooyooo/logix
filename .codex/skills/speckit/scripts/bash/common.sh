#!/usr/bin/env bash
# Common functions and variables for all scripts

find_repo_root_by_marker() {
    local dir="$1"
    while [[ -n "$dir" && "$dir" != "/" ]]; do
        if [[ -d "$dir/.specify" || -d "$dir/specs" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

get_repo_root() {
    local repo_root=""

    if repo_root="$(find_repo_root_by_marker "${PWD:-}")"; then
        echo "$repo_root"
        return 0
    fi

    local script_dir="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if repo_root="$(find_repo_root_by_marker "$script_dir")"; then
        echo "$repo_root"
        return 0
    fi

    # Fallback: if we're inside a Git repo, use the repo root.
    if command -v git >/dev/null 2>&1 && git rev-parse --show-toplevel >/dev/null 2>&1; then
        git rev-parse --show-toplevel
        return 0
    fi

    # Final fallback: use the current working directory so we never default to "/specs".
    local pwd="${PWD:-}"
    if [[ -n "$pwd" ]]; then
        echo "$pwd"
        return 0
    fi

    pwd
}

# Get current feature id (historical name: branch), without any VCS dependence
get_current_branch() {
    # First check if SPECIFY_FEATURE environment variable is set
    if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
        # Allow shorthand: if user sets SPECIFY_FEATURE to a bare numeric prefix (e.g., "026"),
        # resolve it to the unique specs/<NNN-*> directory if possible.
        if [[ "${SPECIFY_FEATURE}" =~ ^[0-9]{3}$ ]]; then
            local repo_root=""
            repo_root="$(get_repo_root 2>/dev/null || true)"
            local specs_dir="$repo_root/specs"
            if [[ -d "$specs_dir" ]]; then
                local matches=()
                for dir in "$specs_dir"/"${SPECIFY_FEATURE}"-*; do
                    if [[ -d "$dir" ]]; then
                        matches+=("$(basename "$dir")")
                    fi
                done
                if [[ ${#matches[@]} -eq 1 ]]; then
                    echo "${matches[0]}"
                    return
                fi
            fi
        fi

        echo "$SPECIFY_FEATURE"
        return
    fi

    # Then infer from current working directory if we're inside specs/<NNN-*>
    if [[ -n "${PWD:-}" ]] && [[ "${PWD:-}" =~ /specs/([0-9]{3}-[^/]+)(/|$) ]]; then
        echo "${BASH_REMATCH[1]}"
        return
    fi

    # Finally, fall back to the latest feature directory by numeric prefix
    local repo_root=""
    repo_root="$(get_repo_root 2>/dev/null || true)"
    local specs_dir="$repo_root/specs"

    if [[ -d "$specs_dir" ]]; then
        local latest_feature=""
        local highest=0

        for dir in "$specs_dir"/*; do
            if [[ -d "$dir" ]]; then
                local dirname=$(basename "$dir")
                if [[ "$dirname" =~ ^([0-9]{3})- ]]; then
                    local number=${BASH_REMATCH[1]}
                    number=$((10#$number))
                    if [[ "$number" -gt "$highest" ]]; then
                        highest=$number
                        latest_feature=$dirname
                    fi
                fi
            fi
        done

        if [[ -n "$latest_feature" ]]; then
            echo "$latest_feature"
            return
        fi
    fi

    echo ""
}

check_feature_branch() {
    local feature_id="$1"

    if [[ -z "$feature_id" || ! "$feature_id" =~ ^[0-9]{3}- ]]; then
        echo "ERROR: Unable to determine current feature id (expected: 001-feature-name)" >&2
        echo "Hint: set SPECIFY_FEATURE=\"001-feature-name\" (or \"001\" if unique), or pass --feature 001/001-feature-name." >&2
        return 1
    fi

    return 0
}

get_feature_dir() { echo "$1/specs/$2"; }

# Find feature directory by numeric prefix instead of exact branch match
# This allows multiple branches to work on the same spec (e.g., 004-fix-bug, 004-add-feature)
find_feature_dir_by_prefix() {
    local repo_root="$1"
    local branch_name="$2"
    local specs_dir="$repo_root/specs"

    # Extract numeric prefix from branch (e.g., "004" from "004-whatever")
    if [[ ! "$branch_name" =~ ^([0-9]{3})- ]]; then
        # If branch doesn't have numeric prefix, fall back to exact match
        echo "$specs_dir/$branch_name"
        return
    fi

    local prefix="${BASH_REMATCH[1]}"

    # Search for directories in specs/ that start with this prefix
    local matches=()
    if [[ -d "$specs_dir" ]]; then
        for dir in "$specs_dir"/"$prefix"-*; do
            if [[ -d "$dir" ]]; then
                matches+=("$(basename "$dir")")
            fi
        done
    fi

    # Handle results
    if [[ ${#matches[@]} -eq 0 ]]; then
        # No match found - return the branch name path (will fail later with clear error)
        echo "$specs_dir/$branch_name"
    elif [[ ${#matches[@]} -eq 1 ]]; then
        # Exactly one match - perfect!
        echo "$specs_dir/${matches[0]}"
    else
        # Multiple matches - this shouldn't happen with proper naming convention
        echo "ERROR: Multiple spec directories found with prefix '$prefix': ${matches[*]}" >&2
        echo "Please ensure only one spec directory exists per numeric prefix." >&2
        echo "$specs_dir/$branch_name"  # Return something to avoid breaking the script
    fi
}

get_feature_paths() {
    local repo_root
    repo_root="$(get_repo_root)"
    local current_branch
    current_branch="$(get_current_branch)"

    # Use prefix-based lookup to support multiple branches per spec
    local feature_dir=$(find_feature_dir_by_prefix "$repo_root" "$current_branch")

    cat <<EOF
REPO_ROOT='$repo_root'
CURRENT_BRANCH='$current_branch'
FEATURE_DIR='$feature_dir'
FEATURE_SPEC='$feature_dir/spec.md'
IMPL_PLAN='$feature_dir/plan.md'
TASKS='$feature_dir/tasks.md'
RESEARCH='$feature_dir/research.md'
DATA_MODEL='$feature_dir/data-model.md'
QUICKSTART='$feature_dir/quickstart.md'
CONTRACTS_DIR='$feature_dir/contracts'
EOF
}

check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
