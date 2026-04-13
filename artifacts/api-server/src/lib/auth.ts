import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const sessions = await db
    .select({ session: sessionsTable, user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.token, token))
    .limit(1);
  if (!sessions.length) return null;
  const { session, user } = sessions[0]!;
  if (session.expiresAt < new Date()) return null;
  return user;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function generateToken(): string {
  return Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2, 10)
  ).join("");
}
