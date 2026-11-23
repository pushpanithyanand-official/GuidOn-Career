#!/usr/bin/env bash
# Owner-authorised static Hosting preview. Does not deploy Functions, Firestore
# security rules, Storage security rules or access any candidate documents.
set -Eeuo pipefail

PROJECT_ID="guidon-career-fcda2"
EXPECTED_REPO="guidon-career"
EXPECTED_CONFIRMATION="DEPLOY_GUIDON_STATIC_PREVIEW"

if [[ "${1:-}" != "$EXPECTED_CONFIRMATION" ]]; then
  echo "This action publishes a STATIC preview on $PROJECT_ID."
  echo "Run: bash scripts/deploy-spark-preview.sh $EXPECTED_CONFIRMATION"
  exit 2
fi

if [[ ! -f package.json || ! -f firebase.json || ! -f src/firebase-web-config.ts ]]; then
  echo "Run this script from the root of the GuidOn-Career repository."
  exit 2
fi
if [[ "$(node -p 'require("./package.json").name')" != "$EXPECTED_REPO" ]]; then
  echo "This is not the expected GuidOn Career repository."
  exit 2
fi
if ! grep -q "guidon-career-fcda2" src/firebase-web-config.ts; then
  echo "Firebase Web App config does not match the target project."
  exit 2
fi

# Release safety: do not activate the Functions-backed private workspace on Spark.
export VITE_GUIDON_CORE_ENABLED=false
# Explicit optional sign-in-only smoke test. Never enables Firestore or Functions.
export VITE_GUIDON_AUTH_PREVIEW_ENABLED="${VITE_GUIDON_AUTH_PREVIEW_ENABLED:-false}"
if [[ "$VITE_GUIDON_AUTH_PREVIEW_ENABLED" != "true" && "$VITE_GUIDON_AUTH_PREVIEW_ENABLED" != "false" ]]; then
  echo "VITE_GUIDON_AUTH_PREVIEW_ENABLED must be true or false."
  exit 2
fi
export VITE_FIREBASE_PROJECT_ID="$PROJECT_ID"
export VITE_FIREBASE_AUTH_DOMAIN="$PROJECT_ID.firebaseapp.com"
export VITE_FIREBASE_APP_ID="1:752868294981:web:1d58d1f90348e9cbd6fe2c"
export VITE_FIREBASE_STORAGE_BUCKET="$PROJECT_ID.firebasestorage.app"

echo "Building Spark preview. Auth-only mode: $VITE_GUIDON_AUTH_PREVIEW_ENABLED. Private backends and CV uploads are disabled."
if [[ -f package-lock.json ]]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
npm run check
npm test
npm run build

if [[ ! -f dist/index.html ]]; then
  echo "Missing dist/index.html. Aborting before publication."
  exit 2
fi

echo "Deploying ONLY Firebase Hosting to $PROJECT_ID."
echo "This step requires your own authorised Firebase CLI / Google identity."
npx --yes firebase-tools@15.0.0 deploy --only hosting --project "$PROJECT_ID" --non-interactive

echo "Hosting deployment command completed."
echo "Visit https://$PROJECT_ID.web.app and verify the actual release."
echo "Do not enable private APIs until a production-ready backend is deployed and tested."
