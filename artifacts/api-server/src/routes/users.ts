import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

const formatUser = (u: any) => ({
  id: u.id, phone: u.phone, name: u.name, role: u.role,
  rating: u.rating, totalRides: u.totalRides, isOnline: u.isOnline,
});

router.get("/me", requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({ user: formatUser(user) });
});

router.put("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const updated = await db
    .update(usersTable)
    .set({ name })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({ user: formatUser(updated[0]!) });
});

router.put("/me/online", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { isOnline } = req.body as { isOnline: boolean };
  const updated = await db
    .update(usersTable)
    .set({ isOnline })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({ user: formatUser(updated[0]!) });
});

export default router;
