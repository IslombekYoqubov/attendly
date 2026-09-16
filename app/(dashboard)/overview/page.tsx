import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getOverviewStats } from "@/services/attendanceService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function OverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const stats = await getOverviewStats(session.userId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-ink">
          {greeting()}, {session.name.split(" ")[0]}
        </h1>
        <p className="text-[13px] text-ink-muted mt-0.5">Attendance overview for today</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <p className="text-[12.5px] text-ink-muted">Students</p>
          <p className="text-[24px] font-semibold text-ink mt-1">{stats.totalStudents}</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-ink-muted">Present Today</p>
          <p className="text-[24px] font-semibold text-good mt-1">{stats.presentCount}</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-ink-muted">Absent</p>
          <p className="text-[24px] font-semibold text-bad mt-1">{stats.absentCount}</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-ink-muted">Attendance Rate</p>
          <p className="text-[24px] font-semibold text-ink mt-1">{stats.attendanceRate.toFixed(1)}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-6">
        <Card>
          <p className="text-[13px] font-medium text-ink mb-3">Today&apos;s Sessions</p>
          {stats.todaysLessons.length === 0 ? (
            <p className="text-[13px] text-ink-faint py-6 text-center">No sessions scheduled today.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-base-border">
              {stats.todaysLessons.map((l) => (
                <li key={l.id} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <Link href={`/groups/${l.group.id}`} className="text-[13.5px] text-ink hover:text-accent">
                      {l.group.name}
                    </Link>
                    <Badge tone={l.status === "ACTIVE" ? "accent" : l.status === "COMPLETED" ? "neutral" : "warn"}>
                      {l.status === "ACTIVE" ? "Active" : l.status === "COMPLETED" ? "Completed" : "Upcoming"}
                    </Badge>
                  </div>
                  <p className="text-[12.5px] text-ink-faint mt-0.5">
                    {new Date(l.startsAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    {l.endsAt &&
                      ` — ${new Date(l.endsAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`}
                    {" · "}
                    {l.attendances.filter((a) => a.status === "PRESENT").length} present
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="text-[13px] font-medium text-ink mb-3">Recent Activity</p>
          {stats.recentActivity.length === 0 ? (
            <p className="text-[13px] text-ink-faint py-6 text-center">No activity yet today.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-base-border">
              {stats.recentActivity.map((a) => (
                <li key={a.id} className="py-2.5 flex items-center gap-3 text-[13px]">
                  <span className="text-ink-faint tabular-nums w-12 shrink-0">
                    {new Date(a.recordedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-ink">
                    {a.student.firstName} {a.student.lastName} marked {a.status.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
