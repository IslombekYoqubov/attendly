export type FaceDetectionOutcome =
  | { status: "no-face" }
  | { status: "multiple-faces"; count: number }
  | { status: "too-small" }
  | { status: "off-center" }
  | { status: "ok"; embedding: Float32Array; quality: number };

export type FaceEnrollmentResult =
  | { ok: true; embedding: number[]; quality: number }
  | { ok: false; reason: "no-face" | "multiple-faces" | "too-small" | "off-center" };

export type MatchConfidenceTier = "high" | "medium" | "low" | "none";

export type FaceMatch = {
  studentId: string;
  distance: number; // lower is closer
  similarity: number; // 0..1, derived from distance
  tier: MatchConfidenceTier;
};

export type RecognitionThresholds = {
  /** similarity >= this -> automatic attendance */
  autoConfirm: number;
  /** similarity >= this (but below autoConfirm) -> ask teacher/student to confirm */
  needsConfirmation: number;
};

export const DEFAULT_THRESHOLDS: RecognitionThresholds = {
  autoConfirm: 0.62,
  needsConfirmation: 0.5,
};
