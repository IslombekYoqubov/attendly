"use client";

import { faceapi } from "@/lib/face/modelLoader";
import type { FaceEnrollmentResult } from "@/types/face";

const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.5,
});

// Minimum fraction of the frame's smaller dimension the face box must occupy.
const MIN_FACE_RATIO = 0.22;
// Maximum allowed offset of the face center from the frame center, as a
// fraction of frame width/height.
const MAX_CENTER_OFFSET = 0.22;

export type LiveFaceReading =
  | { state: "no-face" }
  | { state: "multiple-faces"; count: number }
  | { state: "too-small" }
  | { state: "off-center" }
  | { state: "ready"; box: faceapi.Box; score: number };

/**
 * Runs one detection+landmark pass over a video element and classifies the
 * outcome for UI feedback (used every animation frame during enrollment,
 * separately from the heavier embedding extraction below).
 */
export async function readLiveFace(video: HTMLVideoElement): Promise<LiveFaceReading> {
  const detections = await faceapi.detectAllFaces(video, DETECTOR_OPTIONS);

  if (detections.length === 0) return { state: "no-face" };
  if (detections.length > 1) return { state: "multiple-faces", count: detections.length };

  const detection = detections[0];
  if (!detection) return { state: "no-face" };
  const box = detection.box;
  const frameW = video.videoWidth || video.clientWidth;
  const frameH = video.videoHeight || video.clientHeight;
  const minDim = Math.min(frameW, frameH);

  if (box.width / minDim < MIN_FACE_RATIO) {
    return { state: "too-small" };
  }

  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const offsetX = Math.abs(faceCenterX - frameW / 2) / frameW;
  const offsetY = Math.abs(faceCenterY - frameH / 2) / frameH;

  if (offsetX > MAX_CENTER_OFFSET || offsetY > MAX_CENTER_OFFSET) {
    return { state: "off-center" };
  }

  return { state: "ready", box, score: detection.score };
}

/**
 * Extracts a 128-d face embedding from the current video frame, re-validating
 * face count/size/centering, and aligning via landmarks before embedding.
 * This is the only place a raw frame is touched — the pixel data is never
 * persisted, only the resulting numeric vector.
 */
export async function captureFaceEmbedding(
  video: HTMLVideoElement
): Promise<FaceEnrollmentResult> {
  const results = await faceapi
    .detectAllFaces(video, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (results.length === 0) return { ok: false, reason: "no-face" };
  if (results.length > 1) return { ok: false, reason: "multiple-faces" };

  const [match] = results;
  if (!match) return { ok: false, reason: "no-face" };
  const frameW = video.videoWidth || video.clientWidth;
  const frameH = video.videoHeight || video.clientHeight;
  const minDim = Math.min(frameW, frameH);
  const box = match.detection.box;

  if (box.width / minDim < MIN_FACE_RATIO) {
    return { ok: false, reason: "too-small" };
  }

  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const offsetX = Math.abs(faceCenterX - frameW / 2) / frameW;
  const offsetY = Math.abs(faceCenterY - frameH / 2) / frameH;

  if (offsetX > MAX_CENTER_OFFSET || offsetY > MAX_CENTER_OFFSET) {
    return { ok: false, reason: "off-center" };
  }

  const quality = Math.min(1, match.detection.score);

  return {
    ok: true,
    embedding: Array.from(match.descriptor),
    quality,
  };
}
