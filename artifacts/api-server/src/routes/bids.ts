import { Router } from "express";
import { db, bidsTable, ridesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateId } from "../lib/auth.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router({ mergeParams: true });

async function formatBid(bid: any, driver: any) {
  return {
    id: bid.id,
    rideId: bid.rideId,
    driverId: bid.driverId,
    amount: bid.amount,
    status: bid.status,
    eta: bid.eta,
    driverName: driver?.name ?? "Unknown",
    driverRating: driver?.rating ?? 5,
    carModel: "Toyota Camry • Silver",
    createdAt: bid.createdAt?.toISOString?.() ?? bid.createdAt,
  };
}

export const bidsRouter = Router({ mergeParams: true });

bidsRouter.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { rideId } = req.params;
  if (user.role !== "driver") {
    res.status(403).json({ error: "Only drivers can bid" });
    return;
  }
  const rides = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId!)).limit(1);
  if (!rides.length || rides[0]!.status !== "searching") {
    res.status(400).json({ error: "Ride not available for bidding" });
    return;
  }
  const { amount, eta = "5 min" } = req.body;
  if (!amount) {
    res.status(400).json({ error: "Amount is required" });
    return;
  }
  const bidId = generateId();
  await db.insert(bidsTable).values({
    id: bidId, rideId: rideId!, driverId: user.id, amount, eta,
  });
  const bid = (await db.select().from(bidsTable).where(eq(bidsTable.id, bidId)).limit(1))[0]!;
  res.status(201).json({ bid: await formatBid(bid, user) });
});

bidsRouter.get("/", requireAuth, async (req, res) => {
  const { rideId } = req.params;
  const bids = await db
    .select()
    .from(bidsTable)
    .where(and(eq(bidsTable.rideId, rideId!), eq(bidsTable.status, "pending")));
  const formatted = await Promise.all(
    bids.map(async (b) => {
      const drivers = await db.select().from(usersTable).where(eq(usersTable.id, b.driverId)).limit(1);
      return formatBid(b, drivers[0]);
    })
  );
  res.json({ bids: formatted });
});

bidsRouter.put("/:bidId/accept", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { rideId, bidId } = req.params;
  if (user.role !== "rider") {
    res.status(403).json({ error: "Only riders can accept bids" });
    return;
  }
  const rides = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId!)).limit(1);
  if (!rides.length || rides[0]!.riderId !== user.id) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }
  const bids = await db.select().from(bidsTable).where(eq(bidsTable.id, bidId!)).limit(1);
  if (!bids.length) {
    res.status(404).json({ error: "Bid not found" });
    return;
  }
  const bid = bids[0]!;
  await db.update(bidsTable).set({ status: "accepted" }).where(eq(bidsTable.id, bidId!));
  await db.update(bidsTable)
    .set({ status: "rejected" })
    .where(and(eq(bidsTable.rideId, rideId!), eq(bidsTable.status, "pending")));
  const updated = await db
    .update(ridesTable)
    .set({ status: "accepted", driverId: bid.driverId, finalFare: bid.amount })
    .where(eq(ridesTable.id, rideId!))
    .returning();
  const r = updated[0]!;
  const riders = await db.select().from(usersTable).where(eq(usersTable.id, r.riderId)).limit(1);
  const drivers = await db.select().from(usersTable).where(eq(usersTable.id, bid.driverId)).limit(1);
  res.json({
    ride: {
      id: r.id,
      riderId: r.riderId,
      driverId: r.driverId,
      pickup: r.pickup,
      dropoff: r.dropoff,
      offeredFare: r.offeredFare,
      finalFare: r.finalFare,
      distance: r.distance,
      duration: r.duration,
      status: r.status,
      createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      riderName: riders[0]?.name ?? "",
      riderRating: riders[0]?.rating ?? 5,
      driverName: drivers[0]?.name ?? null,
      driverRating: drivers[0]?.rating ?? null,
      carModel: "Toyota Camry • Silver",
    }
  });
});

export default bidsRouter;
