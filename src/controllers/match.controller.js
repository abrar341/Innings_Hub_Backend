

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Match from "../models/match.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { Round } from "../models/rounds.model.js";

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

const scheduleMatches = asyncHandler(async (req, res) => {
    try {
        const { tournamentId, round: roundId, venues, overs, startDate, matchTimes, matchesPerDay } = req.body;
        console.log(req.body);


        // Find the round with groups and validate schedule type
        const round = await Round.findById(roundId);
        console.log("round", round);

        if (!round) {
            return res.status(400).json({ error: "Invalid round or unsupported schedule type." });
        }
        // Check if matches are already scheduled for this round
        const matchesExist = round.groups.some(group => group.matches && group.matches.length > 0);
        if (matchesExist) {
            throw new ApiError(400, "Matches are already scheduled for this round.");
        }
        // Parse venues if they are in string format
        const venueList = typeof venues === 'string' ? venues.split(',').map(v => v.trim()) : venues;

        // Initialize scheduling variables
        let matchDate = new Date(startDate);
        if (isNaN(matchDate)) throw new Error("Invalid start date format.");

        let venueIndex = 0;
        let matchesScheduled = 0;

        if (round.scheduleType === 'round-robin') {
            // Round-robin scheduling logic
            for (const group of round.groups) {
                if (!group.teams || group.teams.length < 2) {
                    return res.status(400).json({ error: "Each group must contain at least two teams." });
                }

                const matchIds = [];

                // Generate matches for each pair of teams in the group
                for (let i = 0; i < group.teams.length; i++) {
                    for (let j = i + 1; j < group.teams.length; j++) {
                        const team1 = group.teams[i];
                        const team2 = group.teams[j];



                        // Calculate the time slot and match time, handling cases with only one time
                        const timeSlotIndex = matchesScheduled % matchTimes.length;
                        const [hours, minutes] = matchTimes[timeSlotIndex % matchTimes.length].split(":").map(Number);
                        console.log("hours", hours, minutes, 0, 0);

                        if (isNaN(hours) || isNaN(minutes)) throw new Error("Invalid match time format in matchTimes array.");

                        // Set match time for the current date
                        const matchTime = new Date(matchDate);
                        matchTime.setUTCHours(hours, minutes, 0, 0); // Setting seconds and milliseconds to 0 if needed
                        console.log("matchTime", matchTime);


                        // Construct match data object
                        const matchData = {
                            teams: [team1, team2],
                            round: roundId,
                            venue: venueList[venueIndex],
                            overs: Number(overs),
                            date: matchDate.toISOString().split('T')[0],
                            time: matchTime.toISOString().split('T')[1],
                            tournament: tournamentId,
                            status: 'scheduled'
                        };
                        console.log("matchData", matchData);


                        // Save match and store its ID
                        const createdMatch = await Match.create(matchData);
                        matchIds.push(createdMatch._id);

                        // Update counters and indices
                        venueIndex = (venueIndex + 1) % venueList.length;
                        matchesScheduled++;

                        // Increment day if daily match limit is reached
                        if (matchesScheduled % matchesPerDay === 0) {
                            console.log("new date");
                            matchDate.setDate(matchDate.getDate() + 1);
                        }
                    }
                }

                // Attach created matches to the group
                group.matches.push(...matchIds);
            }
        } else if (round.scheduleType === 'knockout') {
            // Knockout scheduling logic
            for (const group of round.groups) {
                const { teams } = group;
                if (!teams || teams.length < 2) {
                    return res.status(400).json({ error: "Each group must contain at least two teams for knockout." });
                }

                const shuffledTeams = [...teams].sort(() => Math.random() - 0.5); // Shuffle teams randomly
                const matchIds = [];

                // Pair teams randomly to play matches
                for (let i = 0; i < shuffledTeams.length; i += 2) {
                    if (i + 1 >= shuffledTeams.length) break; // Skip if there's an odd team

                    const team1 = shuffledTeams[i];
                    const team2 = shuffledTeams[i + 1];

                    // Calculate the time slot and match time
                    const timeSlotIndex = matchesScheduled % matchTimes.length;
                    const [hours, minutes] = matchTimes[timeSlotIndex].split(":").map(Number);

                    if (isNaN(hours) || isNaN(minutes)) throw new Error("Invalid match time format in matchTimes array.");

                    // Set match time for the current date
                    const matchTime = new Date(matchDate);
                    matchTime.setHours(hours, minutes);

                    // Construct match data object
                    const matchData = {
                        teams: [team1, team2],
                        round: roundId,
                        venue: venueList[venueIndex],
                        overs: Number(overs),
                        date: matchDate.toISOString().split('T')[0],
                        time: matchTime.toISOString().split('T')[1],
                        tournament: tournamentId,
                        status: 'scheduled'
                    };

                    // Save match and store its ID
                    const createdMatch = await Match.create(matchData);
                    matchIds.push(createdMatch._id);

                    // Update counters and indices
                    venueIndex = (venueIndex + 1) % venueList.length;
                    matchesScheduled++;

                    // Increment day if daily match limit is reached
                    if (matchesScheduled % matchesPerDay === 0) {
                        console.log("new date");
                        matchDate.setDate(matchDate.getDate() + 1);
                    }
                }

                // Attach created matches to the group
                group.matches.push(...matchIds);
            }
        }

        // Save the updated round with references to the matches
        await round.save();

        return res.status(201).json({
            message: "Matches scheduled and added to groups successfully.",
            roundId,
            tournamentId,
        });
    } catch (error) {
        console.error("Error scheduling matches:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});

const getMatchesByTournamentId = asyncHandler(async (req, res) => {
    try {
        const { tournamentId } = req.params;
        console.log(req.params);


        const matches = await Match.find({ tournament: tournamentId })
            .populate('innings.team innings.battingPerformances innings.bowlingPerformances').populate({
                path: 'teams',
            }).populate({
                path: 'teams',
            }).populate({
                path: 'tournament',
            })
            .populate({
                path: 'playing11.team',  // Populate the team field in playing11
                model: 'Team' // The reference model is 'Team'
            })
            .populate({
                path: 'playing11.players', // Populate the players array in playing11
                model: 'Player' // The reference model is 'Player'
            })
            .populate({
                path: 'innings.nonStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.previousBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.team',
                model: 'Team'
            })
            .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
            .populate('innings.bowlingPerformances.player').populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' })
            .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.battingPerformances.fielder', model: 'Player' }).populate({ path: 'result.winner', model: 'Team' });


        if (!matches) {
            throw new ApiError(404, "No matches found for this tournament.");
        }

        res.status(200).json(new ApiResponse(200, matches, "Matches fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "Internal Server Error");
    }
});

const getMatchesByTeamId = asyncHandler(async (req, res) => {
    try {
        const { teamId } = req.params;
        console.log(req.params);


        // Find matches where the teamId is in the 'teams' array (which holds 2 teams per match)
        const matches = await Match.find({ teams: teamId })
            .populate('innings.team innings.battingPerformances innings.bowlingPerformances').populate({
                path: 'teams',
            }).populate({
                path: 'teams',
            }).populate({
                path: 'tournament',
            })
            .populate({
                path: 'playing11.team',  // Populate the team field in playing11
                model: 'Team' // The reference model is 'Team'
            })
            .populate({
                path: 'playing11.players', // Populate the players array in playing11
                model: 'Player' // The reference model is 'Player'
            })
            .populate({
                path: 'innings.nonStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.previousBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.team',
                model: 'Team'
            })
            .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
            .populate('innings.bowlingPerformances.player').populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' })
            .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.battingPerformances.fielder', model: 'Player' }).populate({ path: 'result.winner', model: 'Team' });


        if (!matches || matches.length === 0) {
            throw new ApiError(404, "No matches found for this team.");
        }

        res.status(200).json(new ApiResponse(200, matches, "Matches fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "Internal Server Error");
    }
});

const getMatchById = asyncHandler(async (req, res) => {
    try {
        const { matchId } = req.params;
        console.log(matchId);

        // Find the match by its ID and populate necessary fields
        const match = await Match.findById(matchId)
            .populate('teams') // Populating the teams associated with the match
            .populate('tournament')
            .populate('toss')
            .populate({
                path: 'playing11.team',  // Populate the team field in playing11
                model: 'Team' // The reference model is 'Team'
            })
            .populate({
                path: 'playing11.players', // Populate the players array in playing11
                model: 'Player' // The reference model is 'Player'
            });

        // Populating the tournament the match belongs to


        // If no match is found, throw a 404 error
        if (!match) {
            throw new ApiError(404, "Match not found.");
        }

        // Send a successful response with the match details
        res.status(200).json(new ApiResponse(200, match, "Match details fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "Internal Server Error");
    }
});
const startMatch = asyncHandler(async (req, res) => {
    const { matchId } = req.params;
    const { tossWinner, tossDecision, playing11 } = req.body;
    console.log(req.body);

    console.log(matchId);

    try {
        // Find the match by ID
        const match = await Match.findById(matchId).populate('teams')

            .populate({
                path: 'teams',
            })
            .populate({
                path: 'toss',  // Populate the team field in playing11
                model: 'Team' // The reference model is 'Team'
            })
            .populate({
                path: 'playing11.team',  // Populate the team field in playing11
                model: 'Team' // The reference model is 'Team'
            })
            .populate({
                path: 'playing11.players', // Populate the players array in playing11
                model: 'Player' // The reference model is 'Player'
            })
            .populate({
                path: 'innings.nonStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.previousBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings',
                populate: { path: 'team', model: 'Team' }  // Nested populate inside innings
            });

        if (!match) {
            throw new ApiError(404, 'Match not found');
        }

        // Ensure match is still scheduled and not already live or completed
        if (match.status !== 'scheduled') {
            throw new ApiError(400, 'Match has already started or completed');
        }

        // Validate playing11 structure
        if (!Array.isArray(playing11) || playing11.length !== 2) {
            throw new ApiError(400, 'Invalid playing11 structure. It should contain players from both teams.');
        }
        // Update toss winner, toss decision, and playing 11
        match.toss = tossWinner;
        match.tossDecision = tossDecision;
        match.playing11 = playing11;
        // Find the toss winner team object from the match teams array
        const tossWinnerTeam = match.teams.find(team => team._id.toString() === tossWinner.toString());

        // Determine which team bats first based on the toss decision
        const firstInningTeam = tossDecision === 'bat'
            ? tossWinnerTeam
            : match.teams.find(team => team._id.toString() !== tossWinner.toString());

        const secondInningTeam = match.teams.find(team => team._id.toString() !== firstInningTeam._id.toString());

        console.log("firstInningTeam", firstInningTeam);
        console.log("secondInningTeam", secondInningTeam);

        // Initialize the innings data with full team details
        match.innings = [
            {
                team: firstInningTeam,
                runs: 0,
                wickets: 0,
                totalOvers: 0,
                extras: {
                    wides: 0,
                    noBalls: 0,
                    byes: 0,
                    legByes: 0,
                    total: 0,
                },
                fallOfWickets: [],
                battingPerformances: [],
                bowlingPerformances: [],
            },
            {
                team: secondInningTeam,
                runs: 0,
                wickets: 0,
                totalOvers: 0,
                extras: {
                    wides: 0,
                    noBalls: 0,
                    byes: 0,
                    legByes: 0,
                    total: 0,
                },
                fallOfWickets: [],
                battingPerformances: [],
                bowlingPerformances: [],
            }
        ];


        // Set the current inning to the first one
        match.currentInning = 1;

        // Change the match status to 'live'
        match.status = 'live';

        // Save the updated match
        await match.save();

        await Match.findById(matchId).populate('teams')

            .populate({
                path: 'teams',
            })
            .populate({
                path: 'toss',  // Populate the team field in playing11
                model: 'Team' // The reference model is 'Team'
            })
            .populate({
                path: 'playing11.team',  // Populate the team field in playing11
                model: 'Team' // The reference model is 'Team'
            })
            .populate({
                path: 'playing11.players', // Populate the players array in playing11
                model: 'Player' // The reference model is 'Player'
            })
            .populate({
                path: 'innings.nonStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.previousBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings',
                populate: { path: 'team', model: 'Team' }  // Nested populate inside innings
            });
        if (!match) {
            throw new ApiError(404, 'Match not found');
        }
        io.to(matchId).emit('matchUpdate', {
            message: 'Match Started Soon',
            match: match,
        });

        res.status(200).json(new ApiResponse(200, match, 'Match started successfully and innings initialized'));
    } catch (error) {
        throw new ApiError(500, error.message || 'Internal Server Error');
    }
});
// const startMatch = asyncHandler(async (req, res) => {
//     const { matchId } = req.params;
//     const { tossWinner, tossDecision, playing11 } = req.body;
//     console.log(req.body);

//     console.log(matchId);

//     try {
//         // Find the match by ID
//         const match = await Match.findById(matchId).populate('teams')

//             .populate({
//                 path: 'teams',
//             })
//             .populate({
//                 path: 'toss',  // Populate the team field in playing11
//                 model: 'Team' // The reference model is 'Team'
//             })
//             .populate({
//                 path: 'playing11.team',  // Populate the team field in playing11
//                 model: 'Team' // The reference model is 'Team'
//             })
//             .populate({
//                 path: 'playing11.players', // Populate the players array in playing11
//                 model: 'Player' // The reference model is 'Player'
//             })
//             .populate({
//                 path: 'innings.nonStriker',
//                 model: 'Player'
//             })
//             .populate({
//                 path: 'innings.currentBowler',
//                 model: 'Player'
//             })
//             .populate({
//                 path: 'innings.currentStriker',
//                 model: 'Player'
//             })
//             .populate({
//                 path: 'innings.previousBowler',
//                 model: 'Player'
//             })
//             .populate({
//                 path: 'innings',
//                 populate: { path: 'team', model: 'Team' }  // Nested populate inside innings
//             });

//         if (!match) {
//             throw new ApiError(404, 'Match not found');
//         }

//         // Ensure match is still scheduled and not already live or completed
//         if (match.status !== 'scheduled') {
//             throw new ApiError(400, 'Match has already started or completed');
//         }

//         // Validate playing11 structure
//         if (!Array.isArray(playing11) || playing11.length !== 2) {
//             throw new ApiError(400, 'Invalid playing11 structure. It should contain players from both teams.');
//         }

//         // playing11.forEach(team => {
//         //     if (!team.team || !Array.isArray(team.players) || team.players.length !== 11) {
//         //         throw new ApiError(400, 'Each team should have exactly 11 players');
//         //     }
//         // });

//         // Update toss winner, toss decision, and playing 11
//         match.toss = tossWinner;
//         match.tossDecision = tossDecision;
//         match.playing11 = playing11;

//         // Determine which team bats first based on the toss decision
//         const firstInningTeam = tossDecision === 'bat'
//             ? tossWinner
//             : match.teams.find(team => team._id?.toString() !== tossWinner?.toString());
//         const secondInningTeam = match.teams.find(team => team._id?.toString() !== firstInningTeam?.toString());
//         console.log("firstInningTeam", firstInningTeam);
//         console.log("secondInningsTea,", secondInningTeam);

//         // Initialize the innings data based on the toss decision
//         match.innings = [
//             {
//                 team: firstInningTeam,
//                 runs: 0,
//                 wickets: 0,
//                 totalOvers: 0,
//                 extras: {
//                     wides: 0,
//                     noBalls: 0,
//                     byes: 0,
//                     legByes: 0,
//                     total: 0,
//                 },
//                 fallOfWickets: [],
//                 battingPerformances: [],
//                 bowlingPerformances: [],
//             },
//             {
//                 team: secondInningTeam,
//                 runs: 0,
//                 wickets: 0,
//                 totalOvers: 0,
//                 extras: {
//                     wides: 0,
//                     noBalls: 0,
//                     byes: 0,
//                     legByes: 0,
//                     total: 0,
//                 },
//                 fallOfWickets: [],
//                 battingPerformances: [],
//                 bowlingPerformances: [],
//             }
//         ];

//         // Set the current inning to the first one
//         match.currentInning = 1;

//         // Change the match status to 'live'
//         match.status = 'live';

//         // Save the updated match
//         await match.save();

//         await Match.findById(matchId).populate('teams')

//             .populate({
//                 path: 'teams',
//             })
//             .populate({
//                 path: 'toss',  // Populate the team field in playing11
//                 model: 'Team' // The reference model is 'Team'
//             })
//             .populate({
//                 path: 'playing11.team',  // Populate the team field in playing11
//                 model: 'Team' // The reference model is 'Team'
//             })
//             .populate({
//                 path: 'playing11.players', // Populate the players array in playing11
//                 model: 'Player' // The reference model is 'Player'
//             })
//             .populate({
//                 path: 'innings.nonStriker',
//                 model: 'Player'
//             })
//             .populate({
//                 path: 'innings.currentBowler',
//                 model: 'Player'
//             })
//             .populate({
//                 path: 'innings.currentStriker',
//                 model: 'Player'
//             })
//             .populate({
//                 path: 'innings.previousBowler',
//                 model: 'Player'
//             })
//             .populate({
//                 path: 'innings',
//                 populate: { path: 'team', model: 'Team' }  // Nested populate inside innings
//             });
//         if (!match) {
//             throw new ApiError(404, 'Match not found');
//         }
//         io.to(matchId).emit('matchUpdate', {
//             message: 'Match Started Soon',
//             match: match,
//         });

//         res.status(200).json(new ApiResponse(200, match, 'Match started successfully and innings initialized'));
//     } catch (error) {
//         throw new ApiError(500, error.message || 'Internal Server Error');
//     }
// });

// const initializePlayers = asyncHandler(async (req, res) => {
//     const { matchId } = req.params;
//     console.log(matchId);

//     const { striker, nonStriker, bowler } = req.body;
//     console.log(req.body);


//     try {
//         // Find the match by ID
//         const match = await Match.findById(matchId).populate('teams');
//         if (!match) {
//             throw new ApiError(404, 'Match not found');
//         }

//         // Ensure the match is live
//         if (match.status !== 'live') {
//             throw new ApiError(400, 'Cannot initialize inning as the match has not started or already completed');
//         }

//         // Get the current inning
//         const currentInning = match.innings[match.currentInning - 1]; // match.currentInning is 1-based index

//         // Ensure striker and nonStriker are in the playing11 of the batting team
//         // const battingTeamPlaying11 = match.playing11.find(p11 => p11.team.toString() === currentInning.team._id.toString());
//         // if (!battingTeamPlaying11.players.includes(striker) || !battingTeamPlaying11.players.includes(nonStriker)) {
//         //     throw new ApiError(400, 'Striker or Non-Striker is not part of the playing 11 for the batting team');
//         // }

//         // // Ensure bowler is part of the playing11 of the bowling team
//         // const bowlingTeam = match.innings.find(inning => inning.team._id.toString() !== currentInning.team._id.toString());
//         // const bowlingTeamPlaying11 = match.playing11.find(p11 => p11.team.toString() === bowlingTeam.team._id.toString());
//         // if (!bowlingTeamPlaying11.players.includes(bowler)) {
//         //     throw new ApiError(400, 'Bowler is not part of the playing 11 for the bowling team');
//         // }

//         // Initialize striker, non-striker, and bowler
//         currentInning.currentStriker = striker;
//         currentInning.nonStriker = nonStriker;
//         currentInning.currentBowler = bowler;

//         // Add striker and non-striker to battingPerformances if not already present
//         currentInning.battingPerformances = currentInning.battingPerformances || [];
//         if (!currentInning.battingPerformances.some(b => b.player.toString() === striker.toString())) {
//             currentInning.battingPerformances.push({
//                 player: striker,
//                 runs: 0,
//                 ballsFaced: 0,
//                 fours: 0,
//                 sixes: 0,
//                 strikeRate: 0,
//                 isOut: false
//             });
//         }
//         if (!currentInning.battingPerformances.some(b => b.player.toString() === nonStriker.toString())) {
//             currentInning.battingPerformances.push({
//                 player: nonStriker,
//                 runs: 0,
//                 ballsFaced: 0,
//                 fours: 0,
//                 sixes: 0,
//                 strikeRate: 0,
//                 isOut: false
//             });
//         }

//         // Add bowler to bowlingPerformances if not already present
//         currentInning.bowlingPerformances = currentInning.bowlingPerformances || [];
//         if (!currentInning.bowlingPerformances.some(b => b.player.toString() === bowler.toString())) {
//             currentInning.bowlingPerformances.push({
//                 player: bowler,
//                 overs: 0,
//                 maidens: 0,
//                 runsConceded: 0,
//                 wickets: 0,
//                 economyRate: 0,
//                 wides: 0,
//                 noBalls: 0
//             });
//         }

//         // Save the match
//         await match.save();

//         res.status(200).json(new ApiResponse(200, match, 'Inning initialized with striker, non-striker, and bowler, and performances updated.'));
//     } catch (error) {
//         throw new ApiError(500, error.message || 'Internal Server Error');
//     }
// });

const initializePlayers = asyncHandler(async (req, res) => {
    const { matchId } = req.params;
    const { striker, nonStriker, bowler } = req.body;
    console.log(req.body);
    try {
        // Find the match by ID
        const match = await Match.findById(matchId).populate('teams')
            .populate({
                path: 'playing11.team',  // Populate the team field in playing11
                model: 'Team' // The reference model is 'Team'
            }).populate({
                path: 'tournament',
            })
            .populate({
                path: 'playing11.players', // Populate the players array in playing11
                model: 'Player' // The reference model is 'Player'
            })
            .populate({
                path: 'innings.nonStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.previousBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.team',
                model: 'Team'
            });
        if (!match) {
            throw new ApiError(404, 'Match not found');
        }

        // Ensure the match is live
        if (match.status !== 'live') {
            throw new ApiError(400, 'Cannot initialize inning as the match has not started or already completed');
        }

        // Get the current inning
        const currentInning = match.innings[match.currentInning - 1]; // match.currentInning is 1-based index
        console.log("currentInning", currentInning);

        // Initialize striker, non-striker, and bowler
        currentInning.currentStriker = striker;
        currentInning.nonStriker = nonStriker;
        currentInning.currentBowler = bowler;

        // Add striker and non-striker to battingPerformances if not already present
        currentInning.battingPerformances = currentInning.battingPerformances || [];
        // Ensure battingPerformances is an array
        currentInning.battingPerformances = currentInning.battingPerformances || [];

        // Check for the striker and add if not already present
        if (!currentInning.battingPerformances.some(b => b.player.toString() === striker.toString())) {
            currentInning.battingPerformances.push({
                player: striker,
                runs: 0,
                ballsFaced: 0,
                fours: 0,
                sixes: 0,
                strikeRate: 0,
                isOut: false
            });
        }

        // Check for the non-striker and add if not already present
        if (!currentInning.battingPerformances.some(b => b.player.toString() === nonStriker.toString())) {
            currentInning.battingPerformances.push({
                player: nonStriker,
                runs: 0,
                ballsFaced: 0,
                fours: 0,
                sixes: 0,
                strikeRate: 0,
                isOut: false
            });

        }

        // Add bowler to bowlingPerformances if not already present
        currentInning.bowlingPerformances = currentInning.bowlingPerformances || [];
        if (!currentInning.bowlingPerformances.some(b => b.player.toString() === bowler.toString())) {
            currentInning.bowlingPerformances.push({
                player: bowler,
                overs: 0,
                maidens: 0,
                runsConceded: 0,
                wickets: 0,
                economyRate: 0,
                wides: 0,
                noBalls: 0
            });
        }

        let currentOver = {
            overNumber: 1, // Set over number correctly
            balls: [],
            totalRuns: 0,
            wickets: 0,
            extras: 0,
            bowler: bowler, // Replace with actual bowler ID
        };
        currentInning.overs.push(currentOver);
        // Save the match
        await match.save();

        // Emit an event to the room for the match
        // Assuming `io` is available in the controller scope
        io.to(matchId).emit('matchUpdate', {
            message: 'Players Initialized',
            match: match,
            striker,
            nonStriker,
            bowler
        });

        res.status(200).json(new ApiResponse(200, match, 'Inning initialized with striker, non-striker, and bowler, and performances updated.'));
    } catch (error) {
        throw new ApiError(500, error.message || 'Internal Server Error');
    }
});

const getAllMatches = asyncHandler(async (req, res) => {
    console.log("here");

    try {
        // Find all matches and populate relevant fields
        const matches = await Match.find()
            .populate('innings.team innings.battingPerformances innings.bowlingPerformances').populate({
                path: 'teams',
            }).populate({
                path: 'teams',
            }).populate({
                path: 'tournament',
            })
            .populate({
                path: 'playing11.team',  // Populate the team field in playing11
                model: 'Team' // The reference model is 'Team'
            })
            .populate({
                path: 'playing11.players', // Populate the players array in playing11
                model: 'Player' // The reference model is 'Player'
            })
            .populate({
                path: 'innings.nonStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.currentStriker',
                model: 'Player'
            })
            .populate({
                path: 'innings.previousBowler',
                model: 'Player'
            })
            .populate({
                path: 'innings.team',
                model: 'Team'
            })
            .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
            .populate('innings.bowlingPerformances.player').populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' })
            .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.battingPerformances.fielder', model: 'Player' })
            .populate({ path: 'result.winner', model: 'Team' })
            .populate({ path: 'round', model: 'Round' });

        // If no matches are found
        // if (!matches || matches.length === 0) {
        //     throw new ApiError(404, 'No matches found');
        // }

        // Respond with a success message and the matches
        res.status(200).json(new ApiResponse(200, matches, 'Matches fetched successfully'));
    } catch (error) {
        console.error('Error fetching matches:', error.message);
        throw new ApiError(500, error.message || 'Internal Server Error');
    }
});

const createPost = asyncHandler(async (req, res) => {
    console.log("req.body", req.body);

    try {
        const { matchId, descriptions } = req.body;

        // Ensure descriptions is an array (in case it's a single string)
        const descriptionArray = Array.isArray(descriptions) ? descriptions : [descriptions];

        console.log("descriptionArray:", descriptionArray);

        // Validate input data
        if (!matchId || !descriptionArray || descriptionArray.length === 0) {
            throw new ApiError(400, "Match ID and image descriptions are required.");
        }

        // Validate uploaded files
        if (!req.files || !req.files.images || !Array.isArray(req.files.images) || req.files.images.length === 0) {
            throw new ApiError(400, "At least one image is required.");
        }

        // Upload images to Cloudinary and store URLs
        const uploadedImages = await Promise.all(
            req.files.images.map(async (image) => {
                const imageLocalPath = image.path; // Get the local path of each uploaded file
                const uploadedImage = await uploadOnCloudinary(imageLocalPath); // Upload to Cloudinary
                return uploadedImage.url; // Return the URL of the uploaded image
            })
        );

        console.log("uploadedImages", uploadedImages);
        if (!uploadedImages) {
            throw new ApiError(500, error.message || "Images Req");

        }

        // Prepare and save posts for each image-description pair
        const createdPosts = await Promise.all(
            uploadedImages.map(async (imageUrl, index) => {
                const postData = {
                    description: descriptionArray[index]?.trim() || "",
                    matchId: matchId.trim(),
                    postPhotoUrl: imageUrl
                };
                console.log(postData);

                const post = new Post(postData);
                await post.save();

                // Populate the matchId field for response
                return await Post.findById(post._id).populate('matchId', 'matchName');
            })
        );

        // Return success response with all created posts
        return res.status(201).json(
            new ApiResponse(201, createdPosts, "Posts created successfully")
        );
    } catch (error) {
        // Handle and return any errors
        throw new ApiError(500, error.message || "Error creating posts");
    }
});

const getPostsByMatchId = asyncHandler(async (req, res) => {
    try {
        const { matchId } = req.params; // Extract matchId from the request parameters
        console.log(req.params);


        // Validate the matchId
        if (!matchId) {
            throw new ApiError(400, "Match ID is required.");
        }

        // Find all posts associated with the given matchId
        const posts = await Post.find({ matchId }).populate('matchId', 'matchName');

        // Check if posts are found
        if (posts.length === 0) {
            return res.status(404).json(
                new ApiResponse(404, [], "No posts found for this match.")
            );
        }

        // Return the found posts in the response
        return res.status(200).json(
            new ApiResponse(200, posts, "Posts retrieved successfully.")
        );
    } catch (error) {
        // Handle any errors
        throw new ApiError(500, error.message || "Error retrieving posts");
    }
});

const deleteMatchesByRound = asyncHandler(async (req, res) => {
    try {
        const { roundId } = req.params;

        // Find the round by ID
        const round = await Round.findById(roundId);
        if (!round) {
            return res.status(404).json({ error: "Round not found." });
        }

        // Collect all match IDs to delete and clear matches arrays in each group
        const matchIdsToDelete = [];
        round.groups.forEach(group => {
            matchIdsToDelete.push(...group.matches);
            group.matches = []; // Clear the matches array in each group
        });

        // Perform deletion of all matches in one operation
        await Match.deleteMany({ _id: { $in: matchIdsToDelete } });

        // Save the round with cleared matches arrays
        await round.save();

        return res.status(200).json({
            message: "All matches for the specified round have been deleted, and match IDs have been removed from the groups.",
            roundId,
            deletedMatchCount: matchIdsToDelete.length
        });
    } catch (error) {
        console.error("Error deleting matches by round:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});






export {
    createMatch, createPost, getPostsByMatchId, getMatchesByTeamId, getMatchesByTournamentId, getMatchById, startMatch, initializePlayers, getAllMatches, scheduleMatches, deleteMatchesByRound
}