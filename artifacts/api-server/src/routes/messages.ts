import { Router } from "express";
import { db, messagesTable, ridesTable, usersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth.js";
import { randomUUID } from "crypto";

const router = Router();

// GET /api/rides/:rideId/messages — fetch all messages for a ride
router.get("/:rideId/messages", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { rideId } = req.params;

  // Verify user is part of this ride
  const rides = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId!)).limit(1);
  if (!rides.length) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }
  const ride = rides[0]!;
  if (ride.riderId !== user.id && ride.driverId !== user.id) {
    res.status(403).json({ error: "Not authorized for this ride" });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.rideId, rideId!))
    .orderBy(asc(messagesTable.createdAt));

  res.json({ messages: msgs });
});

// POST /api/rides/:rideId/messages — send a message
router.post("/:rideId/messages", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { rideId } = req.params;
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ error: "Message content is required" });
    return;
  }

  // Verify user is part of this ride
  const rides = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId!)).limit(1);
  if (!rides.length) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }
  const ride = rides[0]!;
  if (ride.riderId !== user.id && ride.driverId !== user.id) {
    res.status(403).json({ error: "Not authorized for this ride" });
    return;
  }

  const msg = await db.insert(messagesTable).values({
    id: nanoid(),
    rideId: rideId!,
    senderId: user.id,
    senderRole: user.role as "rider" | "driver",
    content: content.trim(),
  }).returning();

  res.json({ message: msg[0]! });
});

// GET /api/rides/:rideId/partner-phone — get the other party's phone number
router.get("/:rideId/partner-phone", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { rideId } = req.params;

  const rides = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId!)).limit(1);
  if (!rides.length) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }
  const ride = rides[0]!;
  if (ride.riderId !== user.id && ride.driverId !== user.id) {
    res.status(403).json({ error: "Not authorized for this ride" });
    return;
  }

  // Get the partner's ID (not the current user)
  const partnerId = user.id === ride.riderId ? ride.driverId : ride.riderId;
  if (!partnerId) {
    res.status(404).json({ error: "Partner not found" });
    return;
  }

  const partners = await db.select({ phone: usersTable.phone, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, partnerId))
    .limit(1);

  if (!partners.length) {
    res.status(404).json({ error: "Partner not found" });
    return;
  }

  res.json({ phone: partners[0]!.phone, name: partners[0]!.name });
});

export default router;
