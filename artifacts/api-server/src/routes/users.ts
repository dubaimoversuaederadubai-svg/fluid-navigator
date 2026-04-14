import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

const formatUser = (u: any) => ({
  id: u.id,
  phone: u.phone,
  name: u.name,
  role: u.role,
  rating: u.rating,
  totalRides: u.totalRides,
  isOnline: u.isOnline,
  cnicNumber: u.cnicNumber ?? null,
  cnicVerified: u.cnicVerified ?? false,
  licenseNumber: u.licenseNumber ?? null,
  licenseVerified: u.licenseVerified ?? false,
  vehicleModel: u.vehicleModel ?? null,
  vehicleNumber: u.vehicleNumber ?? null,
  paymentMethod: u.paymentMethod ?? "cash",
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

router.put("/me/payment", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { paymentMethod } = req.body as { paymentMethod: string };
  const allowed = ["cash", "jazzcash", "easypaisa", "sadapay", "nayapay"];
  if (!allowed.includes(paymentMethod)) {
    res.status(400).json({ error: "Invalid payment method" });
    return;
  }
  const updated = await db
    .update(usersTable)
    .set({ paymentMethod })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({ user: formatUser(updated[0]!) });
});

router.put("/me/verify", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { cnicNumber, licenseNumber, vehicleModel, vehicleNumber } = req.body as {
    cnicNumber?: string;
    licenseNumber?: string;
    vehicleModel?: string;
    vehicleNumber?: string;
  };

  if (!cnicNumber) {
    res.status(400).json({ error: "CNIC number is required" });
    return;
  }

  const cnicClean = cnicNumber.replace(/-/g, "");
  if (!/^\d{13}$/.test(cnicClean)) {
    res.status(400).json({ error: "CNIC must be 13 digits" });
    return;
  }

  const updates: any = {
    cnicNumber: cnicNumber,
    cnicVerified: true,
  };

  if (user.role === "driver") {
    if (!licenseNumber || !vehicleModel || !vehicleNumber) {
      res.status(400).json({ error: "License, vehicle model and number required for drivers" });
      return;
    }
    updates.licenseNumber = licenseNumber;
    updates.licenseVerified = true;
    updates.vehicleModel = vehicleModel;
    updates.vehicleNumber = vehicleNumber;
  }

  const updated = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({ user: formatUser(updated[0]!) });
});

export default router;
