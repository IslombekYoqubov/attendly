import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AttendanceFilters } from "./AttendanceFilters";

function statusTone(status: string) {
  if (status === "PRESENT") return "good" as const;
  if (status === "LATE") return "warn" as const;
  return "bad" as const;
}

export default async function AttendanceHistoryPage({
  searchParams,
}: {
  searchParams: { group?: string; date?: string; student?: string; status?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const groups = await prisma.group.findMany({
    where: session.role === "ADMIN" ? {} : { ownerId: session.userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const groupIds = groups.map((g) => g.id);

  const where: Record<string, unknown> = { lesson: { groupId: { in: groupIds } } };

  if (searchParams.group && groupIds.includes(searchParams.group)) {
    where.lesson = { groupId: searchParams.group };
  }
  if (searchParams.status && ["PRESENT", "ABSENT", "LATE"].includes(searchParams.status)) {
    where.status = searchParams.status;
  }
  if (searchParams.student) {
    where.student = {
      OR: [
        { firstName: { contains: searchParams.student, mode: "insensitive" } },
        { lastName: { contains: searchParams.student, mode: "insensitive" } },
      ],
    };
  }
  if (searchParams.date) {
    const start = new Date(searchParams.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(searchParams.date);
    end.setHours(23, 59, 59, 999);
    where.recordedAt = { gte: start, lte: end };
  }

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { recordedAt: "desc" },
    take: 200,
    include: { student: true, lesson: { include: { group: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-ink">Attendance</h1>
        <p className="text-[13px] text-ink-muted mt-0.5">Full history across all your groups.</p>
      </div>

      <AttendanceFilters groups={groups} current={searchParams} />

      <Card className="p-0 overflow-hidden mt-4">
        {records.length === 0 ? (
          <p className="text-[13px] text-ink-faint py-14 text-center">No attendance records yet.</p>
        ) : (
          <>
            <table className="w-full text-[13.5px] hidden md:table">
              <thead>
                <tr className="text-left text-ink-faint border-b border-base-border">
                  <th className="font-medium px-4 py-2.5">Date</th>
                  <th className="font-medium px-4 py-2.5">Group</th>
                  <th className="font-medium px-4 py-2.5">Student</th>
                  <th className="font-medium px-4 py-2.5">Status</th>
                  <th className="font-medium px-4 py-2.5">Time</th>
                  <th className="font-medium px-4 py-2.5">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-base-border last:border-0">
                    <td className="px-4 py-2.5 text-ink-muted">
                      {new Date(r.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-ink">{r.lesson.group.name}</td>
                    <td className="px-4 py-2.5 text-ink">
                      {r.student.firstName} {r.student.lastName}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={statusTone(r.status)}>
                        {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {new Date(r.recordedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="md:hidden divide-y divide-base-border">
              {records.map((r) => (
                <li key={r.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-medium text-ink">
                      {r.student.firstName} {r.student.lastName}
                    </p>
                    <Badge tone={statusTone(r.status)}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge>
                  </div>
                  <p className="text-[12.5px] text-ink-faint mt-1">
                    {r.lesson.group.name} ·{" "}
                    {new Date(r.recordedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
