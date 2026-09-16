import "server-only";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/authz";
import type { SessionPayload } from "@/lib/session";

export async function loadOwnedLesson(lessonId: string, session: SessionPayload) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { group: true } });
  if (!lesson) throw new ApiError(404, "Session not found.");
  if (lesson.group.ownerId !== session.userId && session.role !== "ADMIN") {
    throw new ApiError(403, "Forbidden.");
  }
  return lesson;
}
