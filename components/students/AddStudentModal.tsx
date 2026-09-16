"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CameraFrame } from "@/components/camera/CameraFrame";
import { useCamera } from "@/hooks/useCamera";
import { useFaceModels } from "@/hooks/useFaceModels";
import { readLiveFace, captureFaceEmbedding } from "@/services/faceEnrollmentService";

type Phase = "info" | "consent" | "camera" | "done";
type CameraMessage =
  | "initializing"
  | "no-face"
  | "multiple-faces"
  | "too-small"
  | "off-center"
  | "holding"
  | "capturing"
  | "registered"
  | "failed";

const messageCopy: Record<CameraMessage, string> = {
  initializing: "Initializing camera…",
  "no-face": "No face detected.",
  "multiple-faces": "Only one person should be visible.",
  "too-small": "Move closer to the camera.",
  "off-center": "Center your face in the frame.",
  holding: "Hold still…",
  capturing: "Capturing…",
  registered: "Face registration complete.",
  failed: "Capture failed. Try again.",
};

export function AddStudentModal({
  open,
  onClose,
  groupId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  onCreated: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("info");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentRef, setStudentRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const [cameraMessage, setCameraMessage] = useState<CameraMessage>("initializing");
  const [faceRegistered, setFaceRegistered] = useState(false);

  const { videoRef, status, start, stop } = useCamera();
  const { ready: modelsReady, error: modelError } = useFaceModels();

  const pollRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const capturingRef = useRef(false);

  function reset() {
    setPhase("info");
    setFirstName("");
    setLastName("");
    setStudentRef("");
    setError(null);
    setStudentId(null);
    setConsented(false);
    setCameraMessage("initializing");
    setFaceRegistered(false);
    capturingRef.current = false;
  }

  function handleClose() {
    stop();
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
    reset();
    onClose();
  }

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, studentRef: studentRef || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setStudentId(data.student.id);
      setPhase("consent");
    } catch {
      setError("Connection lost. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function beginEnrollment() {
    setPhase("camera");
    await start("user");
  }

  // Live detection loop, runs while the camera phase is active.
  useEffect(() => {
    if (phase !== "camera" || status !== "active" || !modelsReady) return;

    pollRef.current = window.setInterval(async () => {
      if (capturingRef.current || !videoRef.current) return;
      const reading = await readLiveFace(videoRef.current);

      if (reading.state === "ready") {
        if (!holdTimeoutRef.current) {
          setCameraMessage("holding");
          holdTimeoutRef.current = window.setTimeout(async () => {
            holdTimeoutRef.current = null;
            if (capturingRef.current || !videoRef.current) return;
            capturingRef.current = true;
            setCameraMessage("capturing");
            const result = await captureFaceEmbedding(videoRef.current);
            if (!result.ok) {
              setCameraMessage("failed");
              capturingRef.current = false;
              return;
            }
            try {
              const res = await fetch(`/api/students/${studentId}/face`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  embedding: result.embedding,
                  quality: result.quality,
                  consent: true,
                }),
              });
              if (!res.ok) throw new Error();
              setCameraMessage("registered");
              setFaceRegistered(true);
              if (pollRef.current) window.clearInterval(pollRef.current);
              stop();
              setPhase("done");
            } catch {
              setCameraMessage("failed");
              capturingRef.current = false;
            }
          }, 700);
        }
      } else {
        if (holdTimeoutRef.current) {
          window.clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        setCameraMessage(
          reading.state === "no-face"
            ? "no-face"
            : reading.state === "multiple-faces"
            ? "multiple-faces"
            : reading.state === "too-small"
            ? "too-small"
            : "off-center"
        );
      }
    }, 350);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, status, modelsReady]);

  const guideState =
    cameraMessage === "registered"
      ? "success"
      : cameraMessage === "holding" || cameraMessage === "capturing"
      ? "detected"
      : cameraMessage === "no-face" || cameraMessage === "initializing"
      ? "searching"
      : "warning";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        phase === "info"
          ? "Add student"
          : phase === "consent"
          ? "Face enrollment"
          : phase === "camera"
          ? "Register face"
          : "Student added"
      }
      description={
        phase === "info"
          ? "Enter the student's information."
          : phase === "camera"
          ? "Position the face inside the frame."
          : undefined
      }
    >
      {phase === "info" && (
        <form onSubmit={handleInfoSubmit} className="flex flex-col gap-4">
          <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <Input
            label="Student ID (optional)"
            value={studentRef}
            onChange={(e) => setStudentRef(e.target.value)}
          />
          {error && <p className="text-[13px] text-bad">{error}</p>}
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Continue
            </Button>
          </div>
        </form>
      )}

      {phase === "consent" && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-ink-muted leading-relaxed">
            Face recognition is used only for attendance identification. The captured image is
            converted into a numeric representation and the photo itself is discarded — only that
            representation is stored.
          </p>
          <label className="flex items-start gap-2.5 text-[13px] text-ink select-none">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-base-border bg-white/[0.03] accent-accent"
            />
            I understand and consent to face enrollment for attendance.
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button disabled={!consented} onClick={beginEnrollment}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {phase === "camera" && (
        <div className="flex flex-col gap-4 items-center">
          {status === "denied" && (
            <div className="text-center py-6">
              <p className="text-[13px] text-ink">Camera access is required for face attendance.</p>
              <p className="text-[13px] text-ink-muted mt-1">
                Please allow camera access in your browser settings.
              </p>
              <Button className="mt-4" variant="secondary" onClick={() => start("user")}>
                Try Again
              </Button>
            </div>
          )}
          {status !== "denied" && (
            <>
              <CameraFrame
                videoRef={videoRef}
                guideState={guideState}
                overlayLabel={
                  modelError ? modelError : !modelsReady ? "Loading recognition models…" : messageCopy[cameraMessage]
                }
              />
              <p className="text-[13px] text-ink-faint">Only one person should be visible in the frame.</p>
            </>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col gap-4">
                    <div className="rounded-control glass px-4 py-3">
            <p className="text-[14px] font-medium text-ink">
              {firstName} {lastName}
            </p>
            <p className="text-[13px] text-good mt-0.5">Face registered</p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                handleClose();
                onCreated();
              }}
            >
              Save Student
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
