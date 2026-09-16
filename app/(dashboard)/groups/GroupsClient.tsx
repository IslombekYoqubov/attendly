"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  studentCount: number;
  lastLesson: { startsAt: string; status: string; presentCount: number } | null;
};

export function GroupsClient({ initialGroups }: { initialGroups: GroupSummary[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data.groups);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setModalOpen(false);
      setName("");
      setDescription("");
      await refresh();
    } catch {
      setError("Connection lost. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Groups</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">Manage student groups and their rosters.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Create Group</Button>
      </div>

      {groups.length === 0 ? (
        <Card className="text-center py-14">
          <p className="text-[14px] text-ink">No groups yet.</p>
          <p className="text-[13px] text-ink-muted mt-1">Create a group to start managing attendance.</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            Create Group
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
            >
              <Link href={`/groups/${group.id}`}>
                <Card className="h-full hover:border-base-borderStrong transition-colors duration-150">
                  <p className="text-[14px] font-medium text-ink">{group.name}</p>
                  <p className="text-[13px] text-ink-muted mt-1">{group.studentCount} students</p>
                  {group.lastLesson ? (
                    <>
                      <p className="text-[13px] text-ink-muted mt-3">
                        {group.lastLesson.presentCount} present {group.lastLesson.status === "ACTIVE" ? "now" : "last session"}
                      </p>
                      <p className="text-[12px] text-ink-faint mt-1">
                        Last session:{" "}
                        {new Date(group.lastLesson.startsAt).toLocaleString(undefined, {
                          weekday: undefined,
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </>
                  ) : (
                    <p className="text-[13px] text-ink-faint mt-3">No sessions yet</p>
                  )}
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create group" description="Give the group a name teachers and students will recognize.">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <p className="text-[13px] text-bad">{error}</p>}
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Create Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
