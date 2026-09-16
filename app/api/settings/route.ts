import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow, handleApiError } from "@/lib/authz";

export async function GET() {
  try {
    const session = await requireSessionOrThrow();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        name: true,
        email: true,
        role: true,
        defaultLessonDurationMinutes: true,
        lateThresholdMinutes: true,
        autoConfirmThreshold: true,
        confirmationThreshold: true,
      },
    });
    return NextResponse.json({ settings: user });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  defaultLessonDurationMinutes: z.number().int().min(15).max(480).optional(),
  lateThresholdMinutes: z.number().int().min(0).max(120).optional(),
  autoConfirmThreshold: z.number().min(0.3).max(0.95).optional(),
  confirmationThreshold: z.number().min(0.2).max(0.9).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSessionOrThrow();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    if (
      parsed.data.autoConfirmThreshold != null &&
      parsed.data.confirmationThreshold != null &&
      parsed.data.confirmationThreshold >= parsed.data.autoConfirmThreshold
    ) {
      return NextResponse.json(
        { error: "The confirmation threshold must be lower than the automatic threshold." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({ where: { id: session.userId }, data: parsed.data });
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    return handleApiError(err);
  }
}
