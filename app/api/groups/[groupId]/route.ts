import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow, requireOwnedGroup, handleApiError } from "@/lib/authz";

export async function GET(_req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const group = await requireOwnedGroup(params.groupId, session);

    const [students, lessons] = await Promise.all([
      prisma.student.findMany({
        where: { groupId: group.id },
        orderBy: { firstName: "asc" },
        include: {
          faceEnrollment: { select: { id: true, createdAt: true } },
          attendances: { orderBy: { recordedAt: "desc" }, take: 1 },
        },
      }),
      prisma.lesson.findMany({
        where: { groupId: group.id },
        orderBy: { startsAt: "desc" },
        take: 10,
        include: { attendances: { select: { status: true } } },
      }),
    ]);

    return NextResponse.json({ group, students, lessons });
  } catch (err) {
    return handleApiError(err);
  }
}

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    await requireOwnedGroup(params.groupId, session);
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const group = await prisma.group.update({ where: { id: params.groupId }, data: parsed.data });
    return NextResponse.json({ group });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    await requireOwnedGroup(params.groupId, session);
    await prisma.group.delete({ where: { id: params.groupId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
