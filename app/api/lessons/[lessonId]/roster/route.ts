import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow, handleApiError } from "@/lib/authz";
import { loadOwnedLesson } from "@/lib/lessonAuthz";

// Returns everything the browser-side recognition loop needs for this
// session: enrolled embeddings (only for students who consented and were
// enrolled) plus current attendance state, so duplicates can be short
// circuited client-side too (the server still enforces this).
export async function GET(_req: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const lesson = await loadOwnedLesson(params.lessonId, session);

    const students = await prisma.student.findMany({
      where: { groupId: lesson.groupId },
      orderBy: { firstName: "asc" },
      include: { faceEnrollment: { select: { faceEmbedding: true } } },
    });

    const attendances = await prisma.attendance.findMany({ where: { lessonId: lesson.id } });
    const attendanceByStudent = new Map(attendances.map((a) => [a.studentId, a]));

    const roster = students.map((s) => {
      const attendance = attendanceByStudent.get(s.id);
      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        enrolled: !!s.faceEnrollment,
        embedding: s.faceEnrollment?.faceEmbedding ?? null,
        attendance: attendance ? { status: attendance.status, recordedAt: attendance.recordedAt } : null,
      };
    });

    const owner = await prisma.user.findUnique({
      where: { id: lesson.group.ownerId },
      select: { autoConfirmThreshold: true, confirmationThreshold: true },
    });

    return NextResponse.json({
      lesson,
      roster,
      thresholds: {
        autoConfirm: owner?.autoConfirmThreshold ?? 0.62,
        needsConfirmation: owner?.confirmationThreshold ?? 0.5,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
