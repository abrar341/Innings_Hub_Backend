
import asyncHandler from 'express-async-handler';
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Squad } from "../models/squad.model.js";
import { Club } from '../models/club.model.js';
import { Notification } from '../models/notification.model.js';
import { getAdminUserId } from '../utils/getAdminUserId.js';
import { Player } from '../models/player.model.js';


const addPlayerToSquad = asyncHandler(async (req, res) => {
    const { squadId, playerIds } = req.body;
    console.log("hello world");

    // Validate required fields
    if (!squadId || !playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
        throw new ApiError(400, "Squad ID and Player IDs are required");
    }

    // Find the squad by squadId and populate team and tournament for better messaging
    const squad = await Squad.findById(squadId).populate('team').populate('tournament');
    if (!squad) {
        throw new ApiError(404, "Squad not found");
    }

    // Check if players are already in any squad for the same tournament
    const squadsInTournament = await Squad.find({ tournament: squad.tournament._id });
    const playersInTournament = new Set();

    squadsInTournament.forEach((squad) => {
        squad.players.forEach((player) => {
            playersInTournament.add(player.toString());
        });
    });

    const alreadyInOtherSquads = playerIds.filter((playerId) => playersInTournament.has(playerId));

    if (alreadyInOtherSquads.length > 0) {
        const playerDetails = await Player.find({ _id: { $in: alreadyInOtherSquads } }, 'playerName');
        const playerNames = playerDetails.map(player => player.playerName).join(', ');

        throw new ApiError(400, `The following players are already part of another squad for the tournament '${squad.tournament.name}': ${playerNames}.`);
    }

    // Fetch the admin user ID dynamically
    const adminUserId = await getAdminUserId();

    // Find the associated club and manager
    const club = await Club.findById(squad.team.associatedClub).populate('manager');
    if (!club || !club.manager) {
        throw new ApiError(404, "Associated club or manager not found");
    }
    const manager = club.manager;

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

    // Notification message
    const playerCount = newPlayers.length;
    const players = await Player.find({ _id: { $in: newPlayers } }, 'playerName');
    console.log("players", players);

    const playerNames = players.map(player => player.playerName).join(', ');

    const playersMessage = playerCount > 1
        ? `The following players have been added to squad of the '${squad.team.teamName}' team in the tournament '${squad.tournament.name}': ${playerNames}.`
        : `The player '${playerNames}' has been added to your squad of the '${squad.team.teamName}' team in the tournament '${squad.tournament.name}'.`;

    const notificationMessage = `${playersMessage} Check your squad for details.`;

    const redirectUrl = `/series/${squad.tournament._id}/squads`;

    const notification = new Notification({
        type: "player_added_to_squad",
        status: "info",
        senderId: adminUserId,
        receiverId: manager._id,
        message: notificationMessage,
        redirectUrl,
        isRead: false,
    });

    await notification.save();

    global.io.to(manager._id.toString()).emit('notification', {
        _id: notification._id,
        type: "player_added_to_squad",
        status: "info",
        senderId: adminUserId,
        receiverId: manager._id,
        message: notificationMessage,
        redirectUrl,
        timestamp: notification.timestamp,
        isRead: false,
    });

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
//admin approved or remove squad
const approveSquadById = asyncHandler(async (req, res) => {
    const { squadId } = req.params;

    // Validate that the squad ID is provided
    if (!squadId) {
        throw new ApiError(400, "Squad ID is required");
    }

    // Find the squad by ID and populate the necessary fields
    const squad = await Squad.findById(squadId)
        .populate('team') // Populate the associated team
        .populate('tournament'); // Populate the associated tournament

    if (!squad) {
        throw new ApiError(404, "Squad not found");
    }

    // Check if the squad is in pending status
    if (squad.status !== 'pending') {
        throw new ApiError(400, "Squad is not in pending status");
    }

    // Find the associated club through the team
    const team = squad.team;
    if (!team || !team.associatedClub) {
        console.log("Associated club not found");
        throw new ApiError(404, "Associated club not found");
    }

    const club = await Club.findById(team.associatedClub).populate('manager');
    if (!club || !club.manager) {
        console.log("Club or manager not found");
        throw new ApiError(404, "Associated club or manager not found");
    }
    console.log("Cludetail", club);


    const manager = club.manager;
    console.log("managerdetail", manager);

    // Update the squad status to approved
    squad.status = 'approved';
    await squad.save(); // Save the updated squad
    console.log("${team.teamName}", team.teamName);
    console.log("squad.tournament.name", squad.tournament.name);

    // Create a detailed notification message
    const notificationMessage = `Your squad for the team '${team.teamName}' in the tournament '${squad.tournament.name}' has been approved. Congratulations!`;
    const redirectUrl = `/series/${squad.tournament._id}/squads`; // Adjust based on your front-end routes
    const adminUserId = await getAdminUserId();

    // Create a notification for the club manager
    const notification = new Notification({
        type: "squad_approval",
        status: "approved",
        senderId: adminUserId, // Admin's ID
        receiverId: manager._id, // Club manager's ID
        message: notificationMessage,
        redirectUrl: redirectUrl,
        isRead: false,
    });

    await notification.save();

    // Emit the notification in real-time via Socket.IO to the manager's room
    global.io.to(manager._id.toString()).emit('notification', {
        _id: notification._id,
        type: "squad_approval",
        status: "approved",
        senderId: adminUserId, // Admin's ID
        receiverId: manager._id, // Club manager's ID
        message: notificationMessage,
        redirectUrl: redirectUrl,
        timestamp: notification.timestamp,
        isRead: false,
    });

    // Return the updated squad
    return res.status(200).json(
        new ApiResponse(200, squad, "Squad approved successfully")
    );
});


export { addPlayerToSquad, approveSquadById };