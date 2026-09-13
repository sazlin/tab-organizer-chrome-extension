set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

source_ref := `grep '^ref:' .loadout.yaml 2>/dev/null | awk '{print $2}' || true`
source_url := `grep '^source:' .loadout.yaml 2>/dev/null | awk '{print $2}' || true`
loadout := "uvx --from git+" + source_url + "@" + source_ref + " loadout"

# List maintainer recipes
default:
    @just --list

# Install local maintainer tools (just, Node)
setup:
    brew bundle

# Run the Node test suite
test:
    npm test

# What GitHub CI runs
ci: test

# Apply the pinned rules and skills to this repo
loadout-sync:
    {{loadout}} sync

# Fail if vendored loadout files do not match the lockfile
loadout-check:
    {{loadout}} sync --check

# Bump to the latest loadout release and re-sync
loadout-update:
    {{loadout}} update

# List what the current loadout manifest resolves to
loadout-list:
    {{loadout}} resolve --list
