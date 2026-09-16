import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow, handleApiError } from "@/lib/authz";

export async function GET() {
  try {
    const session = await requireSessionOrThrow();
    const groups = await prisma.group.findMany({
      where: session.role === "ADMIN" ? {} : { ownerId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { students: true } },
        lessons: {
          orderBy: { startsAt: "desc" },
          take: 1,
          include: { attendances: { select: { status: true } } },
        },
      },
    });

    const shaped = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      studentCount: g._count.students,
      lastLesson: g.lessons[0]
        ? {
            startsAt: g.lessons[0].startsAt,
            status: g.lessons[0].status,
            presentCount: g.lessons[0].attendances.filter((a) => a.status === "PRESENT").length,
          }
        : null,
    }));

    return NextResponse.json({ groups: shaped });
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Group name is too short.").max(120),
  description: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionOrThrow();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        ownerId: session.userId,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
