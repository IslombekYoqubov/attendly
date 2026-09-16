import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { GroupDetailClient } from "./GroupDetailClient";

export default async function GroupDetailPage({ params }: { params: { groupId: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const group = await prisma.group.findUnique({ where: { id: params.groupId } });
  if (!group) notFound();
  if (group.ownerId !== session.userId && session.role !== "ADMIN") notFound();

  const [students, lessons] = await Promise.all([
    prisma.student.findMany({
      where: { groupId: group.id },
      orderBy: { firstName: "asc" },
      include: {
        faceEnrollment: { select: { id: true } },
        attendances: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
    }),
    prisma.lesson.findMany({
      where: { groupId: group.id },
      orderBy: { startsAt: "desc" },
      take: 15,
      include: { attendances: { select: { status: true } } },
    }),
  ]);

  const shapedStudents = students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    studentRef: s.studentRef,
    faceRegistered: !!s.faceEnrollment,
    lastAttendance: s.attendances[0]
      ? { status: s.attendances[0].status, recordedAt: s.attendances[0].recordedAt.toISOString() }
      : null,
  }));

  const shapedLessons = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    startsAt: l.startsAt.toISOString(),
    endsAt: l.endsAt?.toISOString() ?? null,
    status: l.status,
    presentCount: l.attendances.filter((a) => a.status === "PRESENT").length,
  }));

  const activeLesson = shapedLessons.find((l) => l.status === "ACTIVE") ?? null;

  return (
    <GroupDetailClient
      group={{ id: group.id, name: group.name, description: group.description }}
      students={shapedStudents}
      lessons={shapedLessons}
      activeLessonId={activeLesson?.id ?? null}
    />
  );
}
