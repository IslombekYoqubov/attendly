import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow, requireOwnedGroup, handleApiError } from "@/lib/authz";

async function loadStudentAndAuthorize(studentId: string, userId: string, role: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { group: true, faceEnrollment: { select: { id: true, createdAt: true, quality: true } } },
  });
  if (!student) return null;
  if (student.group.ownerId !== userId && role !== "ADMIN") return "forbidden" as const;
  return student;
}

export async function GET(_req: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const student = await loadStudentAndAuthorize(params.studentId, session.userId, session.role);
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (student === "forbidden") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const attendances = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { recordedAt: "desc" },
      include: { lesson: { select: { title: true, startsAt: true } } },
      take: 50,
    });

    const stats = {
      present: attendances.filter((a) => a.status === "PRESENT").length,
      absent: attendances.filter((a) => a.status === "ABSENT").length,
      late: attendances.filter((a) => a.status === "LATE").length,
    };
    const total = attendances.length;
    const rate = total > 0 ? ((stats.present + stats.late) / total) * 100 : 0;

    return NextResponse.json({ student, attendances, stats, attendanceRate: rate });
  } catch (err) {
    return handleApiError(err);
  }
}

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  studentRef: z.string().trim().max(60).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const student = await loadStudentAndAuthorize(params.studentId, session.userId, session.role);
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (student === "forbidden") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const updated = await prisma.student.update({ where: { id: params.studentId }, data: parsed.data });
    return NextResponse.json({ student: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const student = await loadStudentAndAuthorize(params.studentId, session.userId, session.role);
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (student === "forbidden") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    await prisma.student.delete({ where: { id: params.studentId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
