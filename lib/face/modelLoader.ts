"use client";

import * as faceapi from "face-api.js";

const MODEL_URL = "/models";

let loadPromise: Promise<void> | null = null;

/**
 * Loads the three models the recognition pipeline needs:
 *  - tiny_face_detector: locates face bounding boxes (fast, mobile-friendly)
 *  - face_landmark_68:   aligns the face before embedding for stability
 *  - face_recognition:   produces the 128-dimensional embedding used for matching
 *
 * Models are fetched once and cached for the lifetime of the tab.
 */
export function loadFaceModels(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  })();

  return loadPromise;
}

export function faceModelsReady(): boolean {
  return (
    faceapi.nets.tinyFaceDetector.isLoaded &&
    faceapi.nets.faceLandmark68Net.isLoaded &&
    faceapi.nets.faceRecognitionNet.isLoaded
  );
}

export { faceapi };
