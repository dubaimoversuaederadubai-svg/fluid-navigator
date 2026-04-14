import { pgTable, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull().default(""),
  role: text("role", { enum: ["rider", "driver"] }).notNull().default("rider"),
  rating: real("rating").notNull().default(5.0),
  totalRides: integer("total_rides").notNull().default(0),
  isOnline: boolean("is_online").notNull().default(false),
  cnicNumber: text("cnic_number"),
  cnicVerified: boolean("cnic_verified").notNull().default(false),
  licenseNumber: text("license_number"),
  licenseVerified: boolean("license_verified").notNull().default(false),
  vehicleModel: text("vehicle_model"),
  vehicleNumber: text("vehicle_number"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
