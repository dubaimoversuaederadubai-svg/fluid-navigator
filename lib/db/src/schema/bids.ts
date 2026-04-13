import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const bidsTable = pgTable("bids", {
  id: text("id").primaryKey(),
  rideId: text("ride_id").notNull(),
  driverId: text("driver_id").notNull(),
  amount: real("amount").notNull(),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).notNull().default("pending"),
  eta: text("eta").notNull().default("5 min"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBidSchema = createInsertSchema(bidsTable).omit({
  createdAt: true,
  status: true,
});
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bidsTable.$inferSelect;
