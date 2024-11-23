
import { Router } from "express";
import { loginUser, registerUser, logoutUser, changeCurrentPassword, verifyEmail, getUserProfile, getAllScorers, deleteUser, forgotPassword, changePassword, updateProfilePicture } from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/register/user").get((req, res) => res.send("User"))
router.route("/userProfile/:id").get(getUserProfile)
router.route("/register").post(registerUser)
router.route("/forgot-password").post(forgotPassword)
router.route("/change-password").post(changePassword)
router.route("/verify-email").post(verifyEmail)
router.route("/login").post(loginUser)
router.route("/logout").post(logoutUser)
router.route("/getAllScorers").get(getAllScorers)
router.route("/deleteUser/:id").delete(deleteUser)
router.route("/updateProfilePicture/:userId/profile-picture").patch(upload.fields([
    {
        name: "profilePicture",
        maxCount: 1
    }
]), updateProfilePicture)




export default router