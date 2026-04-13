import type { Request, Response, NextFunction } from "express";
import { getUserFromRequest } from "../lib/auth.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).user = user;
  next();
}
