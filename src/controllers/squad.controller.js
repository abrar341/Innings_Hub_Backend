
import asyncHandler from 'express-async-handler';
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Squad } from "../models/squad.model.js";


const addPlayerToSquad = asyncHandler(async (req, res) => {
    const { squadId, playerIds } = req.body;

    // Validate required fields
    if (!squadId || !playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
        throw new ApiError(400, "Squad ID and Player IDs are required");
    }

    // Find the squad by squadId
    const squad = await Squad.findById(squadId);
    if (!squad) {
        throw new ApiError(404, "Squad not found");
    }

    // Add players to the squad, ensuring no duplicates
    const existingPlayers = squad.players.map(player => player.toString());
    const newPlayers = playerIds.filter(playerId => !existingPlayers.includes(playerId));

    if (newPlayers.length === 0) {
        throw new ApiError(400, "All provided players are already in the squad");
    }

    // Add the new players to the players array
    squad.players.push(...newPlayers);

    // Save the updated squad
    await squad.save();

    // Return a success response with the updated squad
    return res.status(200).json(
        new ApiResponse(200, squad, "Players added to the squad successfully")
    );
});


export const getAllSquads = asyncHandler(async (req, res) => {
    // Fetch all squads from the database
    const squads = await Squad.find().populate('team tournament players');

    if (!squads || squads.length === 0) {
        throw new ApiError(404, "No squads found");
    }

    // Return the squads in the response
    return res.status(200).json(
        new ApiResponse(200, squads, "Squads retrieved successfully")
    );
});

export { addPlayerToSquad };