"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";

export function AttendanceFilters({
  groups,
  current,
}: {
  groups: { id: string; name: string }[];
  current: { group?: string; date?: string; student?: string; status?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-medium text-ink-muted">Group</label>
        <select
          defaultValue={current.group ?? ""}
          onChange={(e) => update("group", e.target.value)}
          className="rounded-control glass px-3 py-1.5 text-[13px] text-ink"
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-medium text-ink-muted">Date</label>
        <input
          type="date"
          defaultValue={current.date ?? ""}
          onChange={(e) => update("date", e.target.value)}
          className="rounded-control glass px-3 py-1.5 text-[13px] text-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-medium text-ink-muted">Student</label>
        <input
          type="text"
          placeholder="Search name"
          defaultValue={current.student ?? ""}
          onChange={(e) => update("student", e.target.value)}
          className="rounded-control glass px-3 py-1.5 text-[13px] text-ink placeholder:text-ink-faint"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-medium text-ink-muted">Status</label>
        <select
          defaultValue={current.status ?? ""}
          onChange={(e) => update("status", e.target.value)}
          className="rounded-control glass px-3 py-1.5 text-[13px] text-ink"
        >
          <option value="">All statuses</option>
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="LATE">Late</option>
        </select>
      </div>
    </Card>
  );
}
