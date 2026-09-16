import "server-only";
import { prisma } from "@/lib/prisma";
import type { AttendanceStatus } from "@prisma/client";

export type RecordAttendanceInput = {
  lessonId: string;
  studentId: string;
  confidence: number; // similarity score, 0..1
};

export type RecordAttendanceResult =
  | { outcome: "recorded"; recordedAt: Date }
  | { outcome: "already-recorded"; recordedAt: Date };

/**
 * Records a face-recognition attendance event. Relies on the database's
 * unique (lessonId, studentId) constraint as the source of truth for
 * duplicate prevention — safe even under concurrent recognition requests.
 */
export async function recordFaceAttendance(
  input: RecordAttendanceInput
): Promise<RecordAttendanceResult> {
  const existing = await prisma.attendance.findUnique({
    where: { lessonId_studentId: { lessonId: input.lessonId, studentId: input.studentId } },
  });

  if (existing) {
    return { outcome: "already-recorded", recordedAt: existing.recordedAt };
  }

  try {
    const created = await prisma.attendance.create({
      data: {
        lessonId: input.lessonId,
        studentId: input.studentId,
        status: "PRESENT",
        source: "FACE_RECOGNITION",
        confidence: input.confidence,
      },
    });
    return { outcome: "recorded", recordedAt: created.recordedAt };
  } catch (err: unknown) {
    // Unique constraint race: another request recorded it first.
    const existingAfterRace = await prisma.attendance.findUnique({
      where: { lessonId_studentId: { lessonId: input.lessonId, studentId: input.studentId } },
    });
    if (existingAfterRace) {
      return { outcome: "already-recorded", recordedAt: existingAfterRace.recordedAt };
    }
    throw err;
  }
}

export async function setManualAttendance(params: {
  lessonId: string;
  studentId: string;
  status: AttendanceStatus;
  changedById: string;
  reason?: string;
}) {
  const { lessonId, studentId, status, changedById, reason } = params;

  const existing = await prisma.attendance.findUnique({
    where: { lessonId_studentId: { lessonId, studentId } },
  });

  if (!existing) {
    const created = await prisma.attendance.create({
      data: { lessonId, studentId, status, source: "MANUAL" },
    });
    await prisma.attendanceAudit.create({
      data: {
        attendanceId: created.id,
        fromStatus: null,
        toStatus: status,
        reason: reason ?? "Manually recorded",
        changedById,
      },
    });
    return created;
  }

  const updated = await prisma.attendance.update({
    where: { id: existing.id },
    data: { status, source: "MANUAL" },
  });
  await prisma.attendanceAudit.create({
    data: {
      attendanceId: existing.id,
      fromStatus: existing.status,
      toStatus: status,
      reason: reason ?? "Manually corrected",
      changedById,
    },
  });
  return updated;
}

export async function getGroupTodayStats(groupId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [studentCount, lesson] = await Promise.all([
    prisma.student.count({ where: { groupId } }),
    prisma.lesson.findFirst({
      where: { groupId, startsAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { startsAt: "desc" },
      include: { attendances: true },
    }),
  ]);

  const present = lesson?.attendances.filter((a) => a.status === "PRESENT").length ?? 0;

  return { studentCount, present, lesson };
}

export async function getOverviewStats(ownerId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const groups = await prisma.group.findMany({
    where: { ownerId },
    select: { id: true, _count: { select: { students: true } } },
  });
  const groupIds = groups.map((g) => g.id);
  const totalStudents = groups.reduce((sum, g) => sum + g._count.students, 0);

  const todaysLessons = await prisma.lesson.findMany({
    where: { groupId: { in: groupIds }, startsAt: { gte: startOfDay, lte: endOfDay } },
    include: {
      group: { select: { name: true, id: true } },
      attendances: { select: { status: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const presentCount = todaysLessons.reduce(
    (sum, l) => sum + l.attendances.filter((a) => a.status === "PRESENT").length,
    0
  );
  const totalAttendanceSlots = todaysLessons.reduce((sum, l) => sum + l.attendances.length, 0);

  const recentActivity = await prisma.attendance.findMany({
    where: { lesson: { groupId: { in: groupIds } }, recordedAt: { gte: startOfDay } },
    orderBy: { recordedAt: "desc" },
    take: 8,
    include: { student: true },
  });

  return {
    totalStudents,
    todaysLessons,
    presentCount,
    absentCount: Math.max(0, totalStudents - presentCount),
    attendanceRate: totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0,
    recentActivity,
  };
}
