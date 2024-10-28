import { asyncHandler } from "../utils/asyncHandler.js";
import { Round } from '../models/rounds.model.js';
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tournament } from "../models/tournament.model.js";
import { Team } from '../models/team.model.js';
import mongoose from "mongoose";


const createRound = asyncHandler(async (req, res) => {
    try {
        console.log("Request Body:", req.body);
        const { roundName, scheduleType, tournamentId, numberOfGroups, groups } = req.body;

        // Step 1: Validate the input
        if (!tournamentId || !roundName || !scheduleType || !numberOfGroups || !groups) {
            throw new ApiError(400, 'Required fields are missing.');
        }

        // Step 2: Verify if the tournament exists
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            throw new ApiError(404, 'Tournament not found.');
        }

        // Step 3: Prepare formatted groups and ensure team IDs are valid
        const formattedGroups = [];
        for (let i = 1; i <= numberOfGroups; i++) {
            const groupKey = `group${i}`;
            if (groups[groupKey]) {
                console.log(`Processing group ${i}:`, groups[groupKey]);

                // Convert the team IDs to ObjectId format
                const teamIds = groups[groupKey].map(id => new mongoose.Types.ObjectId(id));

                // Fetch teams from the database using the converted ObjectIds
                const teams = await Team.find({ _id: { $in: teamIds } });

                // Handle the case where some teams might not be found
                if (teams.length !== teamIds.length) {
                    const foundTeamIds = teams.map(team => team._id.toString());
                    const missingIds = teamIds.filter(id => !foundTeamIds.includes(id.toString()));
                    console.warn(`Warning: Some team IDs not found in group ${i}:`, missingIds);
                }

                // Step 4: Initialize standings for each team in the group
                const standings = teams.map(team => ({
                    team: team._id,
                    played: 0,
                    won: 0,
                    lost: 0,
                    tied: 0,
                    points: 0,
                    netRunRate: 0
                }));

                // Step 5: Push the group with teams and standings into formattedGroups
                formattedGroups.push({
                    groupName: `Group ${i}`,
                    matches: [],  // No matches initially
                    teams: teams,  // Full team details
                    standings: standings  // Initialized standings for each team
                });

                console.log("Formatted Groups:", formattedGroups);
            } else {
                console.warn(`Group ${i} is missing in the request.`);
            }
        }

        // Step 6: Create and save the round with the structured groups and standings
        const newRound = new Round({
            roundName,
            scheduleType,
            tournament: tournamentId,
            groups: formattedGroups,
        });

        console.log("newRound", newRound);

        await newRound.save();

        // Step 7: Return a success response
        return res.status(201).json(
            new ApiResponse(201, newRound, "Round created successfully")
        );
    } catch (error) {
        console.error("Error creating round:", error);
        throw new ApiError(500, error.message);
    }
});


const getRoundsbyTournamentId = asyncHandler(async (req, res) => {
    try {
        console.log("Request Params:", req.params);

        const { tournamentId } = req.params;

        // Step 1: Validate tournamentId
        if (!tournamentId) {
            throw new ApiError(400, 'Tournament ID is required.');
        }

        // Step 2: Verify if the tournament exists
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            throw new ApiError(404, 'Tournament not found.');
        }

        // Step 3: Fetch rounds associated with the given tournamentId
        const rounds = await Round.find({ tournament: tournamentId })
            .populate('groups.teams', 'teamName teamLogo') // Optionally populate team details
            .populate('groups.standings.team', 'teamName teamLogo');  // Optionally populate team details



        // Step 4: Return the rounds data
        return res.status(200).json(
            new ApiResponse(200, rounds, "Rounds retrieved successfully")
        );
    } catch (error) {
        console.error("Error fetching rounds:", error);
        throw new ApiError(500, error.message);
    }
});

const deleteRound = asyncHandler(async (req, res) => {
    try {
        const { roundId } = req.params;

        // Step 1: Validate roundId
        if (!roundId) {
            throw new ApiError(400, 'Round ID is required.');
        }

        // Step 2: Verify if the round exists
        const round = await Round.findById(roundId);
        if (!round) {
            throw new ApiError(404, 'Round not found.');
        }

        // Step 3: Delete the round
        await round.deleteOne();

        // Step 4: Return success response
        return res.status(200).json(
            new ApiResponse(200, null, "Round deleted successfully")
        );
    } catch (error) {
        console.error("Error deleting round:", error);
        throw new ApiError(500, error.message);
    }
});

export { createRound, getRoundsbyTournamentId, deleteRound };
