import { Router } from "express";
import { db, ridesTable, usersTable, bidsTable, reviewsTable } from "@workspace/db";
import { eq, and, or, desc, ne } from "drizzle-orm";
import { generateId } from "../lib/auth.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

async function formatRide(ride: any, riderUser: any, driverUser?: any) {
  return {
    id: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId ?? null,
    pickup: ride.pickup,
    dropoff: ride.dropoff,
    offeredFare: ride.offeredFare,
    finalFare: ride.finalFare ?? null,
    distance: ride.distance,
    duration: ride.duration,
    status: ride.status,
    createdAt: ride.createdAt?.toISOString?.() ?? ride.createdAt,
    riderName: riderUser?.name ?? "",
    riderRating: riderUser?.rating ?? 5,
    driverName: driverUser?.name ?? null,
    driverRating: driverUser?.rating ?? null,
    carModel: driverUser ? "Toyota Camry • Silver" : null,
  };
}

router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "rider") {
    res.status(403).json({ error: "Only riders can create rides" });
    return;
  }
  const { pickup, dropoff, offeredFare, distance = "", duration = "" } = req.body;
  if (!pickup || !dropoff || !offeredFare) {
    res.status(400).json({ error: "pickup, dropoff, and offeredFare are required" });
    return;
  }
  const rideId = generateId();
  await db.insert(ridesTable).values({
    id: rideId, riderId: user.id, pickup, dropoff,
    offeredFare, distance, duration,
  });
  const ride = (await db.select().from(ridesTable).where(eq(ridesTable.id, rideId)).limit(1))[0]!;
  res.status(201).json({ ride: await formatRide(ride, user) });
});

router.get("/history", requireAuth, async (req, res) => {
  const user = (req as any).user;
  let rides: any[];
  if (user.role === "rider") {
    rides = await db
      .select()
      .from(ridesTable)
      .where(and(eq(ridesTable.riderId, user.id), eq(ridesTable.status, "completed")))
      .orderBy(desc(ridesTable.completedAt))
      .limit(50);
  } else {
    rides = await db
      .select()
      .from(ridesTable)
      .where(and(eq(ridesTable.driverId, user.id), eq(ridesTable.status, "completed")))
      .orderBy(desc(ridesTable.completedAt))
      .limit(50);
  }
  const trips = await Promise.all(
    rides.map(async (r) => {
      const riders = await db.select().from(usersTable).where(eq(usersTable.id, r.riderId)).limit(1);
      const drivers = r.driverId
        ? await db.select().from(usersTable).where(eq(usersTable.id, r.driverId)).limit(1)
        : [];
      const reviews = await db
        .select()
        .from(reviewsTable)
        .where(and(eq(reviewsTable.rideId, r.id), eq(reviewsTable.reviewerId, user.id)))
        .limit(1);
      return {
        id: r.id,
        date: r.completedAt
          ? new Date(r.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        pickup: r.pickup,
        dropoff: r.dropoff,
        fare: r.finalFare ?? r.offeredFare,
        distance: r.distance,
        duration: r.duration,
        driverName: drivers[0]?.name ?? "Unknown",
        riderName: riders[0]?.name ?? "Unknown",
        rating: reviews[0]?.rating ?? 0,
        status: r.status,
      };
    })
  );
  res.json({ trips });
});

router.get("/active", requireAuth, async (req, res) => {
  const user = (req as any).user;
  let cond: any;
  if (user.role === "rider") {
    cond = and(
      eq(ridesTable.riderId, user.id),
      or(
        eq(ridesTable.status, "searching"),
        eq(ridesTable.status, "accepted"),
        eq(ridesTable.status, "on_the_way"),
        eq(ridesTable.status, "trip_started")
      )
    );
  } else {
    cond = and(
      eq(ridesTable.driverId, user.id),
      or(
        eq(ridesTable.status, "accepted"),
        eq(ridesTable.status, "on_the_way"),
        eq(ridesTable.status, "trip_started")
      )
    );
  }
  const rides = await db.select().from(ridesTable).where(cond).orderBy(desc(ridesTable.createdAt)).limit(1);
  if (!rides.length) {
    res.json({ ride: null });
    return;
  }
  const r = rides[0]!;
  const riders = await db.select().from(usersTable).where(eq(usersTable.id, r.riderId)).limit(1);
  const drivers = r.driverId
    ? await db.select().from(usersTable).where(eq(usersTable.id, r.driverId)).limit(1)
    : [];
  res.json({ ride: await formatRide(r, riders[0], drivers[0]) });
});

router.get("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { status } = req.query as { status?: string };
  let rides: any[];
  if (user.role === "driver") {
    rides = await db
      .select()
      .from(ridesTable)
      .where(eq(ridesTable.status, "searching"))
      .orderBy(desc(ridesTable.createdAt))
      .limit(20);
  } else {
    const cond = status
      ? and(eq(ridesTable.riderId, user.id), eq(ridesTable.status, status as any))
      : eq(ridesTable.riderId, user.id);
    rides = await db.select().from(ridesTable).where(cond).orderBy(desc(ridesTable.createdAt)).limit(20);
  }
  const formatted = await Promise.all(
    rides.map(async (r) => {
      const riders = await db.select().from(usersTable).where(eq(usersTable.id, r.riderId)).limit(1);
      const drivers = r.driverId
        ? await db.select().from(usersTable).where(eq(usersTable.id, r.driverId)).limit(1)
        : [];
      return formatRide(r, riders[0], drivers[0]);
    })
  );
  res.json({ rides: formatted });
});

router.get("/:rideId", requireAuth, async (req, res) => {
  const { rideId } = req.params;
  const rides = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId!)).limit(1);
  if (!rides.length) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }
  const r = rides[0]!;
  const riders = await db.select().from(usersTable).where(eq(usersTable.id, r.riderId)).limit(1);
  const drivers = r.driverId
    ? await db.select().from(usersTable).where(eq(usersTable.id, r.driverId)).limit(1)
    : [];
  res.json({ ride: await formatRide(r, riders[0], drivers[0]) });
});

router.put("/:rideId/cancel", requireAuth, async (req, res) => {
  const { rideId } = req.params;
  const user = (req as any).user;
  const rides = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId!)).limit(1);
  if (!rides.length) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }
  const r = rides[0]!;
  if (r.riderId !== user.id && r.driverId !== user.id) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }
  const updated = await db
    .update(ridesTable)
    .set({ status: "cancelled" })
    .where(eq(ridesTable.id, rideId!))
    .returning();
  const riders = await db.select().from(usersTable).where(eq(usersTable.id, r.riderId)).limit(1);
  res.json({ ride: await formatRide(updated[0]!, riders[0]) });
});

router.put("/:rideId/complete", requireAuth, async (req, res) => {
  const { rideId } = req.params;
  const user = (req as any).user;
  const rides = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId!)).limit(1);
  if (!rides.length) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }
  const r = rides[0]!;
  if (r.riderId !== user.id && r.driverId !== user.id) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }
  const updated = await db
    .update(ridesTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(ridesTable.id, rideId!))
    .returning();
  await db
    .update(usersTable)
    .set({ totalRides: user.totalRides + 1 })
    .where(eq(usersTable.id, user.id));
  const riders = await db.select().from(usersTable).where(eq(usersTable.id, r.riderId)).limit(1);
  const drivers = r.driverId
    ? await db.select().from(usersTable).where(eq(usersTable.id, r.driverId)).limit(1)
    : [];
  res.json({ ride: await formatRide(updated[0]!, riders[0], drivers[0]) });
});

export default router;
