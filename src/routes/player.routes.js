
import { Router } from "express";
import { createPlayer, deletePlayer, getAllPlayers, updatePlayer } from "../controllers/player.controller.js";

const router = Router()

router.route("/createPlayer").post(createPlayer)
router.route("/allPlayer").get(getAllPlayers)
router.route("/updatePlayer/:id").put(updatePlayer)
router.route("/deletePlayer/:id").delete(deletePlayer)





export default router