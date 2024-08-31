
import { Router } from "express";
import { createTournament, deleteTournament, getAllTournaments, getConcludedTournaments, getOngoingTournaments, getUpcomingTournaments, updateTournament } from "../controllers/tournament.controller.js";
import { upload } from "../middlewares/multer.middleware.js"


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
// getUpcomingTournaments,
//     getOngoingTournaments,
//     getConcludedTournaments




export default router