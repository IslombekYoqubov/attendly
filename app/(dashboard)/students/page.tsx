import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function StudentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const students = await prisma.student.findMany({
    where: session.role === "ADMIN" ? {} : { group: { ownerId: session.userId } },
    orderBy: { firstName: "asc" },
    include: { group: { select: { id: true, name: true } }, faceEnrollment: { select: { id: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-ink">Students</h1>
        <p className="text-[13px] text-ink-muted mt-0.5">Every student across your groups.</p>
      </div>

      {students.length === 0 ? (
        <Card className="text-center py-14">
          <p className="text-[14px] text-ink">No students yet.</p>
          <p className="text-[13px] text-ink-muted mt-1">Add students from within a group.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-[13.5px] hidden sm:table">
            <thead>
              <tr className="text-left text-ink-faint border-b border-base-border">
                <th className="font-medium px-4 py-2.5">Name</th>
                <th className="font-medium px-4 py-2.5">Group</th>
                <th className="font-medium px-4 py-2.5">Face</th>
                <th className="font-medium px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-base-border last:border-0">
                  <td className="px-4 py-2.5 text-ink">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted">
                    <Link href={`/groups/${s.group.id}`} className="hover:text-accent">
                      {s.group.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={s.faceEnrollment ? "good" : "neutral"}>
                      {s.faceEnrollment ? "Registered" : "Not registered"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/students/${s.id}`} className="text-[13px] text-accent hover:text-accent-hover">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="sm:hidden divide-y divide-base-border">
            {students.map((s) => (
              <li key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-ink">
                    {s.firstName} {s.lastName}
                  </p>
                  <p className="text-[12.5px] text-ink-faint mt-0.5">{s.group.name}</p>
                </div>
                <Link href={`/students/${s.id}`} className="text-[13px] text-accent">
                  View
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
