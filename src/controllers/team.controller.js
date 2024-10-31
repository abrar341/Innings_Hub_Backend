import { asyncHandler } from "../utils/asyncHandler.js";
import { Team } from "../models/team.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import Match from "../models/match.model.js";
import { Player } from "../models/player.model.js";


const createTeam = asyncHandler(async (req, res) => {
    try {
        const {
            teamName,
            shortName,
            teamtype,
            associatedClub,
        } = req.body;
        const existingTeam = await Team.findOne({ $or: [{ teamName }, { shortName }] });
        if (existingTeam) {
            throw new ApiError(409, "Team with the same name or short name already exists");
        }
        // let teamLogoLocalPath;
        // if (req.files && Array.isArray(req.files.teamLogo) && req.files.teamLogo.length > 0) {
        //     teamLogoLocalPath = req.files.teamLogo[0].path;
        // }
        // const teamLogo = await uploadOnCloudinary(teamLogoLocalPath);
        // // console.log("teamLogo", teamLogo);

        let teamLogoLocalPath;
        if (req.files && Array.isArray(req.files.teamLogo) && req.files.teamLogo.length > 0) {
            teamLogoLocalPath = req.files.teamLogo[0].path;
        }
        const teamLogo = await uploadOnCloudinary(teamLogoLocalPath);

        const sanitizedData = {
            teamLogo: teamLogo?.url.trim() || "",
            teamName: teamName?.trim(),
            shortName: shortName?.trim(),
            associatedClub: associatedClub,
            teamtype: teamtype?.trim(),
        };

        const team = new Team(sanitizedData);
        await team.save();

        const createdTeam = await Team.findById(team._id)
            .select('teamLogo name shortName location teamtype');

        return res.status(201).json(
            new ApiResponse(201, createdTeam, "Team created successfully")
        );
    } catch (error) {
        throw new ApiError(500, error);
    }
});
const updateTeam = asyncHandler(async (req, res) => {
    try {

        const { id } = req.params;
        const { teamName, shortName, location, teamtype } = req.body;

        if (!teamName?.trim() || !shortName?.trim() || !teamtype?.trim()) {
            throw new ApiError(400, "Name, shortName, and teamtype are required");
        }
        const team = await Team.findById(id);
        if (!team) {
            throw new ApiError(404, "Team not found");
        }

        // Check if the new name or short name already exists in another team
        const existingTeam = await Team.findOne({
            $or: [{ teamName }, { shortName }],
            _id: { $ne: id }
        });

        if (existingTeam) {
            throw new ApiError(409, "Another team with the same name or short name already exists");
        }

        let teamLogoLocalPath;
        if (req.files && Array.isArray(req.files.teamLogo) && req.files.teamLogo.length > 0) {
            teamLogoLocalPath = req.files.teamLogo[0].path;
        }
        const teamLogo = await uploadOnCloudinary(teamLogoLocalPath);

        team.teamLogo = teamLogo?.url.trim() || team.teamLogo;
        team.teamName = teamName.trim();
        team.shortName = shortName.trim();
        team.location = location?.trim() || team.location;
        team.teamtype = teamtype.trim();

        // Save the updated team
        await team.save();

        return res.status(200).json(
            new ApiResponse(200, team, "Team updated successfully")
        );
    } catch (error) {
        throw new ApiError(500, "An error occurred while updating the team");
    }
});
const getAllTeams = asyncHandler(async (req, res) => {
    // console.log("hello");

    try {
        const teams = await Team.find()
            .select("-__v") // Exclude the `__v` field
            .populate('associatedClub', 'clubName'); // Populate `associatedClub` with `clubName`

        if (!teams || teams.length === 0) {
            throw new ApiError(404, "No teams found");
        }

        return res.status(200).json(
            new ApiResponse(200, teams, "Teams fetched successfully")
        );
    } catch (error) {
        // console.error("Error fetching teams:", error);
        throw new ApiError(500, "An error occurred while fetching teams");
    }
});
const deleteTeam = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the team exists
        const team = await Team.findById(id);
        if (!team) {
            throw new ApiError(404, "Team not found");
        }

        // Delete the team
        await team.deleteOne();

        return res.status(200).json(
            new ApiResponse(200, null, "Team deleted successfully")
        );
    } catch (error) {
        throw new ApiError(500, "An error occurred while deleting the team");
    }
});
const getSingleTeamDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;  // Get the team ID from the request parameters

    try {
        // Fetch the team from the database and populate the 'players' array
        const team = await Team.findById(id)
            .populate({
                path: 'players',
                populate: {
                    path: 'currentTeam',
                    select: 'teamName teamLogo', // Only populate teamName and teamLogo
                }
            });


        if (!team) {
            throw new ApiError(404, "Team not found");
        }

        return res.status(200).json(
            new ApiResponse(200, team, "Team details fetched successfully")
        );
    } catch (error) {
        if (error.name === 'CastError') {
            // Handle invalid ObjectId error
            throw new ApiError(400, "Invalid team ID");
        }
        throw new ApiError(500, "An error occurred while fetching team details");
    }
});
const addPlayerToTeam = asyncHandler(async (req, res) => {
    const { teamId, playerIds } = req.body;
    // Validate required fields
    if (!teamId || !playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
        throw new ApiError(400, "Team ID and Player IDs are required");
    }
    // Find the team by teamId
    const team = await Team.findById(teamId);
    if (!team) {
        throw new ApiError(404, "Team not found");
    }
    // Add players to the team, ensuring no duplicates
    const existingPlayers = team.players.map(player => player.toString());
    const newPlayers = playerIds.filter(playerId => !existingPlayers.includes(playerId));

    if (newPlayers.length === 0) {
        throw new ApiError(400, "All provided players are already in the team");
    }
    // Add the new players to the players array
    team.players.push(...newPlayers);
    await team.save();
    const playerUpdates = newPlayers.map(async (playerId) => {
        const player = await Player.findById(playerId);
        if (player) {
            // Add the team to the player's teams array if it's not already present
            if (!player.teams.includes(teamId)) {
                player.teams.push(teamId);
            }
            // Update the player's current team
            player.currentTeam = teamId;
            // Save the updated player document
            await player.save();
        }
    });

    // Wait for all player updates to complete
    await Promise.all(playerUpdates);

    // Return a success response with the updated team
    return res.status(200).json(
        new ApiResponse(200, team, "Players added to the team successfully")
    );
});


const removePlayerFromTeam = asyncHandler(async (req, res) => {
    const { teamId, playerId } = req.body;
    console.log(teamId, playerId);

    // Validate required fields
    if (!teamId || !playerId) {
        throw new ApiError(400, "Team ID and Player ID are required");
    }

    // Find the team by teamId
    const team = await Team.findById(teamId);
    if (!team) {
        console.log("team");
        throw new ApiError(404, "Team not found");
    }

    // Check if the player exists in the team
    const playerIndex = team.players.findIndex(player => player.toString() === playerId);
    if (playerIndex === -1) {
        throw new ApiError(400, "Player not found in the team");
    }

    // Remove the player from the players array
    team.players.splice(playerIndex, 1);

    // Save the updated team
    await team.save();

    // Find the player by playerId and update their currentTeam to null
    const player = await Player.findById(playerId);
    if (player) {
        player.currentTeam = null;
        await player.save();
    }

    // Return a success response with the updated team
    return res.status(200).json(
        new ApiResponse(200, team, "Player removed from the team successfully")
    );
});

const updateTeamStats = async (req, res) => {
    try {
        const { matchId } = req.body;
        console.log(req.body);

        // Fetch the match details from the database
        const match = await Match.findById(matchId).populate('teams result.winner');

        if (!match) {
            return res.status(404).json({ message: "Match not found" });
        }

        const { teams, result } = match;
        const [team1, team2] = teams;

        // Update matches count for both teams
        await Team.updateMany(
            { _id: { $in: [team1, team2] } },
            { $inc: { 'stats.matches': 1 } }
        );

        // Check for the match result
        if (result.isTie) {
            // If the match is a tie, update draws for both teams
            await Team.updateMany(
                { _id: { $in: [team1, team2] } },
                { $inc: { 'stats.draws': 1 } }
            );
        } else {
            // If there is a winner, update wins and losses accordingly
            const winnerId = match.result.winner;
            const loserId = winnerId.toString() === team1.toString() ? team2 : team1;

            // Increment wins for the winning team
            await Team.updateOne(
                { _id: winnerId },
                { $inc: { 'stats.wins': 1 } }
            );

            // Increment losses for the losing team
            await Team.updateOne(
                { _id: loserId },
                { $inc: { 'stats.loss': 1 } }
            );
        }
        await Match.findByIdAndUpdate(matchId, { $set: { teamStats: true } });
        // Respond with success message
        res.status(200).json({ message: "Team stats updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};



export {
    removePlayerFromTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    getAllTeams,
    getSingleTeamDetail,
    addPlayerToTeam,
    updateTeamStats
}