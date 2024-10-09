

import { Router } from "express";
import { createMatch, getAllMatches, getMatchById, getMatchesByTeamId, getMatchesByTournamentId, initializePlayers, startMatch } from "../controllers/match.controller.js";
import { getSquadPlayers } from "../controllers/tournament.controller.js";

const router = Router()

router.route("/createMatch").post(createMatch)
router.route("/getMatchesByTournamentId/:tournamentId").get(getMatchesByTournamentId)
router.route("/getMatchesByTeamId/:teamId").get(getMatchesByTeamId)
router.route("/getMatchById/:matchId").get(getMatchById)
router.route("/startMatch/:matchId").post(startMatch)
router.route("/initializePlayers/:matchId").post(initializePlayers)
router.route("/getAllMatches").get(getAllMatches)
router.route("/getSquadPlayers/:tournamentId/:teamId").get(getSquadPlayers)


export default router