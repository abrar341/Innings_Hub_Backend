
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { createClub } from "../controllers/club.controller.js";

const router = Router()



router.route("/createClub").post(
    upload.fields([
        {
            name: "clubLogo",
            maxCount: 1
        }
    ]), createClub)





export default router