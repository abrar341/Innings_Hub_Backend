
import { Router } from "express";
import { addPlayerToClub, addPlayerToClubReq, createPlayer, deletePlayer, getAllPlayers, getAvailablePlayersForTeam, getInactivePlayers, getPlayerById, getRandomPlayers, releasePlayerFromClub, updatePlayer, updatePlayerStats } from "../controllers/player.controller.js";
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
router.route("/getRandomPlayers").get(getRandomPlayers)
router.route("/updatePlayer/:id").put(
    upload.fields([
        {
            name: "profilePicture",
            maxCount: 1
        }
    ]), updatePlayer)
router.route("/deletePlayer/:id").delete(deletePlayer)
router.route("/releasePlayerFromClub/:id").put(releasePlayerFromClub)
router.route("/addPlayerToClub/:playerId/:clubId").put(addPlayerToClub);
router.route("/addPlayerToClubReq/:playerId/:clubId").post(addPlayerToClubReq);

router.route("/getAvailablePlayersForTeam/:clubId").get(getAvailablePlayersForTeam)
router.route("/updatePlayerStats").put(updatePlayerStats)
router.route("/getPlayerById/:id").get(getPlayerById)
router.route("/getInactivePlayers").get(getInactivePlayers)






export default router