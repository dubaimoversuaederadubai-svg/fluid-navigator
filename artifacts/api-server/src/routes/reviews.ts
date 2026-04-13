import { Router } from "express";
import { db, reviewsTable, ridesTable, usersTable } from "@workspace/db";
import { eq, avg } from "drizzle-orm";
import { generateId } from "../lib/auth.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router({ mergeParams: true });

export const reviewsRouter = router;

router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { rideId } = req.params;
  const { revieweeId, rating, comment = "" } = req.body;
  if (!revieweeId || !rating) {
    res.status(400).json({ error: "revieweeId and rating are required" });
    return;
  }
  const rides = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId!)).limit(1);
  if (!rides.length || rides[0]!.status !== "completed") {
    res.status(400).json({ error: "Ride not completed" });
    return;
  }
  await db.insert(reviewsTable).values({
    id: generateId(),
    rideId: rideId!,
    reviewerId: user.id,
    revieweeId,
    rating,
    comment,
  });
  const ratings = await db
    .select({ avg: avg(reviewsTable.rating) })
    .from(reviewsTable)
    .where(eq(reviewsTable.revieweeId, revieweeId));
  const newRating = Number(ratings[0]?.avg ?? rating);
  await db
    .update(usersTable)
    .set({ rating: Math.round(newRating * 10) / 10 })
    .where(eq(usersTable.id, revieweeId));
  res.status(201).json({ success: true });
});

export default router;
