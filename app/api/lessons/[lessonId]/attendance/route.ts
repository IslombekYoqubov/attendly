import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionOrThrow, handleApiError } from "@/lib/authz";
import { loadOwnedLesson } from "@/lib/lessonAuthz";
import { recordFaceAttendance } from "@/services/attendanceService";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  studentId: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

// Called by the live session UI when the browser-side recognizer produces a
// high-confidence match. Confidence never determines identity server-side —
// it only annotates the record — the client already applied the threshold.
export async function POST(req: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const lesson = await loadOwnedLesson(params.lessonId, session);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const student = await prisma.student.findFirst({
      where: { id: parsed.data.studentId, groupId: lesson.groupId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student is not a member of this group." }, { status: 404 });
    }

    const result = await recordFaceAttendance({
      lessonId: lesson.id,
      studentId: student.id,
      confidence: parsed.data.confidence,
    });

    return NextResponse.json({
      outcome: result.outcome,
      recordedAt: result.recordedAt,
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
