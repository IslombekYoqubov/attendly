import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow, requireOwnedGroup, handleApiError } from "@/lib/authz";

export async function GET(_req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const group = await requireOwnedGroup(params.groupId, session);

    const lessons = await prisma.lesson.findMany({
      where: { groupId: group.id },
      orderBy: { startsAt: "desc" },
      include: { attendances: { select: { status: true } } },
    });

    return NextResponse.json({ lessons });
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  durationMinutes: z.number().int().positive().max(600).optional(),
});

// Starts a new attendance session for the group. Any prior ACTIVE lesson in
// this group is marked COMPLETED first, so only one session runs at a time.
export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const group = await requireOwnedGroup(params.groupId, session);

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const owner = await prisma.user.findUnique({
      where: { id: group.ownerId },
      select: { defaultLessonDurationMinutes: true },
    });
    const durationMinutes = parsed.data.durationMinutes ?? owner?.defaultLessonDurationMinutes ?? 90;

    await prisma.lesson.updateMany({
      where: { groupId: group.id, status: "ACTIVE" },
      data: { status: "COMPLETED", endsAt: new Date() },
    });

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    const lesson = await prisma.lesson.create({
      data: {
        groupId: group.id,
        title: parsed.data.title || group.name,
        startsAt,
        endsAt,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
