import { asyncHandler } from "../utils/asyncHandler.js";
import { Player } from "../models/player.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { nanoid } from 'nanoid';  // Import nanoid to generate random strings
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Team } from "../models/team.model.js";
import Match from "../models/match.model.js";
import { Club } from "../models/club.model.js";
import { Notification } from "../models/notification.model.js";
import { getAdminUserId } from "../utils/getAdminUserId.js";

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
            associatedClub: associatedClub?.trim() || null,
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
        console.log(error);

        // Check for MongoDB duplicate key error
        if (error.code === 11000) {
            // Extract duplicate field name from the error message
            const duplicateField = Object.keys(error.keyValue)[0];
            const duplicateValue = error.keyValue[duplicateField];

            throw new ApiError(400, `The ${duplicateField} "${duplicateValue}" is already taken. Please use a different ${duplicateField}.`);
        }

        // For other errors
        throw new ApiError(500, "An error occurred while creating the player.");
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

const getRandomPlayers = asyncHandler(async (req, res) => {
    try {
        // Fetch players with populated fields
        const players = await Player.find()
            .select("-__v")
            .populate({
                path: 'currentTeam',
                select: 'teamName teamLogo', // Populate teamName and teamLogo for the current team
            })
            .populate({
                path: 'teams',
                select: 'teamName teamLogo', // Populate teamName and teamLogo for past teams
            })
            .populate({
                path: 'associatedClub',
                select: 'clubName clubLogo', // Populate clubName and clubLogo for the associated club
            });

        // Filter out players who have an empty profilePicture
        const filteredPlayers = players.filter(player => player.profilePicture && player.profilePicture.trim() !== "");

        // Shuffle players array to randomize selection
        const shuffledPlayers = filteredPlayers.sort(() => 0.5 - Math.random());

        // Group players by their current team and select players from different teams
        const playersByTeam = {};
        shuffledPlayers.forEach(player => {
            const teamId = player.currentTeam?._id;
            if (teamId && (!playersByTeam[teamId] || playersByTeam[teamId].length < 2)) { // Limit to a few players per team
                playersByTeam[teamId] = playersByTeam[teamId] || [];
                playersByTeam[teamId].push(player);
            }
        });

        // Flatten the grouped players array
        let uniqueTeamPlayers = Object.values(playersByTeam).flat();

        // If we have fewer than 12 players, add additional players to meet the count
        if (uniqueTeamPlayers.length < 12) {
            const additionalPlayers = shuffledPlayers.filter(
                player => !uniqueTeamPlayers.includes(player)
            ).slice(0, 12 - uniqueTeamPlayers.length);
            uniqueTeamPlayers = uniqueTeamPlayers.concat(additionalPlayers);
        }

        // Limit to exactly 12 players
        uniqueTeamPlayers = uniqueTeamPlayers.slice(0, 9);

        if (uniqueTeamPlayers.length === 0) {
            throw new ApiError(404, "No players found");
        }

        // Respond with a success message and the list of 12 players
        return res.status(200).json(
            new ApiResponse(200, uniqueTeamPlayers, "Players fetched successfully")
        );

    } catch (error) {
        console.error("Error fetching players:", error.message);
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

const releasePlayerFromClub = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params; // Player ID
        console.log("Player ID", id);

        // Find the player by ID
        const player = await Player.findById(id);
        if (!player) {
            return res.status(404).json(new ApiResponse(404, null, "Player not found"));
        }

        const clubId = player.associatedClub;
        if (!clubId) {
            return res.status(400).json(new ApiResponse(400, null, "Player is not associated with any club"));
        }

        // Check if the player is part of any team in the associated club
        const teams = await Team.find({
            associatedClub: clubId, // Match the team’s associated club to the player’s club
            players: { $in: [id] }  // Check if the player's ID is in the players array
        });

        console.log("teams", teams);

        if (teams.length > 0) {
            return res.status(500).json(new ApiError(400, null, "Player is currently part of a team in the club and cannot be released"));
        }

        // Release the player from the club by setting associatedClub to null
        player.associatedClub = null;
        await player.save();

        return res.status(200).json(
            new ApiResponse(200, null, "Player released from club successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "An error occurred while releasing the player from the club");
    }
});
const addPlayerToClub = asyncHandler(async (req, res) => {
    try {
        const { playerId, clubId } = req.params;

        // Find the player by ID
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json(new ApiResponse(404, null, "Player not found"));
        }

        // Find the club by ID and populate the manager field
        const club = await Club.findById(clubId).populate('manager'); // Assume 'manager' references the User model
        if (!club) {
            return res.status(404).json(new ApiResponse(404, null, "Club not found"));
        }

        // Check if player is already associated with a club
        if (player.associatedClub) {
            return res.status(400).json(new ApiResponse(400, null, "Player is already associated with a club"));
        }

        // Add player to the club
        player.associatedClub = clubId;
        player.requestedClubs = [];  // Clear the requestedClubs array
        await player.save();

        // Notification details
        // const adminUserId = "66e5e61a78e6dd01a8560b47"; // Admin user ID as the sender
        const adminUserId = await getAdminUserId();

        const managerId = club.manager._id; // Club manager as the recipient

        // Create a notification (optional: save this to a notifications collection if needed)
        // Save the notification to the database
        const notification = await Notification.create({
            type: "player_added",
            status: "unread",
            senderId: adminUserId,
            receiverId: managerId,
            message: `${player.playerName} has been successfully added to your club, ${club.clubName}.`,
            redirectUrl: `/club-manager/dashboard/players`, // Include redirect URL in the emitted notification
            isRead: false,
        });
        // Emit the notification in real-time via Socket.IO
        global.io.to(managerId.toString()).emit('notification', notification);


        return res.status(200).json(
            new ApiResponse(200, { player, club }, "Player added to club successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "An error occurred while adding the player to the club");
    }
});
const addPlayerToClubReq = asyncHandler(async (req, res) => {
    try {
        const { playerId, clubId } = req.params;

        // Find the player by ID
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json(new ApiResponse(404, null, "Player not found"));
        }

        // Find the club by ID and populate manager details
        const club = await Club.findById(clubId).populate('manager');
        if (!club) {
            return res.status(404).json(new ApiResponse(404, null, "Club not found"));
        }

        // Get the manager's user ID as the senderId
        const senderId = club.manager._id;

        // Check if the player is already associated with a club
        if (player.associatedClub) {
            return res.status(400).json(new ApiResponse(400, null, "Player is already associated with a club"));
        }

        // Check if the club is already in the requestedClubs array
        if (player.requestedClubs.includes(clubId)) {
            return res.status(400).json(new ApiResponse(400, null, "Club has already requested to add this player"));
        }

        // Add the club to the requestedClubs array
        player.requestedClubs.push(clubId);
        await player.save();

        // Create a notification for the admin
        // const adminUserId = "66e5e61a78e6dd01a8560b47"; // Replace with actual admin ID
        const adminUserId = await getAdminUserId();

        const notification = new Notification({
            type: "player_request",
            status: "pending",
            senderId: senderId,
            receiverId: adminUserId,
            message: `${club.clubName} has requested to add ${player.playerName} to their club.`,
            redirectUrl: `/admin/players`, // Add this for navigation
            isRead: false
        });

        await notification.save();

        // Emit the notification in real-time via Socket.IO to the admin’s room
        global.io.to(adminUserId.toString()).emit('notification', {
            _id: notification._id,
            type: "player_request",
            status: "pending",
            senderId: senderId,
            receiverId: adminUserId,
            message: `${club.clubName} has requested to add ${player.playerName} to their club.`,
            redirectUrl: `/admin/players`, // Include redirect URL in the emitted notification
            timestamp: notification.timestamp,
            isRead: false
        });

        return res.status(200).json(
            new ApiResponse(200, { player, club }, "Club request to add player has been submitted successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "An error occurred while submitting the club request");
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
const getInactivePlayers = asyncHandler(async (req, res) => {
    try {
        // Find all players where associatedClub is an empty string
        console.log("Hello");

        const inactivePlayers = await Player.find({ associatedClub: null })
            .select('playerName city phone email profilePicture DOB status jersyNo role battingStyle bowlingStyle CNIC requestedClubs')
            .populate({
                path: 'requestedClubs',
                select: 'clubName', // Only populate the 'clubName' field in requestedClubs
            });



        return res.status(200).json(
            new ApiResponse(200, inactivePlayers, "Inactive players retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Server error");
    }
});

export {
    getAvailablePlayersForTeam,
    createPlayer,
    getRandomPlayers,
    updatePlayer,
    deletePlayer,
    getAllPlayers,
    updatePlayerStats,
    getPlayerById,
    getInactivePlayers,
    releasePlayerFromClub,
    addPlayerToClub,
    addPlayerToClubReq
}