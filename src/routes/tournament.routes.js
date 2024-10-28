
import { Router } from "express";
import { addTeamsToTournaments, createTournament, deleteTournament, getAllTournaments, getAvailablePlayersForTournament, getAvailableTeamsForTournament, getConcludedTournaments, getOngoingTournaments, getSingleTournamentDetail, getSingleTournamentSquads, getTeamsInTournament, getUpcomingTournaments, removePlayerFromSquad, removeTeamFromTournament, RegisterTeamsToTournament, updateTournament } from "../controllers/tournament.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { addPlayerToSquad, approveSquadById, getAllSquads } from "../controllers/squad.controller.js";
import { createRound, deleteRound, getRoundsbyTournamentId } from "../controllers/round.controller.js";


const router = Router()

router.route("/createTournament").post(
    upload.fields([
        {
            name: "image",
            maxCount: 1
        }
    ]), createTournament)

router.route("/updateTournament/:id").put(
    upload.fields([
        {
            name: "image",
            maxCount: 1
        }
    ]), updateTournament)
router.route("/deleteTournament/:id").delete(deleteTournament)
router.route("/allTournament").get(getAllTournaments)
router.route("/upcomingTournaments").get(getUpcomingTournaments)
router.route("/ongoingTournaments").get(getOngoingTournaments)
router.route("/concludedTournaments").get(getConcludedTournaments)
router.route("/addTeamsToTournament").post(addTeamsToTournaments)
router.route("/RegisterTeamsToTournament").post(RegisterTeamsToTournament)
router.route("/getSingleTournamentSquads/:tournamentId").get(getSingleTournamentSquads)
router.route("/removeTeamFromTournament").post(removeTeamFromTournament)
router.route("/getAvailableTeamsForTournament/:tournamentId").get(getAvailableTeamsForTournament)
router.route("/getAvailablePlayersForTournament/:tournamentId/:teamId").get(getAvailablePlayersForTournament)
router.route("/addPlayerToSquad").post(addPlayerToSquad)
router.route("/getAllSquads").get(getAllSquads)
router.route("/getSingleTournamentDetail/:id").get(getSingleTournamentDetail)
router.route("/removePlayerFromSquad").post(removePlayerFromSquad)
router.route("/getTeamsInTournament/:tournamentId").get(getTeamsInTournament)
router.route("/approveSquadById/:squadId").patch(approveSquadById)

//Rounds
router.route("/createRound").post(createRound)
router.route("/getRounds/:tournamentId").get(getRoundsbyTournamentId)
router.route("/deleteRound/:roundId").delete(deleteRound)







export default router