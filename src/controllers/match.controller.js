

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
            .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.battingPerformances.fielder', model: 'Player' }).populate({ path: 'result.winner', model: 'Team' });

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




export {
    createMatch, getMatchesByTeamId, getMatchesByTournamentId, getMatchById, startMatch, initializePlayers, getAllMatches
}