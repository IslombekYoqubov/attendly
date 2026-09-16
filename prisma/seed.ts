/**
 * Development seed data only. Run explicitly with `npm run db:seed`.
 * Never run automatically as part of build/deploy — production data must
 * come from real usage of the application, not this script.
 *
 * Creates an admin account and a couple of empty groups with students who
 * have NOT been face-enrolled (enrollment requires a real camera capture,
 * which this script cannot perform). No attendance or session history is
 * fabricated — the dashboard should read zeros until real sessions run.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    console.error("Refusing to seed a production environment. Set ALLOW_PROD_SEED=true to override.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@attendly.dev" },
    update: {},
    create: {
      email: "admin@attendly.dev",
      passwordHash,
      name: "Administrator",
      role: "ADMIN",
    },
  });

  const androidDev = await prisma.group.upsert({
    where: { id: "seed-group-android" },
    update: {},
    create: {
      id: "seed-group-android",
      name: "Android Development",
      description: "Mobile application development, second-year cohort",
      ownerId: admin.id,
    },
  });

  const dataStructures = await prisma.group.upsert({
    where: { id: "seed-group-ds" },
    update: {},
    create: {
      id: "seed-group-ds",
      name: "Data Structures & Algorithms",
      description: "Core computer science curriculum",
      ownerId: admin.id,
    },
  });

  const roster: Array<[string, string, string]> = [
    ["Islombek", "Yoqubov", "ST-1001"],
    ["Aziz", "Karimov", "ST-1002"],
    ["Sardor", "Xasanov", "ST-1003"],
    ["Bekzod", "Aliyev", "ST-1004"],
  ];

  for (const [firstName, lastName, studentRef] of roster) {
    await prisma.student.upsert({
      where: { id: `seed-${studentRef}` },
      update: {},
      create: {
        id: `seed-${studentRef}`,
        firstName,
        lastName,
        studentRef,
        groupId: androidDev.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@attendly.dev / ChangeMe123!");
  console.log(`Groups created: ${androidDev.name}, ${dataStructures.name}`);
  console.log("No students are face-enrolled yet — enroll them from the app to test recognition.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
