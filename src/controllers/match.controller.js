

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Match from "../models/match.model.js";

const createMatch = asyncHandler(async (req, res) => {
    try {
        const {
            team1,
            team2,
            round,
            venue,
            overs,
            date,
            time,
            tournamentId
        } = req.body;

        // Validate required fields
        if (!team1 || !team2 || !round?.trim() || !venue?.trim() || !overs || !date || !time || !tournamentId) {
            throw new ApiError(400, "All fields are required.");
        }

        // Create new match
        const matchData = {
            teams: [team1, team2],
            round: round.trim(),
            venue: venue.trim(),
            overs: Number(overs),
            date,
            time,
            tournament: tournamentId
        };

        const match = new Match(matchData);
        await match.save();

        // Optionally, populate teams and tournament for response
        const createdMatch = await Match.findById(match._id)
            .populate('teams')
            .populate('tournament');

        return res.status(201).json(
            new ApiResponse(201, createdMatch, "Match created successfully")
        );

    } catch (error) {
        throw new ApiError(500, error.message || "Internal Server Error");
    }
});

const getMatchesByTournamentId = asyncHandler(async (req, res) => {
    try {
        const { tournamentId } = req.params;

        const matches = await Match.find({ tournament: tournamentId })
            .populate('teams')
            .populate('tournament');

        if (!matches) {
            throw new ApiError(404, "No matches found for this tournament.");
        }

        res.status(200).json(new ApiResponse(200, matches, "Matches fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "Internal Server Error");
    }
});




export {
    createMatch, getMatchesByTournamentId
}