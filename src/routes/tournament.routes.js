
import { Router } from "express";
import { addTeamsToTournaments, createTournament, deleteTournament, getAllTournaments, getAvailableTeamsForTournament, getConcludedTournaments, getOngoingTournaments, getSingleTournamentDetail, getSingleTournamentSquads, getUpcomingTournaments, removeTeamFromTournament, updateTournament } from "../controllers/tournament.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { addPlayerToSquad, getAllSquads } from "../controllers/squad.controller.js";


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
router.route("/getSingleTournamentSquads/:tournamentId").get(getSingleTournamentSquads)
router.route("/removeTeamFromTournament").post(removeTeamFromTournament)
router.route("/getAvailableTeamsForTournament/:tournamentId").get(getAvailableTeamsForTournament)
router.route("/addPlayerToSquad").post(addPlayerToSquad)
router.route("/getAllSquads").get(getAllSquads)
router.route("/getSingleTournamentDetail/:id").get(getSingleTournamentDetail)






export default router