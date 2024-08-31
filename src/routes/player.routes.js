
import { Router } from "express";
import { createPlayer, deletePlayer, getAllPlayers, updatePlayer } from "../controllers/player.controller.js";
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





export default router