
import { Router } from "express";
import { loginUser, registerUser, logoutUser, changeCurrentPassword } from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register/user").get((req, res) => res.send("User"))

router.route("/register/user").post(
    registerUser
)
router.route("/login").post(loginUser)
// router.route("/logout").post(logoutUser)
router.route("/logout").post(verifyJWT, logoutUser)




export default router