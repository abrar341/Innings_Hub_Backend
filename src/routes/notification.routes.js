import { Router } from "express";
import { markNotificationAsRead } from "../controllers/notification.controller.js";

const router = Router();

// Correct route definition
router.route("/markNotificationAsRead/:id/read").patch(markNotificationAsRead);

export default router