import { asyncHandler } from "../utils/asyncHandler.js";
import { Player } from "../models/player.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { nanoid } from 'nanoid';  // Import nanoid to generate random strings
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Team } from "../models/team.model.js";


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
            associatedClub
        } = req.body;

        // console.log(associatedClub);


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
            associatedClub: associatedClub?.trim()
        };

        const player = new Player(sanitizedData);
        await player.save();
        const createdPlayer = await Player.findById(player._id)
            .select('playerName city phone email profilePicture DOB jersyNo role battingStyle bowlingStyle');
        // console.log("createdPlayer", createdPlayer);

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
        // console.error("Error fetching players:", error);
        throw new ApiError(500, "An error occurred while fetching players");
    }
});
const updatePlayer = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        // console.log(`Player ID: ${id}`);

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
        } = req.body; // This will contain text fields
        // console.log(req.body);

        if (!playerName?.trim() || !DOB || !role?.trim()) {
            throw new ApiError(400, "Some fields are required");
        }

        // Find the player by ID
        const player = await Player.findById(id);
        if (!player) {
            throw new ApiError(404, "Player not found");
        }

        // Handle profile picture upload
        let profilePictureLocalPath;
        if (req.files && Array.isArray(req.files.profilePicture) && req.files.profilePicture.length > 0) {
            profilePictureLocalPath = req.files.profilePicture[0].path;
        }
        const profilePicture = profilePictureLocalPath
            ? await uploadOnCloudinary(profilePictureLocalPath)
            : player.profilePicture;

        // Update player data
        player.playerName = playerName.trim();
        player.city = city?.trim() || player.city;
        player.phone = phone?.trim() || player.phone;
        player.email = email?.trim() || player.email;
        player.profilePicture = profilePicture?.url || player.profilePicture;
        player.DOB = DOB || player.DOB;
        player.jersyNo = jersyNo || player.jersyNo;
        player.role = role.trim();
        player.battingStyle = battingStyle?.trim() || player.battingStyle;
        player.bowlingStyle = bowlingStyle?.trim() || player.bowlingStyle;

        const updatedPlayer = await player.save();
        // console.log("Updated Player:", updatedPlayer);

        return res.status(200).json(
            new ApiResponse(200, updatedPlayer, "Player updated successfully")
        );
    } catch (error) {
        // console.error("Error updating player:", error);
        throw new ApiError(500, error.message || "An error occurred while updating the player");
    }
});


const deletePlayer = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        // console.log(id);

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
const getAvailablePlayersForTeam = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    console.log(clubId);

    // Validate the club ID
    if (!clubId) {
        throw new ApiError(400, "Club ID is required");
    }

    // Step 1: Find all teams associated with the club and populate their players
    const teams = await Team.find({ associatedClub: clubId }).populate({
        path: 'players', // Assuming that `players` field holds the players in a team
        select: '_id'    // Only populate player IDs to minimize data transfer
    });

    // Collect all player IDs from all teams
    const allPlayersInTeams = teams.reduce((allPlayerIds, team) => {
        return allPlayerIds.concat(team.players.map(player => player._id.toString()));
    }, []);

    // Step 2: Find all players associated with the club
    const clubPlayers = await Player.find({ associatedClub: clubId });

    // Step 3: Filter the club's players by removing those already part of any team in the club
    const availablePlayers = clubPlayers.filter(
        player => !allPlayersInTeams.includes(player._id.toString())
    );

    console.log(availablePlayers.length);


    // Return the available players
    return res.status(200).json(new ApiResponse(
        200,
        availablePlayers,
        "Available players for the club retrieved successfully"
    ));
});



export {
    getAvailablePlayersForTeam,
    createPlayer,
    updatePlayer,
    deletePlayer,
    getAllPlayers
}