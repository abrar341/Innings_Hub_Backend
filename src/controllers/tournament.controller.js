import { asyncHandler } from "../utils/asyncHandler.js";
import { Tournament } from "../models/tournament.model.js";
import { Squad } from "../models/squad.model.js";
import { Team } from "../models/team.model.js";
import { Player } from "../models/player.model.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Notification } from "../models/notification.model.js";
import { getAdminUserId } from "../utils/getAdminUserId.js";
import { Club } from "../models/club.model.js";
import { Round } from "../models/rounds.model.js";


const getAllTournaments = asyncHandler(async (req, res) => {
    try {
        const tournaments = await Tournament.find();
        if (!tournaments || tournaments.length === 0) {
            throw new ApiError(404, "No tournaments found");
        }

        // Map through tournaments to classify each one as started or upcoming
        const tournamentsWithStatus = await Promise.all(
            tournaments.map(async (tournament) => {
                const rounds = await Round.find({ tournament: tournament._id });

                return {
                    ...tournament.toObject(), // Include tournament details
                    status: rounds.length > 0 ? "Started" : "Upcoming", // Add status based on rounds
                    rounds, // Include associated rounds if needed
                };
            })
        );

        return res.status(200).json(
            new ApiResponse(
                200,
                tournamentsWithStatus,
                "Tournaments fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, "An error occurred while fetching tournaments");
    }
});

const createTournament = asyncHandler(async (req, res) => {
    const {
        season,
        startDate,
        endDate,
        name: inputName,
        shortName,
        ballType,
        tournamentType,
    } = req.body;


    if (!inputName?.trim() || !shortName?.trim() || !ballType?.trim() || !tournamentType?.trim()) {
        throw new ApiError(400, "Name, shortName, ballType, and tournamentType are required");
    }

    const name = inputName.trim();
    const existingTournament = await Tournament.findOne({ name, season });
    if (existingTournament) {
        throw new ApiError(409, "Tournament with this name and season already exists");
    }


    let imageLocalPath;

    if (req.files && Array.isArray(req.files.image) && req.files.image.length > 0) {
        imageLocalPath = req.files.image[0].path
    }

    const image = await uploadOnCloudinary(imageLocalPath)

    const tournamentData = {
        name,
        shortName: shortName.trim(),
        season,
        startDate,
        endDate,
        ballType,
        tournamentType,
        image: image?.url || "",
    };
    const tournament = await Tournament.create(tournamentData);
    if (!tournament) {
        throw new ApiError(400, "Tournament creation failed");
    }

    const createdTournament = await Tournament.findById(tournament._id);
    return res.status(201).json(
        new ApiResponse(200, createdTournament, "Tournament created successfully")
    );
});
const updateTournament = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        season,
        startDate,
        endDate,
        name: inputName,
        shortName,
        ballType,
        tournamentType,
    } = req.body;

    if (!inputName?.trim() || !shortName?.trim() || !ballType?.trim() || !tournamentType?.trim()) {
        throw new ApiError(400, "Name, shortName, ballType, and tournamentType are required");
    }

    const name = inputName.trim();

    const existingTournament = await Tournament.findOne({
        name,
        season,
        _id: { $ne: id }  // Exclude the current tournament by its _id
    });

    if (existingTournament) {
        throw new ApiError(409, "Tournament with this name and season already exists");
    }


    let imageLocalPath;
    if (req.files && Array.isArray(req.files.image) && req.files.image.length > 0) {
        imageLocalPath = req.files.image[0].path;
    }

    const image = imageLocalPath ? await uploadOnCloudinary(imageLocalPath) : null;

    const updatedTournament = await Tournament.findByIdAndUpdate(
        id,
        {
            name,
            shortName: shortName.trim(),
            season,
            startDate,
            endDate,
            ballType,
            tournamentType,
            ...(image && { image: image.url }), // Only update image if a new one is provided
        },
        { new: true, runValidators: true }
    );

    if (!updatedTournament) {
        throw new ApiError(400, "Tournament update failed");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedTournament, "Tournament updated successfully")
    );
});
const deleteTournament = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }

    await tournament.deleteOne();

    return res.status(200).json(
        new ApiResponse(200, null, "Tournament deleted successfully")
    );
});
const getUpcomingTournaments = asyncHandler(async (req, res) => {
    const currentDate = new Date().toISOString();
    const tournaments = await Tournament.find({ startDate: { $gt: currentDate } });

    if (!tournaments.length) {
        throw new ApiError(404, "No upcoming tournaments found");
    }

    res.status(200).json(
        new ApiResponse(200, tournaments, "Upcoming tournaments fetched successfully")
    );
});
const getOngoingTournaments = asyncHandler(async (req, res) => {
    const currentDate = new Date().toISOString();
    const tournaments = await Tournament.find({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate }
    });

    if (!tournaments.length) {
        throw new ApiError(404, "No ongoing tournaments found");
    }

    res.status(200).json(
        new ApiResponse(200, tournaments, "Ongoing tournaments fetched successfully")
    );
});
const getConcludedTournaments = asyncHandler(async (req, res) => {
    const currentDate = new Date().toISOString();
    const tournaments = await Tournament.find({ endDate: { $lt: currentDate } });

    if (!tournaments.length) {
        throw new ApiError(404, "No concluded tournaments found");
    }

    res.status(200).json(
        new ApiResponse(200, tournaments, "Concluded tournaments fetched successfully")
    );
});
//admin add teams to tournament
const addTeamsToTournaments = asyncHandler(async (req, res) => {
    const { tournamentId, teamIds } = req.body;

    // Validate required fields
    if (!tournamentId || !teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
        throw new ApiError(400, "Tournament ID and team IDs are required");
    }

    // Find the tournament by ID
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }

    // Add new teams to the tournament's teams array directly
    tournament.teams.push(...teamIds);

    // Create squads for each team being added
    const createdSquads = [];
    const notifications = [];
    for (const teamId of teamIds) {
        try {
            const squad = new Squad({
                name: `${tournament.name} - Squad for Team ${teamId}`, // Adjust the naming convention as needed
                team: teamId,
                tournament: tournamentId,
                status: 'approved',
                players: [] // Empty players array initially
            });

            // Save each squad to the database
            await squad.save();
            createdSquads.push(squad);

            // Add squad _id to the tournament's squads array
            tournament.squads.push(squad._id);

            // Fetch the team and its associated club and manager
            const team = await Team.findById(teamId).populate({
                path: 'associatedClub',
                populate: { path: 'manager' }
            });

            if (team && team.associatedClub && team.associatedClub.manager) {
                const manager = team.associatedClub.manager;
                const notificationMessage = `Your team '${team.teamName}' has been successfully added to the tournament '${tournament.name}'.Please contact the administrator for more details...`;


                // Create and save the notification
                const redirectUrl = `/series/${tournamentId}/squads`; // Adjust based on your front-end routes

                const notification = new Notification({
                    type: 'squad_added',
                    status: 'approved',
                    senderId: await getAdminUserId(), // Assuming getAdminUserId fetches the admin ID
                    receiverId: manager._id,
                    message: notificationMessage,
                    redirectUrl,
                    isRead: false,
                });

                await notification.save();
                notifications.push(notification);

                // Emit the notification in real-time via Socket.IO
                global.io.to(manager._id.toString()).emit('notification', {
                    _id: notification._id,
                    type: notification.type,
                    status: notification.status,
                    senderId: notification.senderId,
                    receiverId: notification.receiverId,
                    message: notification.message,
                    redirectUrl: notification.redirectUrl,
                    timestamp: notification.timestamp,
                    isRead: notification.isRead,
                });
            }
        } catch (error) {
            throw new ApiError(500, `Failed to create squad for team ${teamId}: ${error.message}`);
        }
    }

    // Save the updated tournament
    await tournament.save();

    // Return the success response with the updated tournament and created squads
    return res.status(201).json(
        new ApiResponse(
            201,
            { tournament, squads: createdSquads, notifications },
            "Teams added to tournament and squads created successfully, notifications sent."
        )
    );
});

//admin remove team from tournament
const removeTeamFromTournament = asyncHandler(async (req, res) => {
    const { tournamentId, squadId } = req.body;

    // Validate required fields
    if (!tournamentId || !squadId) {
        throw new ApiError(400, 'Tournament ID and Squad ID are required');
    }

    // Find the tournament by ID
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
        throw new ApiError(404, 'Tournament not found');
    }

    // Check if the squad exists in the tournament's squads array
    const squadIndex = tournament.squads.indexOf(squadId);
    if (squadIndex === -1) {
        throw new ApiError(404, 'Squad not found in this tournament');
    }

    // Remove the squad ID from the tournament's squads array
    tournament.squads.splice(squadIndex, 1);

    // Save the updated tournament
    await tournament.save();

    // Delete the squad document from the Squad collection
    // Populate the team within the squad to get the associated club
    const squad = await Squad.findById(squadId).populate({
        path: 'team',
        populate: {
            path: 'associatedClub',
            populate: {
                path: 'manager',
            },
        },
    });

    if (!squad || !squad.team || !squad.team.associatedClub || !squad.team.associatedClub.manager) {
        throw new ApiError(404, 'Associated club or manager not found');
    }

    // Extract the club and manager
    const club = squad.team.associatedClub;
    const manager = club.manager;


    // Extract necessary details for notification
    const teamName = squad.team.teamName;
    const tournamentName = tournament.name;

    // Find the associated club and manager
    // const club = await Club.findOne({ teams: squad.team._id }).populate('manager');
    // if (!club || !club.manager) {
    //     throw new ApiError(404, 'Associated club or manager not found');
    // }

    // Create the notification message
    const notificationMessage = `Your team '${teamName}' squad for the tournament '${tournamentName}' has been removed or rejected. Please contact the administrator for more details.`;

    // Create and save the notification
    const redirectUrl = `/series/${squad.tournament._id}/squads`; // Adjust based on your front-end routes

    const notification = new Notification({
        type: 'squad_removal',
        status: 'rejected',
        senderId: await getAdminUserId(), // Assuming getAdminUserId fetches the admin ID
        receiverId: manager._id,
        message: notificationMessage,
        redirectUrl: redirectUrl, // Dynamic URL to the tournament
        isRead: false,
    });

    await notification.save();

    // Emit the notification in real-time via Socket.IO
    global.io.to(manager._id.toString()).emit('notification', {
        _id: notification._id,
        type: 'squad_removal',
        status: 'rejected',
        senderId: notification.senderId,
        receiverId: notification.receiverId,
        message: notification.message,
        redirectUrl: notification.redirectUrl,
        timestamp: notification.timestamp,
        isRead: false,
    });

    // Delete the squad document
    await squad.deleteOne();

    // Send a success response
    res.status(200).json(new ApiResponse(200, { squadId: squad._id }, 'Team removed from tournament and squad deleted successfully'));
});

const getAvailableTeamsForTournament = asyncHandler(async (req, res) => {
    const { tournamentId } = req.params;

    // Validate the tournament ID
    if (!tournamentId) {
        throw new ApiError(400, "Tournament ID is required");
    }

    // Find the tournament by ID
    const tournament = await Tournament.findById(tournamentId).populate('squads');
    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }
    // console.log(tournament);


    // Extract the team IDs from the squads in the tournament
    const teamIdsInSquads = tournament.squads.map(squad => squad.team.toString());
    // console.log(teamIdsInSquads);

    // Fetch all teams
    const allTeams = await Team.find();

    // Filter out teams that are already in the squads of the tournament
    const teamsNotInTournament = allTeams.filter(team => !teamIdsInSquads.includes(team._id.toString()));

    // Return the teams that are not yet part of the tournament
    return res.status(200).json(new ApiResponse(200, teamsNotInTournament, "Teams not in the tournament retrieved successfully"));
});
const getSingleTournamentDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;  // Get the tournament ID from the request parameters
    // console.log("id", id);

    try {
        const tournament = await Tournament.findById(id)
            .populate('winner') // Populates the winner field (reference to a team or user)
            .populate('teams');

        if (!tournament) {
            throw new ApiError(404, "Tournament not found");
        }

        return res.status(200).json(
            new ApiResponse(200, tournament, "Tournament details fetched successfully")
        );
    } catch (error) {
        if (error.name === 'CastError') {
            // Handle invalid ObjectId error
            throw new ApiError(400, "Invalid tournament ID");
        }
        throw new ApiError(500, "An error occurred while fetching tournament details");
    }
});
const getSingleTournamentSquads = asyncHandler(async (req, res) => {
    const { tournamentId } = req.params; // Extract tournamentId from request parameters
    // Fetch squads associated with the given tournament ID
    const squads = await Squad.find({ tournament: tournamentId }).populate('team').populate('players');
    // Return the squads in the response
    return res.status(200).json(
        new ApiResponse(200, squads, "Squads retrieved successfully")
    );
});
const getAvailablePlayersForTournament = asyncHandler(async (req, res) => {
    const { tournamentId, teamId } = req.params;

    console.log(req.params);


    // Validate the tournament ID and team ID
    if (!tournamentId || !teamId) {
        throw new ApiError(400, "Tournament ID and Team ID are required");
    }

    // Find the squad for the given team in the given tournament
    const squad = await Squad.findOne({ team: teamId, tournament: tournamentId }).populate('players');

    // If no squad is found for this team in the tournament, return an error
    if (!squad) {
        throw new ApiError(404, "Squad for this team in the tournament not found");
    }

    // Extract the player IDs already in the squad
    const playersInSquad = squad.players.map(player => player._id.toString());

    // Find the team by ID and retrieve the players
    const team = await Team.findById(teamId).populate('players'); // Assuming 'players' is an array in Team model
    if (!team) {
        throw new ApiError(404, "Team not found");
    }

    // Filter the team's players to exclude those already in the squad
    const availablePlayers = team.players.filter(player => !playersInSquad.includes(player._id.toString()));

    // Return the available players for the team in the tournament
    return res.status(200).json(new ApiResponse(200, availablePlayers, "Available players for the team in the tournament retrieved successfully"));
});
//admin remove player from squad
const removePlayerFromSquad = asyncHandler(async (req, res) => {
    const { squadId, playerId } = req.body.playerId;
    console.log("req.body", req.body.playerId);


    // Validate required fields
    if (!squadId || !playerId) {
        throw new ApiError(400, "Squad ID and Player ID are required");
    }

    // Find the squad by squadId
    const squad = await Squad.findById(squadId).populate('team tournament');
    if (!squad) {
        throw new ApiError(404, "Squad not found");
    }

    // Check if the player is part of the squad's players array
    const playerIndex = squad.players.findIndex(player => player.toString() === playerId);

    if (playerIndex === -1) {
        throw new ApiError(404, "Player not found in the squad");
    }

    // Fetch the player details for notification
    const player = await Player.findById(playerId, 'playerName');
    if (!player) {
        throw new ApiError(404, "Player not found");
    }

    // Remove the player from the squad's players array
    squad.players.splice(playerIndex, 1);

    // Save the updated squad
    await squad.save();

    // Find the associated club and manager
    const team = await Team.findById(squad.team._id).populate('associatedClub');

    if (!team || !team.associatedClub) {
        throw new ApiError(404, "Associated club not found");
    }

    const club = await Club.findById(team.associatedClub._id).populate('manager');

    if (!club || !club.manager) {
        throw new ApiError(404, "Associated club or manager not found");
    }


    // Create the notification
    const notificationMessage = `The player '${player.playerName}' has been removed from your squad of '${squad.team.teamName} team' in the tournament '${squad.tournament.name}'.`;
    const adminUserId = await getAdminUserId();
    const redirectUrl = `/series/${squad.tournament._id}/squads`; // Adjust based on your front-end routes

    const notification = new Notification({
        type: "squad_update",
        status: "completed",
        senderId: adminUserId, // Admin's ID from authenticated request
        receiverId: club.manager._id, // Club Manager's ID
        message: notificationMessage,
        redirectUrl: redirectUrl, // Dynamic squad URL
        isRead: false,
    });

    await notification.save();

    // Emit the notification in real-time via Socket.IO
    global.io.to(club.manager._id.toString()).emit('notification', {
        _id: notification._id,
        type: "squad_update",
        status: "completed",
        senderId: adminUserId,
        receiverId: club.manager._id,
        message: notificationMessage,
        redirectUrl: `/squads/${squadId}`,
        timestamp: notification.timestamp,
        isRead: false,
    });

    // Return a success response with the updated squad
    return res.status(200).json(
        new ApiResponse(200, squad, "Player removed from the squad successfully")
    );
});
const getTeamsInTournament = asyncHandler(async (req, res) => {
    const { tournamentId } = req.params;

    // Validate the tournament ID
    if (!tournamentId) {
        throw new ApiError(400, "Tournament ID is required");
    }

    // Find the tournament by ID and populate the squads and venues
    const tournament = await Tournament.findById(tournamentId)
        .populate('squads')
        .populate('venues');
    // .populate('officials'); // Populate the officials if needed
    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }

    // Filter squads by the status of "approved"
    const approvedSquads = tournament.squads.filter(squad => squad.status === 'approved');

    // Extract the teams from the approved squads
    const teamsInTournament = await Team.find({
        _id: { $in: approvedSquads.map(squad => squad.team) }
    });

    // Return the teams that are part of the tournament with approved status
    return res.status(200).json(new ApiResponse(200, { teams: teamsInTournament, venues: tournament.venues }, "Teams with approved squads in the tournament retrieved successfully"));
});
const getSquadPlayers = asyncHandler(async (req, res) => {
    const { tournamentId, teamId } = req.params;
    console.log("tournamentId, teamId", tournamentId, teamId);


    try {
        // Fetch squads that match the tournamentId and teamId
        const squads = await Squad.find({ tournament: tournamentId, team: teamId })
            .populate('players', 'name role profilePicture playerName') // Populating player details if necessary
            .populate('team', 'name logo') // Optionally populate team details
            .populate('tournament', 'name'); // Optionally populate tournament details

        if (!squads || squads.length === 0) {
            return res.status(404).json(new ApiResponse(404, null, 'No squads found for this tournament and team.'));
        }

        // Send the squads back as a response
        res.status(200).json(new ApiResponse(200, squads, 'Squads fetched successfully.'));
    } catch (error) {
        // Handle any errors that occur during the query
        throw new ApiError(500, error.message || 'Internal Server Error');
    }
});
//club manager add team with player to tournament as squad
const RegisterTeamsToTournament = asyncHandler(async (req, res) => {
    const { tournamentId, teams } = req.body;

    // Validate required fields
    if (!tournamentId || !teams || !Array.isArray(teams) || teams.length === 0) {
        throw new ApiError(400, "Tournament ID and teams (with players) are required");
    }

    // Find the tournament by ID
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
        throw new ApiError(404, "Tournament not found");
    }

    const createdSquads = [];
    const teamNames = [];
    let clubName = "";
    let clubManagerId = "";

    for (const team of teams) {
        const { teamId, players } = team;

        // Check if the squad already exists for this tournament and team
        const existingSquad = await Squad.findOne({ tournament: tournamentId, team: teamId });

        if (existingSquad) {
            console.log(`Squad for team ${teamId} already exists for this tournament.`);
            continue;
        }

        // Fetch team details to extract team name and club information
        const teamDetails = await Team.findById(teamId).populate('associatedClub');
        if (!teamDetails) {
            throw new ApiError(404, `Team with ID ${teamId} not found`);
        }

        // Extract team name and club details
        teamNames.push(teamDetails.teamName);
        if (!clubName) {
            clubName = teamDetails.associatedClub?.clubName || "Unknown Club";
            clubManagerId = teamDetails.associatedClub?.manager?._id; // Fetch club manager ID
        }

        // Check for duplicate players (removing any duplicates)
        const uniquePlayers = [...new Set(players)];

        // Create a new squad with pending status
        try {
            const squad = new Squad({
                name: `${tournament.name} - Squad for Team ${teamId}`,
                team: teamId,
                tournament: tournamentId,
                players: uniquePlayers,
                status: 'pending', // Set the squad status to pending
            });

            // Save the squad to the database
            await squad.save();
            createdSquads.push(squad);

            // Add squad ID to the tournament's squads array
            tournament.squads.push(squad._id);
        } catch (error) {
            throw new ApiError(500, `Failed to create squad for team ${teamId}: ${error.message}`);
        }
    }

    // Save the updated tournament with the newly added squads
    await tournament.save();

    // Add notification logic
    if (clubManagerId) {
        // Fetch the admin user ID dynamically
        const adminUserId = await getAdminUserId();
        const notificationMessage = `${clubName} has sent their teams (${teamNames.join(
            ', '
        )}) squads to be registered in the ${tournament.name} tournament. Please review the squads.`;
        const redirectUrl = `/admin/competitions/${tournamentId}/squads`;

        // Create a notification for the admin
        const notification = new Notification({
            type: "squad_registration",
            status: "pending",
            senderId: clubManagerId, // Club manager's ID
            receiverId: adminUserId,
            message: notificationMessage,
            redirectUrl: redirectUrl, // Dynamic URL for squads
            isRead: false,
        });

        await notification.save();

        // Emit the notification in real-time via Socket.IO to the admin’s room
        global.io.to(adminUserId.toString()).emit('notification', {
            _id: notification._id,
            type: "squad_registration",
            status: "pending",
            senderId: clubManagerId,
            receiverId: adminUserId,
            message: notificationMessage,
            redirectUrl: redirectUrl,
            timestamp: notification.timestamp,
            isRead: false,
        });
    }

    // Return the success response with the created squads
    return res.status(201).json(
        new ApiResponse(
            201,
            { tournament, squads: createdSquads },
            "Teams added to tournament and squads created successfully"
        )
    );
});

export {
    createTournament,
    updateTournament,
    deleteTournament,
    getAllTournaments,
    getUpcomingTournaments,
    getOngoingTournaments,
    getConcludedTournaments,
    addTeamsToTournaments,
    getSingleTournamentDetail,
    getAvailableTeamsForTournament,
    removeTeamFromTournament,
    getSingleTournamentSquads,
    getAvailablePlayersForTournament,
    removePlayerFromSquad,
    getTeamsInTournament,
    getSquadPlayers,
    RegisterTeamsToTournament
}