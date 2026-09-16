"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ReenrollFaceModal } from "@/components/students/ReenrollFaceModal";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  studentRef: string | null;
  groupId: string;
  groupName: string;
  faceRegistered: boolean;
};

function statusTone(status: string) {
  if (status === "PRESENT") return "good" as const;
  if (status === "LATE") return "warn" as const;
  return "bad" as const;
}

export function StudentProfileClient({
  student,
  stats,
  attendances,
}: {
  student: Student;
  stats: { present: number; absent: number; late: number; rate: number };
  attendances: { id: string; date: string; lesson: string; status: string; time: string }[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [reenrollOpen, setReenrollOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName);
  const [studentRef, setStudentRef] = useState(student.studentRef ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(student.faceRegistered);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, studentRef: studentRef || undefined }),
      });
      setEditOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      router.push(`/groups/${student.groupId}`);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <Link href={`/groups/${student.groupId}`} className="text-[13px] text-ink-muted hover:text-ink">
        ← {student.groupName}
      </Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            {firstName} {lastName}
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {student.studentRef && `Student ID ${studentRef} · `}
            <span className={faceRegistered ? "text-good" : "text-ink-faint"}>
              {faceRegistered ? "Face registered" : "Face not registered"}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setReenrollOpen(true)}>
            Re-register face
          </Button>
          <Button variant="danger" size="sm" onClick={() => setRemoveOpen(true)}>
            Remove
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <p className="text-[12.5px] text-ink-muted">Attendance rate</p>
          <p className="text-[24px] font-semibold text-ink mt-1">{stats.rate}%</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-ink-muted">Present</p>
          <p className="text-[24px] font-semibold text-good mt-1">{stats.present}</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-ink-muted">Absent</p>
          <p className="text-[24px] font-semibold text-bad mt-1">{stats.absent}</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-ink-muted">Late</p>
          <p className="text-[24px] font-semibold text-warn mt-1">{stats.late}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <p className="text-[13px] font-medium text-ink px-4 pt-4 pb-2">Attendance history</p>
        {attendances.length === 0 ? (
          <p className="text-[13px] text-ink-faint py-10 text-center">No attendance records yet.</p>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-ink-faint border-b border-base-border">
                <th className="font-medium px-4 py-2.5">Date</th>
                <th className="font-medium px-4 py-2.5">Lesson</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5">Time</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((a) => (
                <tr key={a.id} className="border-b border-base-border last:border-0">
                  <td className="px-4 py-2.5 text-ink-muted">
                    {new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5 text-ink">{a.lesson}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusTone(a.status)}>{a.status.charAt(0) + a.status.slice(1).toLowerCase()}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted">
                    {new Date(a.time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit student">
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
          <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <Input label="Student ID" value={studentRef} onChange={(e) => setStudentRef(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ReenrollFaceModal
        open={reenrollOpen}
        onClose={() => setReenrollOpen(false)}
        studentId={student.id}
        onSuccess={() => {
          setFaceRegistered(true);
          router.refresh();
        }}
      />

      <Modal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Are you sure?"
        description="This will remove the student's attendance relationship and biometric enrollment."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRemoveOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRemove} isLoading={removing}>
            Remove Student
          </Button>
        </div>
      </Modal>
    </div>
  );
}
