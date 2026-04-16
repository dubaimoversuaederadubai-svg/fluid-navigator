import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey(),
  rideId: text("ride_id").notNull(),
  senderId: text("sender_id").notNull(),
  senderRole: text("sender_role", { enum: ["rider", "driver"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
