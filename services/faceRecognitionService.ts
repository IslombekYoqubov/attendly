"use client";

import { faceapi } from "@/lib/face/modelLoader";
import type { FaceMatch, MatchConfidenceTier, RecognitionThresholds } from "@/types/face";
import { DEFAULT_THRESHOLDS } from "@/types/face";

const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.5,
});

export type EnrolledFace = { studentId: string; embedding: number[] };

export type RecognitionFrameResult =
  | { status: "no-face" }
  | { status: "multiple-faces" }
  | { status: "match"; match: FaceMatch }
  | { status: "unknown" };

/**
 * Converts a raw euclidean distance between two 128-d descriptors into a
 * 0..1 similarity score. face-api.js descriptors typically sit in [0, ~1.5]
 * distance for unrelated faces and below ~0.5 for the same person.
 */
function distanceToSimilarity(distance: number): number {
  return Math.max(0, Math.min(1, 1 - distance));
}

function classify(similarity: number, thresholds: RecognitionThresholds): MatchConfidenceTier {
  if (similarity >= thresholds.autoConfirm) return "high";
  if (similarity >= thresholds.needsConfirmation) return "medium";
  return "low";
}

/**
 * Runs detection + embedding on the current frame and compares the result
 * against every enrolled face passed in (scoped to the active group by the
 * caller). Returns the single best match, or an unknown/no-face/multiple
 * status. Never guesses: a low-similarity best match is reported as
 * "unknown" rather than silently assigned.
 */
export async function recognizeFrame(
  video: HTMLVideoElement,
  enrolled: EnrolledFace[],
  thresholds: RecognitionThresholds = DEFAULT_THRESHOLDS
): Promise<RecognitionFrameResult> {
  if (enrolled.length === 0) return { status: "no-face" };

  const results = await faceapi
    .detectAllFaces(video, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (results.length === 0) return { status: "no-face" };
  if (results.length > 1) return { status: "multiple-faces" };

  const primary = results[0];
  if (!primary) return { status: "no-face" };
  const descriptor = primary.descriptor;

  let best: FaceMatch | null = null;
  for (const face of enrolled) {
    const distance = faceapi.euclideanDistance(descriptor, new Float32Array(face.embedding));
    const similarity = distanceToSimilarity(distance);
    if (!best || similarity > best.similarity) {
      best = {
        studentId: face.studentId,
        distance,
        similarity,
        tier: classify(similarity, thresholds),
      };
    }
  }

  if (!best || best.tier === "low") return { status: "unknown" };

  return { status: "match", match: best };
}
