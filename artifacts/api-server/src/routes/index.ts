import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import ridesRouter from "./rides.js";
import bidsRouter from "./bids.js";
import reviewsRouter from "./reviews.js";
import messagesRouter from "./messages.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/rides", ridesRouter);
router.use("/rides/:rideId/bids", bidsRouter);
router.use("/rides/:rideId/review", reviewsRouter);
router.use("/rides", messagesRouter);

export default router;
