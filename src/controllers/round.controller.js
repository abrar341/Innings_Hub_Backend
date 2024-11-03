import { asyncHandler } from "../utils/asyncHandler.js";
import { Round } from '../models/rounds.model.js';
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tournament } from "../models/tournament.model.js";
import { Team } from '../models/team.model.js';
import mongoose from "mongoose";
import Match from "../models/match.model.js";


const createRound = asyncHandler(async (req, res) => {
    try {
        console.log("Request Body:", req.body);
        const { roundName, scheduleType, tournamentId, numberOfGroups, groups, qualifiersPerGroup } = req.body;
        console.log("qualifiersPerGroup", qualifiersPerGroup);
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

        // Check if this round qualifies as a final round
        const isFinalRound = numberOfGroups === "1" &&
            (groups.group1 && groups.group1.length === 2 || qualifiersPerGroup === 1);

        console.log("isFinalRound", isFinalRound);

        // Step 6: Create and save the round with the structured groups and standings
        const newRound = new Round({
            roundName,
            scheduleType,
            tournament: tournamentId,
            groups: formattedGroups,
            qualifiersCount: qualifiersPerGroup,
            isFinalRound: isFinalRound  // Set isFinalRound based on the conditions
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
            .populate('groups.standings.team', 'teamName teamLogo')  // Optionally populate team details
            .populate('qualifiedTeams', 'teamName teamLogo');  // Optionally populate team details



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


// Function to calculate Net Run Rate (NRR)
const calculateNetRunRate = (runsScored, oversFaced, runsConceded, oversBowled) => {
    console.log("calculateNetRunRate", runsScored, oversFaced, runsConceded, oversBowled);

    // Check for division by zero for oversFaced and oversBowled
    const scoredRunRate = oversFaced > 0 ? runsScored / oversFaced : 0;
    const concededRunRate = oversBowled > 0 ? runsConceded / oversBowled : 0;

    const netRunRate = scoredRunRate - concededRunRate;

    // Return NRR rounded to two decimal places, or 0 if the result is NaN
    return isNaN(netRunRate) ? 0 : parseFloat(netRunRate.toFixed(2));
};

// Helper function to calculate overs in decimal format
const calculateOversInDecimal = (oversArray) => {
    const totalBalls = oversArray.reduce((sum, over) => sum + over.balls.length, 0);
    const completeOvers = Math.floor(totalBalls / 6);
    const remainingBalls = totalBalls % 6;
    return parseFloat(`${completeOvers}.${remainingBalls}`);
};

// Helper function to calculate cumulative NRR for a team over multiple matches
const calculateCumulativeNRR = (matches, teamId) => {
    console.log("matches, teamId", matches, teamId);

    let totalRunsScored = 0;
    let totalOversFaced = 0;
    let totalRunsConceded = 0;
    let totalOversBowled = 0;

    matches.forEach((match) => {
        const teamInning = match.innings.find(inning => inning.team._id.toString() === teamId);
        const opponentInning = match.innings.find(inning => inning.team._id.toString() !== teamId);

        if (teamInning) {
            totalRunsScored += teamInning.runs;
            totalOversFaced += calculateOversInDecimal(teamInning.overs);
        }
        if (opponentInning) {
            totalRunsConceded += opponentInning.runs;
            totalOversBowled += calculateOversInDecimal(opponentInning.overs);
        }
    });

    return calculateNetRunRate(totalRunsScored, totalOversFaced, totalRunsConceded, totalOversBowled);
};

const updateStandings = asyncHandler(async (req, res) => {
    try {
        const { teamIds, roundId } = req.body;
        console.log("req.body", req.body);

        // Step 1: Retrieve the round and populate groups and matches
        const round = await Round.findById(roundId).populate({
            path: "groups.matches",
            populate: { path: "teams" }
        });
        if (!round) throw new ApiError(404, "Round not found.");

        // Step 2: Find the group that contains the specified teams
        const group = round.groups.find(group =>
            group.teams.includes(teamIds[0]) && group.teams.includes(teamIds[1])
        );
        if (!group) throw new ApiError(404, "Group with specified teams not found in this round.");

        // Step 2-1: Extract all teamIds from the identified group
        const allTeamIdsInGroup = group.teams.map(team => team._id.toString());
        console.log("All team IDs in group:", allTeamIdsInGroup);

        // Step 3: Filter completed matches involving any team in allTeamIdsInGroup
        const relevantMatches = group.matches.filter(match =>
            match.teams.some(team => allTeamIdsInGroup.includes(team._id.toString())) &&
            match.status === "completed"
        );
        console.log("Relevant matches:", relevantMatches);

        if (relevantMatches.length === 0) {
            throw new ApiError(404, "No completed matches found between specified teams.");
        }

        // Step 4: Initialize standings map with cumulative stats for each team
        const standingsMap = {};
        allTeamIdsInGroup.forEach(teamId => {
            standingsMap[teamId] = {
                team: teamId,
                played: 0,
                won: 0,
                lost: 0,
                tied: 0,
                points: 0,
                runsScored: 0,
                oversFaced: 0,
                runsConceded: 0,
                oversBowled: 0,
                netRunRate: 0
            };
        });

        // Step 5: Accumulate stats from relevant matches
        relevantMatches.forEach(match => {
            const { teams, result } = match;
            console.log("Relevant Teams:", teams);

            teams.forEach(team => {
                const teamId = team._id.toString();
                const opponentTeam = teams.find(t => t._id.toString() !== teamId);
                const opponentTeamId = opponentTeam._id.toString();
                const teamStanding = standingsMap[teamId];

                if (!teamStanding) return; // Skip if teamStanding does not exist

                const opponentInning = match.innings.find(inning => inning.team._id.toString() === opponentTeamId);
                const teamInning = match.innings.find(inning => inning.team._id.toString() === teamId);

                // Update played count
                teamStanding.played += 1;

                // Update win/loss/tie points
                if (result.winner.toString() === teamId) {
                    teamStanding.won += 1;
                    teamStanding.points += 2;
                } else if (result.isTie === true) {
                    teamStanding.tied += 1;
                    teamStanding.points += 1;
                } else {
                    teamStanding.lost += 1;
                }

                // Accumulate runs and overs for cumulative NRR calculation
                if (teamInning) {
                    teamStanding.runsScored += teamInning.runs;
                    teamStanding.oversFaced += calculateOversInDecimal(teamInning.overs);
                }
                if (opponentInning) {
                    teamStanding.runsConceded += opponentInning.runs;
                    teamStanding.oversBowled += calculateOversInDecimal(opponentInning.overs);
                }
            });
        });

        // Step 6: Calculate cumulative NRR for each team using accumulated totals
        allTeamIdsInGroup.forEach(teamId => {
            const standing = standingsMap[teamId];
            standing.netRunRate = calculateNetRunRate(
                standing.runsScored,
                standing.oversFaced,
                standing.runsConceded,
                standing.oversBowled
            );
            console.log("Cumulative NRR for team", teamId, ":", standing.netRunRate);
        });

        // Step 7: Update group standings in the round
        group.standings = Object.values(standingsMap);

        // Step 8: Sort standings by points and NRR
        group.standings.sort((a, b) => {
            if (b.points === a.points) {
                return b.netRunRate - a.netRunRate; // Sort by NRR if points are equal
            }
            return b.points - a.points; // Sort by points in descending order
        });

        // Step 9: Check if all matches in the round are completed
        const allMatchesCompleted = round.groups.every(group =>
            group.matches.every(match => match.status === "completed")
        );
        console.log("allMatchesCompleted", allMatchesCompleted);
        round.completed = allMatchesCompleted;
        // Step 10: Handle qualifiers based on schedule type
        if (allMatchesCompleted) {
            if (round.scheduleType === "round-robin") {
                const qualifiersCount = round.qualifiersCount;
                const qualifiedTeams = []; // Array to store top teams

                // For round-robin, get top teams from each group
                round.groups.forEach(group => {
                    const topTeams = group.standings.slice(0, qualifiersCount);
                    topTeams.forEach(team => qualifiedTeams.push(team.team));
                });

                round.qualifiedTeams = qualifiedTeams;
                console.log("Qualified Teams for next round (Round-Robin):", qualifiedTeams);
            } else if (round.scheduleType === "knockout") {
                // For knockout, collect winners from completed matches
                const qualifiedTeams = new Set(); // Use a Set to avoid duplicates

                // Loop through all groups to get matches
                round.groups.forEach(group => {
                    group.matches.forEach(match => {
                        if (match.status === "completed" && match.result?.winner) {
                            qualifiedTeams.add(match.result.winner.toString());
                        }
                    });
                });

                // Convert Set to array and assign to qualifiedTeams in round
                round.qualifiedTeams = Array.from(qualifiedTeams);
                console.log("Qualified Teams for next round (Knockout):", round.qualifiedTeams);
            }

            // If this is the final round, set the tournament winner
            if (round.isFinalRound && round.tournament && round.qualifiedTeams.length === 1) {
                const tournamentId = round.tournament;
                const tournamentWinner = round.qualifiedTeams[0]; // Only one team should be the winner
                console.log("tournamentWinner", tournamentWinner, tournamentId);
                try {
                    // Find the tournament by ID first to check if it already has a winner
                    const tournament = await Tournament.findById(tournamentId);

                    if (tournament) {
                        if (tournament.winner) {
                            console.log("Tournament already has a winner:", tournament.winner);
                        } else {
                            // Tournament has no winner, so we can proceed to update it
                            const updatedTournament = await Tournament.findByIdAndUpdate(
                                tournamentId,
                                { winner: tournamentWinner },
                                { new: true } // Return the updated document
                            );

                            if (updatedTournament) {
                                console.log("Tournament updated with winner:", updatedTournament);

                                // Find the winning team and add the tournament ID to tournamentsWon array
                                const updatedTeam = await Team.findByIdAndUpdate(
                                    tournamentWinner, // Assuming tournamentWinner is the team's ID
                                    { $addToSet: { tournamentsWon: tournamentId } }, // Use $addToSet to avoid duplicates
                                    { new: true } // Return the updated document
                                );

                                if (updatedTeam) {
                                    console.log("Updated winning team with tournament ID:", updatedTeam);
                                } else {
                                    console.log("Winning team not found.");
                                }
                            }
                        }
                    } else {
                        console.log("Tournament not found.");
                    }
                } catch (error) {
                    console.error("Error updating tournament winner or team:", error);
                }



            }
        }

        await round.save();


        // Return success response
        return res.status(200).json(new ApiResponse(200, group.standings, "Standings and qualifiers updated successfully."));
    } catch (error) {
        console.error("Error updating standings:", error);
        throw new ApiError(500, error.message);
    }
});


// Controller function to update standings
const updateStandings1 = asyncHandler(async (req, res) => {
    try {
        const { matchId, roundId, groupName } = req.body;
        console.log("req.body", req.body);
        // Step 1: Fetch the completed match
        const match = await Match.findById(matchId).populate("teams innings.team");
        if (!match || match.status !== "completed") {
            throw new ApiError(404, "Match not found or is not completed.");
        }
        const { result } = match;
        const teams = match.teams.map((team) => team.toString());
        // Step 2: Retrieve the round and find the specific group
        const round = await Round.findById(roundId);
        if (!round) {
            throw new ApiError(404, "Round not found.");
        }
        const group = round.groups.find((grp) => grp.groupName === groupName);
        if (!group) {
            throw new ApiError(404, "Group not found in this round.");
        }

        // Step 3: Map standings for easy access and update based on match result
        const standingsMap = group.standings.reduce((acc, standing) => {
            acc[standing.team.toString()] = standing;
            return acc;
        }, {});

        if (result.isTie) {
            // Update for tie
            teams.forEach(teamId => {
                const standing = standingsMap[teamId];
                standing.played += 1;
                standing.tied += 1;
                standing.points += 1; // 1 point for a tie
            });
        } else if (result.winner) {
            // Update for win/loss
            const winningTeamId = result.winner.toString();
            const losingTeam = match.teams.find(team => team._id.toString() !== winningTeamId);
            const losingTeamId = losingTeam?._id;


            console.log("winningTeamId", winningTeamId);
            console.log("losingTeam", losingTeam);
            console.log("losingTeamId", losingTeamId);

            standingsMap[winningTeamId].played += 1;
            standingsMap[winningTeamId].won += 1;
            standingsMap[winningTeamId].points += 2; // 2 points for a win
            standingsMap[losingTeamId].played += 1;
            standingsMap[losingTeamId].lost += 1;
        } else {
            // No result
            teams.forEach(teamId => {
                const standing = standingsMap[teamId];
                standing.played += 1;
                standing.noResults = (standing.noResults || 0) + 1;
                standing.points += 1; // 1 point each for no result
            });
        }

        // Step 4: Calculate and update NRR for each team
        for (const inning of match.innings) {
            const teamId = inning.team._id.toString();
            const standing = standingsMap[teamId];

            // Update runs scored and overs faced for the team
            standing.runsScored = (standing.runsScored || 0) + inning.runs;
            standing.oversFaced = (standing.oversFaced || 0) + calculateOversInDecimal(inning.overs);

            // Find opponent's inning to get runs conceded and overs bowled
            const opponentInning = match.innings.find(inn => inn.team._id.toString() !== teamId);
            standing.runsConceded = (standing.runsConceded || 0) + (opponentInning?.runs || 0);
            standing.oversBowled = (standing.oversBowled || 0) + (opponentInning ? calculateOversInDecimal(opponentInning.overs) : 0);


            standing.netRunRate = calculateNetRunRate(
                standing.runsScored,
                standing.oversFaced,
                standing.runsConceded,
                standing.oversBowled
            );
        }

        // Step 5: Update group standings with calculated values
        group.standings = Object.values(standingsMap);
        await round.save();

        // Return success response
        return res.status(200).json(new ApiResponse(200, group.standings, "Standings updated successfully."));
    } catch (error) {
        console.error("Error updating standings:", error);
        throw new ApiError(500, error.message);
    }
});

export { createRound, getRoundsbyTournamentId, deleteRound, updateStandings1, updateStandings };
