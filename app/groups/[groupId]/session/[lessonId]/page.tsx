import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SessionClient } from "./SessionClient";

export default async function AttendanceSessionPage({
  params,
}: {
  params: { groupId: string; lessonId: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    include: { group: true },
  });
  if (!lesson || lesson.groupId !== params.groupId) notFound();
  if (lesson.group.ownerId !== session.userId && session.role !== "ADMIN") notFound();

  return (
    <SessionClient
      lessonId={lesson.id}
      groupId={lesson.groupId}
      groupName={lesson.group.name}
      startsAt={lesson.startsAt.toISOString()}
      initialStatus={lesson.status}
    />
  );
}
