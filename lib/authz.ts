import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "@/lib/session";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireSessionOrThrow(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Unauthorized");
  return session;
}

/** Confirms the group exists and belongs to the caller (admins may access any group). */
export async function requireOwnedGroup(groupId: string, session: SessionPayload) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new ApiError(404, "Group not found.");
  if (group.ownerId !== session.userId && session.role !== "ADMIN") {
    throw new ApiError(403, "You do not have access to this group.");
  }
  return group;
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
