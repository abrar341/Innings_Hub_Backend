import { asyncHandler } from "../utils/asyncHandler.js";
import { Player } from "../models/player.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { nanoid } from 'nanoid';  // Import nanoid to generate random strings
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const createPlayer = asyncHandler(async (req, res) => {
    try {
        const {
            playerName,
            city,
            phone,
            email,
            DOB,
            jersyNo,
            role,
            battingStyle,
            bowlingStyle,
        } = req.body;

        console.log("body", req.body);

        if (!playerName?.trim() || !DOB || !role?.trim()) {
            throw new ApiError(400, "Some Field are requires");
        }

        // Handle profile picture upload
        let profilePictureLocalPath;
        if (req.files && Array.isArray(req.files.profilePicture) && req.files.profilePicture.length > 0) {
            profilePictureLocalPath = req.files.profilePicture[0].path;
        }
        const profilePicture = await uploadOnCloudinary(profilePictureLocalPath);

        const sanitizedData = {
            playerName: playerName.trim(),
            city: city?.trim(),
            phone: phone?.trim(),
            email: email?.trim(),
            profilePicture: profilePicture?.url || "",
            DOB,
            jersyNo,
            role: role.trim(),
            battingStyle: battingStyle?.trim(),
            bowlingStyle: bowlingStyle?.trim(),
        };
        console.log("sanitizedData", sanitizedData);

        const player = new Player(sanitizedData);
        await player.save();
        const createdPlayer = await Player.findById(player._id)
            .select('playerName city phone email profilePicture DOB jersyNo role battingStyle bowlingStyle');

        return res.status(201).json(
            new ApiResponse(201, createdPlayer, "Player created successfully")
        );
    } catch (error) {
        throw new ApiError(500, error);
    }
});

const getAllPlayers = asyncHandler(async (req, res) => {
    try {
        const players = await Player.find().select("-__v"); // Exclude the `__v` field

        if (!players || players.length === 0) {
            throw new ApiError(404, "No players found");
        }

        return res.status(200).json(
            new ApiResponse(200, players, "Players fetched successfully")
        );
    } catch (error) {
        console.error("Error fetching players:", error);
        throw new ApiError(500, "An error occurred while fetching players");
    }
});
const updatePlayer = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Player ID: ${id}`);

        const {
            name,
            city,
            phone,
            profilePicture,
            email,
            DOB,
            jersyNo,
            role,
            battingStyle,
            bowlingStyle,
        } = req.body;

        // Find the player by ID
        const player = await Player.findById(id);
        if (!player) {
            throw new ApiError(404, "Player not found");
        }

        // Handle username generation if not provided
        let finalUsername = username?.trim();
        if (!finalUsername) {
            const randomString = nanoid(5);
            finalUsername = `${name?.trim()?.replace(/\s+/g, '') || player.name}_${randomString}`.toLowerCase();
        }

        // Check for duplicate email, phone, or username (excluding current player)
        const existingPlayer = await Player.findOne({
            $or: [{ email }, { phone }, { username: finalUsername }],
            _id: { $ne: id },
        });
        if (existingPlayer) {
            throw new ApiError(409, "Player with the same email, phone, or username already exists");
        }

        // Update player data
        player.name = name?.trim() || player.name;
        player.city = city?.trim() || player.city;
        player.phone = phone?.trim() || player.phone;
        player.profilePicture = profilePicture?.trim() || player.profilePicture;
        player.email = email?.trim() || player.email;
        player.DOB = DOB || player.DOB;
        player.jersyNo = jersyNo || player.jersyNo;
        player.role = role?.trim() || player.role;
        player.battingStyle = battingStyle?.trim() || player.battingStyle;
        player.bowlingStyle = bowlingStyle?.trim() || player.bowlingStyle;
        player.username = finalUsername;

        const updatedPlayer = await player.save();
        console.log(updatedPlayer);

        return res.status(200).json(
            new ApiResponse(200, updatedPlayer, "Player updated successfully")
        );
    } catch (error) {
        console.error("Error updating player:", error); // Log the actual error message
        throw new ApiError(500, error.message || "An error occurred while updating the player");
    }
});
const deletePlayer = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        console.log(id);

        // Find the player by ID
        const player = await Player.findById(id);
        if (!player) {
            throw new ApiError(404, "Player not found");
        }

        // Delete the player
        await player.deleteOne();

        return res.status(200).json(
            new ApiResponse(200, null, "Player deleted successfully")
        );
    } catch (error) {
        throw new ApiError(500, "An error occurred while deleting the player");
    }
});


export {
    createPlayer,
    updatePlayer,
    deletePlayer,
    getAllPlayers
}