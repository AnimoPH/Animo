#!/usr/bin/env bash
# Builds the Android APK (EAS "preview" profile) after the usual checks.
# Run it from a machine that has mobile/credentials.json (the signing key is
# not in git). The build counts against the monthly free EAS builds.
#
# Use:
#   ./scripts/build-apk.sh           # must be on an up-to-date develop
#   ALLOW_BRANCH=1 ./scripts/build-apk.sh   # build the branch you are on
#
# It asks before it starts the build and prints the link when EAS is done.
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "develop" ] && [ "${ALLOW_BRANCH:-0}" != "1" ]; then
  echo "On '$branch', not develop. Merge your PRs and checkout develop,"
  echo "or run with ALLOW_BRANCH=1 to build this branch anyway."
  exit 1
fi

echo "==> Checking the branch is up to date"
git fetch -q origin "$branch"
if [ -n "$(git status --porcelain --untracked-files=no -- . )" ]; then
  echo "There are uncommitted changes in mobile/. Commit or stash them first."
  exit 1
fi
if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$branch")" ]; then
  echo "Local '$branch' differs from origin/$branch. Pull or push first."
  exit 1
fi

[ -f credentials.json ] || { echo "credentials.json is missing (needed for the preview profile)."; exit 1; }

echo "==> Type check"
npx tsc --noEmit
echo "==> Tests"
npm test

echo "==> Dev tools setting on EAS (preview)"
dev_tools="$(npx eas-cli env:list preview 2>/dev/null | grep "EXPO_PUBLIC_SHOW_DEV_TOOLS" || true)"
echo "    ${dev_tools:-EXPO_PUBLIC_SHOW_DEV_TOOLS is not set (dev tools off)}"
if [[ "$dev_tools" == *"=1" ]] && [ "${ALLOW_DEV_TOOLS:-0}" != "1" ]; then
  echo "Dev tools are ON for this build (this also skips the OTP check)."
  echo "Set EXPO_PUBLIC_SHOW_DEV_TOOLS to 0 on EAS, or run with ALLOW_DEV_TOOLS=1 on purpose."
  exit 1
fi

echo
echo "About to build $(git rev-parse --short HEAD) on '$branch' with the preview profile."
read -r -p "Start the EAS build? [y/N] " answer
[ "$answer" = "y" ] || { echo "Cancelled."; exit 0; }

npx eas-cli build --platform android --profile preview
