import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StudentProfileClient } from "./StudentProfileClient";

export default async function StudentProfilePage({ params }: { params: { studentId: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    include: { group: true, faceEnrollment: { select: { id: true, createdAt: true } } },
  });
  if (!student) notFound();
  if (student.group.ownerId !== session.userId && session.role !== "ADMIN") notFound();

  const attendances = await prisma.attendance.findMany({
    where: { studentId: student.id },
    orderBy: { recordedAt: "desc" },
    include: { lesson: { select: { title: true, startsAt: true } } },
    take: 50,
  });

  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const absent = attendances.filter((a) => a.status === "ABSENT").length;
  const late = attendances.filter((a) => a.status === "LATE").length;
  const total = attendances.length;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <StudentProfileClient
      student={{
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentRef: student.studentRef,
        groupId: student.groupId,
        groupName: student.group.name,
        faceRegistered: !!student.faceEnrollment,
      }}
      stats={{ present, absent, late, rate }}
      attendances={attendances.map((a) => ({
        id: a.id,
        date: a.recordedAt.toISOString(),
        lesson: a.lesson.title,
        status: a.status,
        time: a.recordedAt.toISOString(),
      }))}
    />
  );
}
