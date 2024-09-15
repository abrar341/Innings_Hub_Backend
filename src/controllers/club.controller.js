

import { asyncHandler } from "../utils/asyncHandler.js";
import { Club } from "../models/club.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Player } from "../models/player.model.js";


const createClub = asyncHandler(async (req, res) => {
    try {
        const {
            clubName,
            location,
            yearEstablished,
            managerEmail,
            managerPhone,
            managerAddress,
            socialLink
        } = req.body;
        console.log("body", req.body);
        console.log(socialLink);

        // Find user by managerEmail
        const managerUser = await User.findOne({ email: managerEmail }).
            select("-password -refreshToken")
        if (!managerUser) {
            throw new ApiError(404, "Manager not found with the provided email");
        }

        let clubLogoLocalPath;
        if (req.files && Array.isArray(req.files.clubLogo) && req.files.clubLogo.length > 0) {
            clubLogoLocalPath = req.files.clubLogo[0].path;
        }

        // Upload logo if present
        const clubLogo = await uploadOnCloudinary(clubLogoLocalPath);

        // Prepare sanitized data for the club
        const sanitizedData = {
            clubLogo: clubLogo?.url.trim() || "",
            clubName: clubName?.trim(),
            location: location?.trim(),
            yearEstablished: yearEstablished?.trim(),
            socialLink: socialLink?.trim(),
            manager: managerUser._id // Set manager reference to the found user's ID
        };

        console.log("sanitizedData", sanitizedData);
        const club = new Club(sanitizedData);
        await club.save();

        // After saving the club, update the manager's club reference
        managerUser.club = club._id;
        managerUser.address = managerAddress;
        const user = await managerUser.save();

        // Fetch the created club with selected fields
        const createdClub = await Club.findById(club._id)
            .select('clubLogo clubName location');

        return res.status(201).json(
            new ApiResponse(201, { user, createdClub }, "Club Registered for Approval successfully")
        );
    } catch (error) {
        console.error("Error creating club:", error);
        throw new ApiError(500, error);
    }
});
const getPlayersByClub = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id; // Assuming user ID is set on req.user by your auth middleware
        console.log(userId);

        // Find the user by their ID
        const user = await User.findById(userId).populate('club'); // Assuming 'club' is the field in the user model where the club ID is stored

        // If user doesn't exist or isn't associated with a club
        if (!user || !user.club) {
            return res.status(404).json(new ApiResponse(404, null, "User or club not found"));
        }

        const clubId = user.club._id; // Get the club ID from the populated user data
        console.log(clubId);

        // Find all players associated with this club
        const players = await Player.find({ associatedClub: clubId })
            .select('playerName city phone email profilePicture DOB status jersyNo role battingStyle bowlingStyle');

        if (!players.length) {
            return res.status(404).json(new ApiResponse(404, null, "No players found for this club"));
        }

        return res.status(200).json(
            new ApiResponse(200, players, "Players retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Server error");
    }
});


export {
    createClub,
    getPlayersByClub
}