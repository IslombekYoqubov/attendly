import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow, handleApiError } from "@/lib/authz";
import { loadOwnedLesson } from "@/lib/lessonAuthz";

export async function GET(_req: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const lesson = await loadOwnedLesson(params.lessonId, session);
    const attendances = await prisma.attendance.findMany({
      where: { lessonId: lesson.id },
      include: { student: true },
      orderBy: { recordedAt: "desc" },
    });
    return NextResponse.json({ lesson, attendances });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "COMPLETED", "UPCOMING"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    await loadOwnedLesson(params.lessonId, session);

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const data: { status?: "ACTIVE" | "COMPLETED" | "UPCOMING"; endsAt?: Date } = {};
    if (parsed.data.status) {
      data.status = parsed.data.status;
      if (parsed.data.status === "COMPLETED") data.endsAt = new Date();
    }

    const lesson = await prisma.lesson.update({ where: { id: params.lessonId }, data });
    return NextResponse.json({ lesson });
  } catch (err) {
    return handleApiError(err);
  }
}
