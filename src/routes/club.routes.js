
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { createClub, getClubs, getPlayersByClub, approveClub, rejectClub } from "../controllers/club.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()



router.route("/registerClub").post(
    upload.fields([
        {
            name: "clubLogo",
            maxCount: 1
        }
    ]), createClub)

router.route("/getPlayersByClub/:id").get(getPlayersByClub)
router.route("/getClubs").get(getClubs)
router.route("/approveClub").post(approveClub)
router.route("/rejectClub").post(rejectClub)


export default router