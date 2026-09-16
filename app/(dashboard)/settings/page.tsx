import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

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
  if (!user) redirect("/login");

  return <SettingsClient user={user} />;
}
