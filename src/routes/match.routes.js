

import { Router } from "express";
import { createMatch, createPost, getAllMatches, getMatchById, getMatchesByTeamId, getMatchesByTournamentId, getParticularMatches, getPostsByMatchId, initializePlayers, startMatch } from "../controllers/match.controller.js";
import { getSquadPlayers } from "../controllers/tournament.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/createMatch").post(createMatch)
router.route("/getMatchesByTournamentId/:tournamentId").get(getMatchesByTournamentId)
router.route("/getMatchesByTeamId/:teamId").get(getMatchesByTeamId)
router.route("/getMatchById/:matchId").get(getMatchById)
router.route("/startMatch/:matchId").post(startMatch)
router.route("/initializePlayers/:matchId").post(initializePlayers)
router.route("/getAllMatches").get(getAllMatches)
router.route("/getParticularMatches").get(getParticularMatches)
router.route("/getPostsByMatchId/:matchId").get(getPostsByMatchId)
router.route("/getSquadPlayers/:tournamentId/:teamId").get(getSquadPlayers)
router.route("/createPost").post(
    upload.fields([{ name: "images", maxCount: 3 }])
    ,
    createPost
);


export default router