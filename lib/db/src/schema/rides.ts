import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const ridesTable = pgTable("rides", {
  id: text("id").primaryKey(),
  riderId: text("rider_id").notNull(),
  driverId: text("driver_id"),
  pickup: text("pickup").notNull(),
  dropoff: text("dropoff").notNull(),
  pickupLat: real("pickup_lat"),
  pickupLng: real("pickup_lng"),
  offeredFare: real("offered_fare").notNull(),
  finalFare: real("final_fare"),
  distance: text("distance").notNull().default(""),
  duration: text("duration").notNull().default(""),
  vehicleType: text("vehicle_type").notNull().default("car"),
  status: text("status", {
    enum: ["searching", "accepted", "on_the_way", "trip_started", "completed", "cancelled"],
  }).notNull().default("searching"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertRideSchema = createInsertSchema(ridesTable).omit({
  createdAt: true,
  completedAt: true,
  driverId: true,
  finalFare: true,
  status: true,
});
export type InsertRide = z.infer<typeof insertRideSchema>;
export type Ride = typeof ridesTable.$inferSelect;
