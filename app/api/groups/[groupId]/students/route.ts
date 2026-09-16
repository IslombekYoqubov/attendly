import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow, requireOwnedGroup, handleApiError } from "@/lib/authz";

const createSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  studentRef: z.string().trim().max(60).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireSessionOrThrow();
    const group = await requireOwnedGroup(params.groupId, session);

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        studentRef: parsed.data.studentRef || undefined,
        groupId: group.id,
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
