"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CameraFrame } from "@/components/camera/CameraFrame";
import { useCamera } from "@/hooks/useCamera";
import { useFaceModels } from "@/hooks/useFaceModels";
import { readLiveFace, captureFaceEmbedding } from "@/services/faceEnrollmentService";

type Phase = "consent" | "camera" | "done";
type Message = "no-face" | "multiple-faces" | "too-small" | "off-center" | "holding" | "capturing" | "registered" | "failed";

const copy: Record<Message, string> = {
  "no-face": "No face detected.",
  "multiple-faces": "Only one person should be visible.",
  "too-small": "Move closer to the camera.",
  "off-center": "Center your face in the frame.",
  holding: "Hold still…",
  capturing: "Capturing…",
  registered: "Face registration complete.",
  failed: "Capture failed. Try again.",
};

export function ReenrollFaceModal({
  open,
  onClose,
  studentId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  onSuccess: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("consent");
  const [consented, setConsented] = useState(false);
  const [message, setMessage] = useState<Message>("no-face");
  const { videoRef, status, start, stop } = useCamera();
  const { ready: modelsReady } = useFaceModels();
  const pollRef = useRef<number | null>(null);
  const holdRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  function reset() {
    setPhase("consent");
    setConsented(false);
    busyRef.current = false;
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (holdRef.current) window.clearTimeout(holdRef.current);
  }

  function handleClose() {
    stop();
    reset();
    onClose();
  }

  useEffect(() => {
    if (phase !== "camera" || status !== "active" || !modelsReady) return;

    pollRef.current = window.setInterval(async () => {
      if (busyRef.current || !videoRef.current) return;
      const reading = await readLiveFace(videoRef.current);

      if (reading.state === "ready") {
        if (!holdRef.current) {
          setMessage("holding");
          holdRef.current = window.setTimeout(async () => {
            holdRef.current = null;
            if (busyRef.current || !videoRef.current) return;
            busyRef.current = true;
            setMessage("capturing");
            const result = await captureFaceEmbedding(videoRef.current);
            if (!result.ok) {
              setMessage("failed");
              busyRef.current = false;
              return;
            }
            const res = await fetch(`/api/students/${studentId}/face`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ embedding: result.embedding, quality: result.quality, consent: true }),
            });
            if (res.ok) {
              setMessage("registered");
              if (pollRef.current) window.clearInterval(pollRef.current);
              stop();
              setPhase("done");
            } else {
              setMessage("failed");
              busyRef.current = false;
            }
          }, 700);
        }
      } else {
        if (holdRef.current) {
          window.clearTimeout(holdRef.current);
          holdRef.current = null;
        }
        setMessage(reading.state);
      }
    }, 350);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, status, modelsReady]);

  const guideState =
    message === "registered" ? "success" : message === "holding" || message === "capturing" ? "detected" : "warning";

  return (
    <Modal open={open} onClose={handleClose} title="Re-register face" description={phase === "camera" ? "Position the face inside the frame." : undefined}>
      {phase === "consent" && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-ink-muted leading-relaxed">
            This replaces the student&apos;s existing face enrollment. Face recognition is used only for
            attendance identification.
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
            <Button
              disabled={!consented}
              onClick={async () => {
                setPhase("camera");
                await start("user");
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {phase === "camera" && (
        <div className="flex flex-col items-center gap-3">
          {status === "denied" ? (
            <div className="text-center py-6">
              <p className="text-[13px] text-ink">Camera access is required for face attendance.</p>
              <p className="text-[13px] text-ink-muted mt-1">Please allow camera access in your browser settings.</p>
              <Button className="mt-4" variant="secondary" onClick={() => start("user")}>
                Try Again
              </Button>
            </div>
          ) : (
            <CameraFrame videoRef={videoRef} guideState={guideState} overlayLabel={!modelsReady ? "Loading models…" : copy[message]} />
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-good">Face registration complete.</p>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                handleClose();
                onSuccess();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
