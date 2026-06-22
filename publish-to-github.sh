#!/usr/bin/env bash
set -euo pipefail

OWNER="${GITHUB_OWNER:-ShemYu}"
REPO="${1:-single-page-games}"
DESCRIPTION="A collection of tiny single-page browser games"
OWNER_LOWER="$(printf '%s' "$OWNER" | tr '[:upper:]' '[:lower:]')"
PAGES_URL="https://${OWNER_LOWER}.github.io/${REPO}/"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 1
  }
}

need git
need gh

gh auth status >/dev/null

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -d .git ]]; then
  git init -b main
fi

git checkout -B main >/dev/null 2>&1

git add .
if ! git diff --cached --quiet; then
  git commit -m "Add single-page game collection"
fi

if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  echo "Repository already exists: $OWNER/$REPO"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/$OWNER/$REPO.git"
  fi
  git push -u origin main
else
  gh repo create "$OWNER/$REPO" \
    --public \
    --description "$DESCRIPTION" \
    --source=. \
    --remote=origin \
    --push
fi

pages_payload='{"build_type":"legacy","source":{"branch":"main","path":"/"}}'

# Create or refresh the Pages configuration. A just-created repo can briefly
# return a conflict, so retry a few times before giving up.
for attempt in 1 2 3 4 5; do
  if gh api "repos/$OWNER/$REPO/pages" >/dev/null 2>&1; then
    if printf '%s' "$pages_payload" | gh api \
      --method PUT \
      "repos/$OWNER/$REPO/pages" \
      --input - >/dev/null; then
      break
    fi
  else
    if printf '%s' "$pages_payload" | gh api \
      --method POST \
      "repos/$OWNER/$REPO/pages" \
      --input - >/dev/null; then
      break
    fi
  fi

  if [[ "$attempt" == 5 ]]; then
    echo "Repo was pushed, but Pages could not be enabled automatically." >&2
    echo "Open Settings → Pages and publish main / (root)." >&2
    exit 2
  fi
  sleep 2
done

gh repo edit "$OWNER/$REPO" --homepage "$PAGES_URL" >/dev/null 2>&1 || true

echo
echo "Published successfully."
echo "Repository: https://github.com/$OWNER/$REPO"
echo "Game hub:  $PAGES_URL"
echo "Mochi Sky: ${PAGES_URL}games/mochi-sky/"
