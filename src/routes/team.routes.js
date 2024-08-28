
import { Router } from "express";
import { createTeam, deleteTeam, getAllTeams, updateTeam } from "../controllers/team.controller.js";

const router = Router()

router.route("/createTeam").post(createTeam)
router.route("/allTeams").get(getAllTeams)
router.route("/updateTeam/:id").put(updateTeam)
router.route("/deleteTeam/:id").delete(deleteTeam)





export default router