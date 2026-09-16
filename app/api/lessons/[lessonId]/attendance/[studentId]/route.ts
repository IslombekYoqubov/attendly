import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionOrThrow, handleApiError } from "@/lib/authz";
import { loadOwnedLesson } from "@/lib/lessonAuthz";
import { setManualAttendance } from "@/services/attendanceService";

const schema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
  reason: z.string().trim().max(300).optional(),
});

// Manual correction path — always available, records who made the change.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { lessonId: string; studentId: string } }
) {
  try {
    const session = await requireSessionOrThrow();
    const lesson = await loadOwnedLesson(params.lessonId, session);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const attendance = await setManualAttendance({
      lessonId: lesson.id,
      studentId: params.studentId,
      status: parsed.data.status,
      changedById: session.userId,
      reason: parsed.data.reason,
    });

    return NextResponse.json({ attendance });
  } catch (err) {
    return handleApiError(err);
  }
}
