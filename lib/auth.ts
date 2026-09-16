import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSession } from "@/lib/session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function authenticate(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }

  await createSession(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    rememberMe
  );

  return { ok: true };
}

export async function logout() {
  await destroySession();
}

// Throws-free accessor for use in server components / route handlers.
export async function requireSession() {
  const session = await getSession();
  return session;
}
