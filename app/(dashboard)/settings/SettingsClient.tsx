"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type SettingsUser = {
  name: string;
  email: string;
  role: string;
  defaultLessonDurationMinutes: number;
  lateThresholdMinutes: number;
  autoConfirmThreshold: number;
  confirmationThreshold: number;
};

export function SettingsClient({ user }: { user: SettingsUser }) {
  const [duration, setDuration] = useState(user.defaultLessonDurationMinutes);
  const [lateThreshold, setLateThreshold] = useState(user.lateThresholdMinutes);
  const [autoConfirm, setAutoConfirm] = useState(Math.round(user.autoConfirmThreshold * 100));
  const [confirmation, setConfirmation] = useState(Math.round(user.confirmationThreshold * 100));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultLessonDurationMinutes: duration,
          lateThresholdMinutes: lateThreshold,
          autoConfirmThreshold: autoConfirm / 100,
          confirmationThreshold: confirmation / 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Connection lost. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-ink">Settings</h1>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-[14px] font-medium text-ink mb-3">Account</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
            <div>
              <p className="text-ink-faint">Name</p>
              <p className="text-ink mt-0.5">{user.name}</p>
            </div>
            <div>
              <p className="text-ink-faint">Email</p>
              <p className="text-ink mt-0.5">{user.email}</p>
            </div>
            <div>
              <p className="text-ink-faint">Role</p>
              <p className="text-ink mt-0.5">{user.role === "ADMIN" ? "Administrator" : "Teacher"}</p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-[14px] font-medium text-ink mb-3">Appearance</p>
          <p className="text-[13px] text-ink-muted">Attendly currently uses a fixed dark interface.</p>
        </Card>

        <Card>
          <p className="text-[14px] font-medium text-ink mb-3">Attendance</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Default lesson duration (minutes)"
              type="number"
              min={15}
              max={480}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
            <Input
              label="Late threshold (minutes)"
              type="number"
              min={0}
              max={120}
              value={lateThreshold}
              onChange={(e) => setLateThreshold(Number(e.target.value))}
              hint="Minutes after the session starts before an arrival counts as late."
            />
          </div>
        </Card>

        <Card>
          <p className="text-[14px] font-medium text-ink mb-3">Face Recognition</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Recognition threshold (%)"
              type="number"
              min={30}
              max={95}
              value={autoConfirm}
              onChange={(e) => setAutoConfirm(Number(e.target.value))}
              hint="Matches at or above this similarity are marked present automatically."
            />
            <Input
              label="Confirmation threshold (%)"
              type="number"
              min={20}
              max={90}
              value={confirmation}
              onChange={(e) => setConfirmation(Number(e.target.value))}
              hint="Matches below the recognition threshold but above this ask for confirmation."
            />
          </div>
        </Card>

        <Card>
          <p className="text-[14px] font-medium text-ink mb-3">Privacy</p>
          <div className="flex flex-col gap-2.5 text-[13px] text-ink-muted leading-relaxed">
            <p>
              Facial data is used only to identify students during attendance sessions, replacing manual
              roll-call.
            </p>
            <p>
              Attendly stores a numeric representation of each student&apos;s face (a face embedding), never the
              original photograph.
            </p>
            <p>
              The embedding is compared against faces seen by the camera during a session. Matches are never
              made automatically below the confirmation threshold above.
            </p>
            <p>
              An administrator can remove a student&apos;s face enrollment at any time from that student&apos;s
              profile page, without deleting their attendance history.
            </p>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} isLoading={saving}>
            Save changes
          </Button>
          {saved && <span className="text-[13px] text-good">Saved</span>}
          {error && <span className="text-[13px] text-bad">{error}</span>}
        </div>
      </div>
    </div>
  );
}
