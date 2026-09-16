"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CameraFrame } from "@/components/camera/CameraFrame";
import { useCamera } from "@/hooks/useCamera";
import { useFaceModels } from "@/hooks/useFaceModels";
import { recognizeFrame, type EnrolledFace } from "@/services/faceRecognitionService";
import type { FaceMatch, RecognitionThresholds } from "@/types/face";
import { DEFAULT_THRESHOLDS } from "@/types/face";

type RosterEntry = {
  id: string;
  firstName: string;
  lastName: string;
  enrolled: boolean;
  embedding: number[] | null;
  attendance: { status: string; recordedAt: string } | null;
};

type ScanState =
  | { phase: "scanning"; message: string }
  | { phase: "recognizing" }
  | { phase: "confirm"; match: FaceMatch; name: string }
  | { phase: "success"; name: string; time: string; alreadyRecorded: boolean }
  | { phase: "unknown" }
  | { phase: "paused" };

export function SessionClient({
  lessonId,
  groupId,
  groupName,
  startsAt,
  initialStatus,
}: {
  lessonId: string;
  groupId: string;
  groupName: string;
  startsAt: string;
  initialStatus: "UPCOMING" | "ACTIVE" | "COMPLETED";
}) {
  const router = useRouter();
  const { videoRef, status: cameraStatus, start } = useCamera();
  const { ready: modelsReady, error: modelError } = useFaceModels();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [thresholds, setThresholds] = useState<RecognitionThresholds>(DEFAULT_THRESHOLDS);
  const [scan, setScan] = useState<ScanState>({ phase: "scanning", message: "Look at the camera" });
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [summary, setSummary] = useState<null | {
    present: number;
    total: number;
    durationMinutes: number;
  }>(null);

  const loopRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const rosterRef = useRef<RosterEntry[]>([]);
  rosterRef.current = roster;
  const thresholdsRef = useRef<RecognitionThresholds>(DEFAULT_THRESHOLDS);
  thresholdsRef.current = thresholds;

  const loadRoster = useCallback(async () => {
    const res = await fetch(`/api/lessons/${lessonId}/roster`);
    if (res.ok) {
      const data = await res.json();
      setRoster(data.roster);
      if (data.thresholds) setThresholds(data.thresholds);
    }
  }, [lessonId]);

  useEffect(() => {
    void loadRoster();
    void start("user");
  }, [loadRoster, start]);

  const runRecognition = useCallback(async () => {
    if (busyRef.current) return;
    if (!videoRef.current || cameraStatus !== "active" || !modelsReady) return;

    const enrolled: EnrolledFace[] = rosterRef.current
      .filter((s) => s.enrolled && s.embedding && !s.attendance)
      .map((s) => ({ studentId: s.id, embedding: s.embedding as number[] }));

    if (enrolled.length === 0) return;

    busyRef.current = true;
    const result = await recognizeFrame(videoRef.current, enrolled, thresholdsRef.current);
    busyRef.current = false;

    if (result.status === "no-face") {
      setScan({ phase: "scanning", message: "Look at the camera" });
      return;
    }
    if (result.status === "multiple-faces") {
      setScan({ phase: "scanning", message: "Only one person should be visible" });
      return;
    }
    if (result.status === "unknown") {
      setScan({ phase: "unknown" });
      pauseThenResume(1600);
      return;
    }

    const student = rosterRef.current.find((s) => s.id === result.match.studentId);
    const name = student ? `${student.firstName} ${student.lastName}` : "Unknown";

    if (result.match.tier === "medium") {
      setScan({ phase: "confirm", match: result.match, name });
      return;
    }

    // High confidence — record automatically.
    await submitAttendance(result.match, name);
  }, [cameraStatus, modelsReady]);

  function pauseThenResume(ms: number) {
    window.setTimeout(() => {
      setScan({ phase: "scanning", message: "Look at the camera" });
    }, ms);
  }

  async function submitAttendance(match: FaceMatch, name: string) {
    setScan({ phase: "recognizing" });
    try {
      const res = await fetch(`/api/lessons/${lessonId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: match.studentId, confidence: match.similarity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScan({ phase: "unknown" });
        pauseThenResume(1500);
        return;
      }

      setRoster((prev) =>
        prev.map((s) =>
          s.id === match.studentId
            ? { ...s, attendance: { status: "PRESENT", recordedAt: data.recordedAt } }
            : s
        )
      );

      setScan({
        phase: "success",
        name,
        time: new Date(data.recordedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        alreadyRecorded: data.outcome === "already-recorded",
      });
      pauseThenResume(1800);
    } catch {
      setScan({ phase: "unknown" });
      pauseThenResume(1500);
    }
  }

  // Throttled recognition loop: ~1 attempt/second while scanning.
  useEffect(() => {
    if (cameraStatus !== "active" || !modelsReady) return;
    loopRef.current = window.setInterval(() => {
      setScan((current) => {
        if (current.phase === "scanning") void runRecognition();
        return current;
      });
    }, 1000);
    return () => {
      if (loopRef.current) window.clearInterval(loopRef.current);
    };
  }, [cameraStatus, modelsReady, runRecognition]);

  async function handleEndSession() {
    setEnding(true);
    try {
      await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const presentCount = roster.filter((s) => s.attendance?.status === "PRESENT").length;
      const durationMinutes = Math.max(1, Math.round((Date.now() - new Date(startsAt).getTime()) / 60000));
      setSummary({ present: presentCount, total: roster.length, durationMinutes });
      setEndOpen(false);
    } finally {
      setEnding(false);
    }
  }

  const present = roster.filter((s) => s.attendance?.status === "PRESENT").length;
  const remaining = roster.length - present;
  const absentCount = remaining;

  return (
    <div className="min-h-screen bg-base flex flex-col md:flex-row">
      {/* Main camera column */}
      <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-8 md:py-8">
        <div className="w-full max-w-md flex items-center justify-between mb-4">
          <button onClick={() => router.push(`/groups/${groupId}`)} className="text-[13px] text-ink-muted hover:text-ink">
            ← Exit
          </button>
          <Button variant="secondary" size="sm" onClick={() => setEndOpen(true)}>
            End Session
          </Button>
        </div>

        <div className="w-full max-w-md text-center mb-4">
          <p className="text-[15px] font-semibold text-ink">{groupName}</p>
          <p className="text-[13px] text-ink-muted mt-0.5">Attendance Session</p>
          <p className="text-[12.5px] text-ink-faint mt-0.5">
            {new Date(startsAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {new Date(startsAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {cameraStatus === "denied" ? (
          <div className="text-center py-16 max-w-xs">
            <p className="text-[14px] text-ink">Camera access is required for face attendance.</p>
            <p className="text-[13px] text-ink-muted mt-1">Please allow camera access in your browser settings.</p>
            <Button className="mt-4" variant="secondary" onClick={() => start("user")}>
              Try Again
            </Button>
          </div>
        ) : (
          <CameraFrame
            videoRef={videoRef}
            guideState={
              scan.phase === "success"
                ? "success"
                : scan.phase === "unknown"
                ? "warning"
                : scan.phase === "confirm" || scan.phase === "recognizing"
                ? "detected"
                : "searching"
            }
          >
            <AnimatePresence>
              {scan.phase === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/55"
                >
                  <div className="h-11 w-11 rounded-full bg-good/15 border border-good/40 flex items-center justify-center text-good text-[20px]">
                    ✓
                  </div>
                  <p className="text-[15px] font-semibold text-white mt-3">{scan.name}</p>
                  <p className="text-[13px] text-good mt-0.5">
                    {scan.alreadyRecorded ? "Already recorded" : "Present"}
                  </p>
                  <p className="text-[12.5px] text-white/60 mt-0.5">{scan.time}</p>
                </motion.div>
              )}
              {scan.phase === "unknown" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 px-6 text-center"
                >
                  <p className="text-[15px] font-semibold text-white">Unknown person</p>
                  <p className="text-[13px] text-white/70 mt-1">
                    We couldn&apos;t match this face to a student in this group.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CameraFrame>
        )}

        <p className="mt-4 text-[13px] text-ink-muted">
          {!modelsReady
            ? modelError ?? "Loading recognition models…"
            : scan.phase === "scanning"
            ? scan.message
            : scan.phase === "recognizing"
            ? "Recognizing…"
            : scan.phase === "confirm"
            ? "Face detected"
            : ""}
        </p>

        {scan.phase === "confirm" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-6"
          >
            <p className="text-[12.5px] text-white/50 uppercase tracking-wide">Possible match</p>
            <p className="text-[18px] font-semibold text-white mt-1.5">{scan.name}</p>
            <p className="text-[13px] text-white/70 mt-1">Confirm identity?</p>
            <div className="flex gap-2 mt-5 w-full max-w-[240px]">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setScan({ phase: "scanning", message: "Look at the camera" })}
              >
                Try Again
              </Button>
              <Button className="flex-1" onClick={() => submitAttendance(scan.match, scan.name)}>
                Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Live sidebar */}
        <aside className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-base-border glass-strong px-4 py-5 md:py-8 flex flex-col">
        <p className="text-[13px] font-medium text-ink-muted">Attendance</p>
        <p className="text-[26px] font-semibold text-ink mt-1">
          {present} / {roster.length}
        </p>
        <div className="flex gap-4 mt-3 text-[13px]">
          <div>
            <p className="text-ink-faint">Present</p>
            <p className="text-good font-medium mt-0.5">{present}</p>
          </div>
          <div>
            <p className="text-ink-faint">Remaining</p>
            <p className="text-ink-muted font-medium mt-0.5">{absentCount}</p>
          </div>
        </div>

        <ul className="mt-5 flex flex-col gap-0.5 overflow-y-auto scrollbar-thin max-h-[50vh] md:max-h-none md:flex-1">
          {roster.map((s) => {
            const present = s.attendance?.status === "PRESENT";
            return (
              <motion.li
                key={s.id}
                layout
                className="flex items-center gap-2.5 px-2 py-2 rounded-control text-[13.5px]"
              >
                <span className={present ? "text-good" : "text-ink-faint"}>{present ? "✓" : "○"}</span>
                <span className={present ? "text-ink" : "text-ink-muted"}>
                  {s.firstName} {s.lastName}
                </span>
                {!s.enrolled && <span className="ml-auto text-[11px] text-ink-faint">No face</span>}
              </motion.li>
            );
          })}
        </ul>
      </aside>

      <Modal open={endOpen} onClose={() => setEndOpen(false)} title="End attendance session?" description={`${absentCount} students are still absent.`}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEndOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleEndSession} isLoading={ending}>
            End Session
          </Button>
        </div>
      </Modal>

      <Modal open={!!summary} onClose={() => router.push(`/groups/${groupId}`)} title="Session completed">
        {summary && (
          <div className="flex flex-col gap-4">
            <p className="text-[24px] font-semibold text-ink">
              {summary.present} / {summary.total} students present
            </p>
            <div className="flex gap-6 text-[13px]">
              <div>
                <p className="text-ink-faint">Attendance rate</p>
                <p className="text-ink font-medium mt-0.5">
                  {summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0}%
                </p>
              </div>
              <div>
                <p className="text-ink-faint">Duration</p>
                <p className="text-ink font-medium mt-0.5">
                  {Math.floor(summary.durationMinutes / 60)}h {summary.durationMinutes % 60}m
                </p>
              </div>
            </div>
            <Button onClick={() => router.push(`/groups/${groupId}`)}>View Attendance</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
