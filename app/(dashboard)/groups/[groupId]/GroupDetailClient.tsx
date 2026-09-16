"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddStudentModal } from "@/components/students/AddStudentModal";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  studentRef: string | null;
  faceRegistered: boolean;
  lastAttendance: { status: string; recordedAt: string } | null;
};

type Lesson = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
  presentCount: number;
};

const tabs = ["Overview", "Students", "Attendance", "Sessions"] as const;
type Tab = (typeof tabs)[number];

function statusTone(status: string) {
  if (status === "PRESENT") return "good" as const;
  if (status === "LATE") return "warn" as const;
  return "bad" as const;
}

export function GroupDetailClient({
  group,
  students,
  lessons,
  activeLessonId,
}: {
  group: { id: string; name: string; description: string | null };
  students: Student[];
  lessons: Lesson[];
  activeLessonId: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");
  const [addOpen, setAddOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const latestLesson = lessons[0] ?? null;
  const attendanceRate =
    students.length > 0 && latestLesson ? Math.round((latestLesson.presentCount / students.length) * 100) : 0;

  async function handleStartAttendance() {
    if (activeLessonId) {
      router.push(`/groups/${group.id}/session/${activeLessonId}`);
      return;
    }
    setStarting(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/lessons`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.push(`/groups/${group.id}/session/${data.lesson.id}`);
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">{group.name}</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">{students.length} students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            Add Student
          </Button>
          <Button onClick={handleStartAttendance} isLoading={starting}>
            {activeLessonId ? "Resume Attendance" : "Start Attendance"}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-base-border mb-6 overflow-x-auto scrollbar-thin">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-3.5 py-2.5 text-[13.5px] font-medium border-b-2 -mb-px transition-colors duration-150 whitespace-nowrap",
              tab === t ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <p className="text-[12.5px] text-ink-muted">Today&apos;s attendance</p>
            <p className="text-[24px] font-semibold text-ink mt-1">
              {latestLesson ? `${latestLesson.presentCount} / ${students.length}` : "—"}
            </p>
          </Card>
          <Card>
            <p className="text-[12.5px] text-ink-muted">Attendance rate</p>
            <p className="text-[24px] font-semibold text-ink mt-1">{latestLesson ? `${attendanceRate}%` : "—"}</p>
          </Card>
          <Card>
            <p className="text-[12.5px] text-ink-muted">Current lesson</p>
            <p className="text-[15px] font-medium text-ink mt-1.5">
              {activeLessonId ? "In progress" : "None active"}
            </p>
          </Card>

          <Card className="sm:col-span-3">
            <p className="text-[13px] font-medium text-ink mb-3">Recent sessions</p>
            {lessons.length === 0 ? (
              <p className="text-[13px] text-ink-faint">No sessions yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-base-border">
                {lessons.slice(0, 5).map((l) => (
                  <li key={l.id} className="py-2.5 flex items-center justify-between text-[13px]">
                    <span className="text-ink">
                      {new Date(l.startsAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-ink-muted">
                      {l.presentCount} / {students.length} present
                    </span>
                    <Badge tone={l.status === "ACTIVE" ? "accent" : l.status === "COMPLETED" ? "neutral" : "warn"}>
                      {l.status === "ACTIVE" ? "Active" : l.status === "COMPLETED" ? "Completed" : "Upcoming"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "Students" && (
        <Card className="p-0 overflow-hidden">
          {students.length === 0 ? (
            <div className="text-center py-14 px-4">
              <p className="text-[14px] text-ink">No students yet.</p>
              <p className="text-[13px] text-ink-muted mt-1">Add students and register their faces.</p>
              <Button className="mt-4" onClick={() => setAddOpen(true)}>
                Add Student
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="w-full text-[13.5px] hidden sm:table">
                <thead>
                  <tr className="text-left text-ink-faint border-b border-base-border">
                    <th className="font-medium px-4 py-2.5">Name</th>
                    <th className="font-medium px-4 py-2.5">Face</th>
                    <th className="font-medium px-4 py-2.5">Status</th>
                    <th className="font-medium px-4 py-2.5">Last attendance</th>
                    <th className="font-medium px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-base-border last:border-0">
                      <td className="px-4 py-2.5 text-ink">
                        {s.firstName} {s.lastName}
                        {s.studentRef && <span className="text-ink-faint"> · {s.studentRef}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={s.faceRegistered ? "good" : "neutral"}>
                          {s.faceRegistered ? "Registered" : "Not registered"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {s.lastAttendance ? (
                          <Badge tone={statusTone(s.lastAttendance.status)}>
                            {s.lastAttendance.status.charAt(0) + s.lastAttendance.status.slice(1).toLowerCase()}
                          </Badge>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">
                        {s.lastAttendance
                          ? new Date(s.lastAttendance.recordedAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <a href={`/students/${s.id}`} className="text-[13px] text-accent hover:text-accent-hover">
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <ul className="sm:hidden divide-y divide-base-border">
                {students.map((s) => (
                  <li key={s.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[14px] font-medium text-ink">
                        {s.firstName} {s.lastName}
                      </p>
                      <a href={`/students/${s.id}`} className="text-[13px] text-accent">
                        View
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge tone={s.faceRegistered ? "good" : "neutral"}>
                        {s.faceRegistered ? "Registered" : "Not registered"}
                      </Badge>
                      {s.lastAttendance && (
                        <Badge tone={statusTone(s.lastAttendance.status)}>
                          {s.lastAttendance.status.charAt(0) + s.lastAttendance.status.slice(1).toLowerCase()}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {tab === "Attendance" && (
        <Card>
          <p className="text-[13px] font-medium text-ink mb-3">
            {latestLesson ? `Most recent session — ${new Date(latestLesson.startsAt).toLocaleDateString()}` : "Attendance"}
          </p>
          {!latestLesson ? (
            <p className="text-[13px] text-ink-faint py-6 text-center">No attendance records yet.</p>
          ) : (
            <p className="text-[13px] text-ink-muted">
              {latestLesson.presentCount} of {students.length} students were marked present. Full history is
              available on the Attendance page.
            </p>
          )}
        </Card>
      )}

      {tab === "Sessions" && (
        <Card className="p-0 overflow-hidden">
          {lessons.length === 0 ? (
            <p className="text-[13px] text-ink-faint py-14 text-center">No sessions yet.</p>
          ) : (
            <ul className="divide-y divide-base-border">
              {lessons.map((l) => (
                <li key={l.id} className="px-4 py-3 flex items-center justify-between text-[13.5px]">
                  <div>
                    <p className="text-ink">{l.title}</p>
                    <p className="text-ink-faint text-[12.5px] mt-0.5">
                      {new Date(l.startsAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-ink-muted">
                      {l.presentCount} / {students.length}
                    </span>
                    <Badge tone={l.status === "ACTIVE" ? "accent" : l.status === "COMPLETED" ? "neutral" : "warn"}>
                      {l.status === "ACTIVE" ? "Active" : l.status === "COMPLETED" ? "Completed" : "Upcoming"}
                    </Badge>
                    {l.status === "ACTIVE" && (
                      <a href={`/groups/${group.id}/session/${l.id}`} className="text-accent text-[13px]">
                        Open
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <AddStudentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        groupId={group.id}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
