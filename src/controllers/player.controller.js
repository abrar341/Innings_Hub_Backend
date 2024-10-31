import { asyncHandler } from "../utils/asyncHandler.js";
import { Player } from "../models/player.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { nanoid } from 'nanoid';  // Import nanoid to generate random strings
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Team } from "../models/team.model.js";
import Match from "../models/match.model.js";

const createPlayer = asyncHandler(async (req, res) => {
    console.log(req.body);
    try {
        const { playerName, city, phone, email, DOB, jersyNo, role, battingStyle, bowlingStyle, associatedClub, CNIC
        } = req.body;

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
            associatedClub: associatedClub?.trim(),
            CNIC: CNIC?.trim()
        };

        const player = new Player(sanitizedData);
        await player.save();
        const createdPlayer = await Player.findById(player._id)
            .select('playerName city phone email profilePicture DOB jersyNo role battingStyle bowlingStyle CNIC');

        return res.status(201).json(
            new ApiResponse(201, createdPlayer, "Player created successfully")
        );
    } catch (error) {
        throw new ApiError(500, error);
    }
});
const getAllPlayers = asyncHandler(async (req, res) => {
    try {
        const players = await Player.find()
            .select("-__v")
            .populate({
                path: 'currentTeam',
                select: 'teamName teamLogo', // Only populate the teamName field for the current team
            })
            .populate({
                path: 'teams',
                select: 'teamName teamLogo', // Only populate the teamName field for the teams array (past teams)
            })
            .populate({
                path: 'associatedClub',
                select: 'clubName clubLogo', // Populate the clubName field for the associatedClub directly tied to the player
            });

        console.log(players);
        // Exclude the `__v` field

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
            CNIC
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
        player.CNIC = CNIC?.trim() || player.CNIC;


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
const getPlayerById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        // Find the player by ID and exclude the `__v` field
        const player = await Player.findById(id).select("-__v")
            .populate({
                path: 'currentTeam',
                select: 'teamName teamLogo', // Only populate the teamName field for the current team
            })
            .populate({
                path: 'teams',
                select: 'teamName teamLogo', // Only populate the teamName field for the teams array (past teams)
            })
            .populate({
                path: 'associatedClub',
                select: 'clubName clubLogo', // Populate the clubName field for the associatedClub directly tied to the player
            });

        if (!player) {
            throw new ApiError(404, "Player not found");
        }

        // Return the player data with a success response
        return res.status(200).json(
            new ApiResponse(200, player, "Player fetched successfully")
        );

    } catch (error) {
        // Handle invalid player ID or other errors
        if (error.kind === "ObjectId") {
            throw new ApiError(400, "Invalid player ID");
        }

        throw new ApiError(500, "An error occurred while fetching the player");
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
const updatePlayerStats = async (req, res) => {
    const { matchId } = req.body;
    try {

        // Step 1: Reset all players' stats to 0 before updating based on the match
        // await Player.updateMany({}, {
        //     $set: {
        //         "stats.matches": 0,
        //         "stats.battingInnings": 0,
        //         "stats.runs": 0,
        //         "stats.ballFaced": 0,
        //         "stats.highestScore": 0,
        //         "stats.centuries": 0,
        //         "stats.halfCenturies": 0,
        //         "stats.bowlingInnings": 0,
        //         "stats.runsConceded": 0,
        //         "stats.wickets": 0,
        //         "stats.FiveWickets": 0,
        //         "stats.TenWickets": 0,
        //         "stats.BB": ""
        //     }
        // });
        // Fetch the match data by ID
        const match = await Match.findById(matchId)
            .populate({
                path: 'playing11.players',
                model: 'Player'
            })
            .populate({
                path: 'innings.battingPerformances.player',
                model: 'Player'
            })
            .populate({
                path: 'innings.bowlingPerformances.player',
                model: 'Player'
            });

        if (!match) {
            return res.status(404).json({ message: "Match not found" });
        }

        // Loop through each team's playing11 in the match
        for (const team of match.playing11) {
            for (const playerId of team.players) {
                // Increment matches played for each player in the playing11
                await Player.findByIdAndUpdate(playerId, {
                    $inc: { "stats.matches": 1 }
                });
            }
        }

        // Loop through each innings in the match to update batting and bowling stats
        for (const innings of match.innings) {
            // Update Batting Stats for each innings
            for (const batting of innings.battingPerformances) {
                const player = await Player.findById(batting.player);

                // Update batting innings and runs
                const newHighestScore = Math.max(player.stats.highestScore, batting.runs);
                const updateBattingStats = {
                    $inc: {
                        "stats.battingInnings": 1,
                        "stats.runs": batting.runs,
                        "stats.ballFaced": batting.ballsFaced,
                    },
                    $set: { "stats.highestScore": newHighestScore }
                };

                // Increment centuries and half-centuries if applicable
                if (batting.runs >= 100) updateBattingStats.$inc["stats.centuries"] = 1;
                if (batting.runs >= 50 && batting.runs < 100) updateBattingStats.$inc["stats.halfCenturies"] = 1;

                // Update the player's batting stats
                await Player.findByIdAndUpdate(batting.player, updateBattingStats);
            }

            // Update Bowling Stats for each innings
            for (const bowling of innings.bowlingPerformances) {
                const player = await Player.findById(bowling.player);

                // Calculate economy rate
                const totalOvers = bowling.overs + (bowling.balls % 6) / 10;
                const economyRate = bowling.runsConceded / totalOvers;

                // Update best bowling figures (BB)
                let bestBowling = player.stats.BB;
                const currentBB = `${bowling.wickets}/${bowling.runsConceded}`;
                if (!bestBowling || isBetterBB(currentBB, bestBowling)) {
                    bestBowling = currentBB;
                }

                const updateBowlingStats = {
                    $inc: {
                        "stats.bowlingInnings": 1,
                        "stats.runsConceded": bowling.runsConceded,
                        "stats.wickets": bowling.wickets,
                    },
                    $set: {
                        "stats.economy": economyRate,
                        "stats.BB": bestBowling
                    }
                };

                // Increment 5-wicket and 10-wicket hauls if applicable
                if (bowling.wickets >= 5) updateBowlingStats.$inc["stats.FiveWickets"] = 1;
                if (bowling.wickets >= 10) updateBowlingStats.$inc["stats.TenWickets"] = 1;

                // Update the player's bowling stats
                console.log("updateBowlingStats", updateBowlingStats);

                await Player.findByIdAndUpdate(bowling.player, updateBowlingStats);
            }
        }
        await Match.findByIdAndUpdate(matchId, { $set: { playerStats: true } });

        // Send a success response
        res.status(200).json({ message: "Player stats updated successfully!" });
    } catch (error) {
        console.error("Error updating player stats:", error);
        res.status(500).json({ message: "Error updating player stats", error });
    }
};
// Helper function to compare bowling figures (BB)
const isBetterBB = (currentBB, bestBB) => {
    const [currentWickets, currentRuns] = currentBB.split("/").map(Number);
    const [bestWickets, bestRuns] = bestBB.split("/").map(Number);

    // Higher wickets or, in case of a tie, fewer runs is better
    return currentWickets > bestWickets || (currentWickets === bestWickets && currentRuns < bestRuns);
};










export {
    getAvailablePlayersForTeam,
    createPlayer,
    updatePlayer,
    deletePlayer,
    getAllPlayers,
    updatePlayerStats,
    getPlayerById

}