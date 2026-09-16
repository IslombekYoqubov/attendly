#!/usr/bin/env bash
# Downloads the face-api.js model weights used by the recognition pipeline
# into public/models, where the browser loads them from at runtime.
# Run once after `npm install` (also invoked by `npm run setup`).
set -euo pipefail

DEST="$(dirname "$0")/../public/models"
mkdir -p "$DEST"

BASE="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

FILES=(
  "tiny_face_detector_model-weights_manifest.json"
  "tiny_face_detector_model-shard1"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model-shard1"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model-shard1"
  "face_recognition_model-shard2"
)

for f in "${FILES[@]}"; do
  echo "Fetching $f"
  curl -fsSL "$BASE/$f" -o "$DEST/$f"
done

echo "Model weights downloaded to $DEST"
