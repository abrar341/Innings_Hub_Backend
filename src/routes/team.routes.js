
import { Router } from "express";
import { addPlayerToTeam, createTeam, deleteTeam, getAllTeams, getSingleTeamDetail, removePlayerFromTeam, updateTeam, updateTeamStats } from "../controllers/team.controller.js";
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
router.route("/getSingleTeamDetail/:id").get(getSingleTeamDetail)
router.route("/addPlayerToTeam").post(addPlayerToTeam)
router.route("/removePlayerFromTeam").delete(removePlayerFromTeam)
router.route("/updateTeamStats").put(updateTeamStats)






export default router