import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow, handleApiError, ApiError } from "@/lib/authz";

const enrollSchema = z.object({
  embedding: z.array(z.number()).length(128, "Malformed face embedding."),
  quality: z.number().min(0).max(1),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Consent is required before enrolling a face." }),
  }),
});

async function authorizeStudent(studentId: string, userId: string, role: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { group: true } });
  if (!student) throw new ApiError(404, "Student not found.");
  if (student.group.ownerId !== userId && role !== "ADMIN") {
    throw new ApiError(403, "Forbidden.");
  }
  return student;
}

// Enroll or re-enroll a student's face. Only the numeric embedding is ever
// persisted — the request body's embedding values are never logged.
export async function POST(req: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    await authorizeStudent(params.studentId, session.userId, session.role);

    const body = await req.json().catch(() => null);
    const parsed = enrollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid face data." },
        { status: 400 }
      );
    }

    if (parsed.data.embedding.some((v) => !Number.isFinite(v))) {
      return NextResponse.json({ error: "Invalid face data." }, { status: 400 });
    }

    const enrollment = await prisma.faceEnrollment.upsert({
      where: { studentId: params.studentId },
      update: { faceEmbedding: parsed.data.embedding, quality: parsed.data.quality },
      create: {
        studentId: params.studentId,
        faceEmbedding: parsed.data.embedding,
        quality: parsed.data.quality,
      },
    });

    return NextResponse.json({ ok: true, enrolledAt: enrollment.updatedAt });
  } catch (err) {
    return handleApiError(err);
  }
}

// Privacy control: permanently deletes stored biometric data for a student
// without deleting their attendance history.
export async function DELETE(_req: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    await authorizeStudent(params.studentId, session.userId, session.role);

    await prisma.faceEnrollment.deleteMany({ where: { studentId: params.studentId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
