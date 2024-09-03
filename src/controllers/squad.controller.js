
import asyncHandler from 'express-async-handler';
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Squad } from "../models/squad.model.js";


export const addPlayerToSquad = asyncHandler(async (req, res) => {
    const { tournamentId, teamId, playerIds } = req.body;

    // Validate required fields
    if (!tournamentId || !teamId || !playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
        throw new ApiError(400, "Tournament ID, Team ID, and Player IDs are required");
    }

    // Find the squad matching the tournamentId and teamId
    const squad = await Squad.findOne({ tournament: tournamentId, team: teamId });
    if (!squad) {
        throw new ApiError(404, "Squad not found for the specified tournament and team");
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