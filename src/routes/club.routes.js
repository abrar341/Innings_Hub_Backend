
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { createClub, getPlayersByClub } from "../controllers/club.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()



router.route("/registerClub").post(
    upload.fields([
        {
            name: "clubLogo",
            maxCount: 1
        }
    ]), createClub)

router.route("/getPlayersByClub").get(verifyJWT, getPlayersByClub)


export default router