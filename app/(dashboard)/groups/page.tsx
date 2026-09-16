import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { GroupsClient } from "./GroupsClient";

export default async function GroupsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const groups = await prisma.group.findMany({
    where: session.role === "ADMIN" ? {} : { ownerId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true } },
      lessons: { orderBy: { startsAt: "desc" }, take: 1, include: { attendances: { select: { status: true } } } },
    },
  });

  const shaped = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    studentCount: g._count.students,
    lastLesson: g.lessons[0]
      ? {
          startsAt: g.lessons[0].startsAt.toISOString(),
          status: g.lessons[0].status,
          presentCount: g.lessons[0].attendances.filter((a) => a.status === "PRESENT").length,
        }
      : null,
  }));

  return <GroupsClient initialGroups={shaped} />;
}
