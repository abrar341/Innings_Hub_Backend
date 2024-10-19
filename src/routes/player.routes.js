
import { Router } from "express";
import { createPlayer, deletePlayer, getAllPlayers, getAvailablePlayersForTeam, getPlayerById, updatePlayer, updatePlayerStats } from "../controllers/player.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/createPlayer").post(
    upload.fields([
        {
            name: "profilePicture",
            maxCount: 1
        }
    ]), createPlayer)
router.route("/allPlayers").get(getAllPlayers)
router.route("/updatePlayer/:id").put(
    upload.fields([
        {
            name: "profilePicture",
            maxCount: 1
        }
    ]), updatePlayer)
router.route("/deletePlayer/:id").delete(deletePlayer)
router.route("/getAvailablePlayersForTeam/:clubId").get(getAvailablePlayersForTeam)
router.route("/updatePlayerStats").put(updatePlayerStats)
router.route("/getPlayerById/:id").get(getPlayerById)






export default router