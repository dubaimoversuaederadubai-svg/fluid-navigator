import { Router } from "express";
import { db, otpsTable, usersTable, sessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { generateId, generateToken } from "../lib/auth.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { getTwilioClient, getTwilioFromNumber, isTwilioConfigured } from "../lib/twilio.js";

const router = Router();

async function sendSmsOtp(phone: string, code: string): Promise<void> {
  const configured = await isTwilioConfigured();

  if (!configured) {
    console.log(`[DEV] OTP for +${phone}: ${code}`);
    return;
  }

  const client = await getTwilioClient();
  const fromNumber = await getTwilioFromNumber();

  if (!client || !fromNumber) {
    console.log(`[DEV] Twilio client unavailable. OTP for +${phone}: ${code}`);
    return;
  }

  const body = `Fluid Navigator verification code: ${code}\nValid for 10 minutes.\n\nTصدیقی کوڈ: ${code}`;

  await client.messages.create({
    from: fromNumber,
    to: `+${phone}`,
    body,
  });

  console.log(`[Twilio] SMS sent to +${phone}`);
}

router.post("/send-otp", async (req, res) => {
  const { phone } = req.body as { phone: string };
  if (!phone) {
    res.status(400).json({ error: "Phone is required" });
    return;
  }
  const normalizedPhone = phone.replace(/\s+/g, "").replace(/^\+/, "");
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(otpsTable).values({
    id: generateId(),
    phone: normalizedPhone,
    code,
    expiresAt,
  });

  let smsSent = false;
  let smsError: string | null = null;
  try {
    await sendSmsOtp(normalizedPhone, code);
    smsSent = true;
  } catch (e: any) {
    console.error("SMS send failed:", e);
    // Twilio error 21608 = unverified number (trial account)
    // Always include devCode so the app still works
    smsError = e?.code ? `Twilio error ${e.code}` : "SMS failed";
  }

  const configured = await isTwilioConfigured();

  res.json({
    message: smsSent ? "OTP sent via SMS" : "OTP generated (SMS unavailable)",
    // Always return devCode if SMS wasn't delivered so app stays functional
    ...(!smsSent ? { devCode: code } : {}),
    ...(smsError ? { smsNote: smsError } : {}),
  });
});

router.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body as { phone: string; code: string };
  if (!phone || !code) {
    res.status(400).json({ error: "Phone and code are required" });
    return;
  }
  const normalizedPhone = phone.replace(/\s+/g, "").replace(/^\+/, "");
  const now = new Date();
  const otps = await db
    .select()
    .from(otpsTable)
    .where(
      and(
        eq(otpsTable.phone, normalizedPhone),
        eq(otpsTable.code, code),
        eq(otpsTable.used, false),
        gt(otpsTable.expiresAt, now)
      )
    )
    .limit(1);

  if (!otps.length) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }

  await db.update(otpsTable).set({ used: true }).where(eq(otpsTable.id, otps[0]!.id));

  const existingUsers = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, normalizedPhone))
    .limit(1);

  let user = existingUsers[0];
  const isNewUser = !user;

  if (!user) {
    const userId = generateId();
    await db.insert(usersTable).values({
      id: userId,
      phone: normalizedPhone,
      name: "",
      role: "rider",
    });
    const created = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    user = created[0]!;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({
    id: generateId(),
    userId: user.id,
    token,
    expiresAt,
  });

  res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      rating: user.rating,
      totalRides: user.totalRides,
      isOnline: user.isOnline,
    },
    isNewUser,
  });
});

router.post("/register", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { name, role } = req.body as { name: string; role: "rider" | "driver" };
  if (!name || !role) {
    res.status(400).json({ error: "Name and role are required" });
    return;
  }
  const updated = await db
    .update(usersTable)
    .set({ name, role })
    .where(eq(usersTable.id, user.id))
    .returning();
  const u = updated[0]!;
  res.json({
    user: {
      id: u.id, phone: u.phone, name: u.name, role: u.role,
      rating: u.rating, totalRides: u.totalRides, isOnline: u.isOnline,
    }
  });
});

router.post("/logout", requireAuth, async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ success: true });
});

export default router;
