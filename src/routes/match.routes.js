

import { Router } from "express";
import { createMatch, getMatchesByTournamentId } from "../controllers/match.controller.js";

const router = Router()

router.route("/createMatch").post(createMatch)
router.route("/getMatchesByTournamentId/:tournamentId").get(getMatchesByTournamentId)


export default router