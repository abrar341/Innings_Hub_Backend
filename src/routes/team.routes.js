
import { Router } from "express";
import { createTeam, deleteTeam, getAllTeams, updateTeam } from "../controllers/team.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/createTeam").post(
    upload.fields([
        {
            name: "teamLogo",
            maxCount: 1
        }
    ]), createTeam)
router.route("/allTeams").get(getAllTeams)
router.route("/updateTeam/:id").put(
    upload.fields([
        {
            name: "teamLogo",
            maxCount: 1
        }
    ]), updateTeam)
router.route("/deleteTeam/:id").delete(deleteTeam)





export default router