import { asyncHandler } from "../utils/asyncHandler.js";
import { Tournament } from "../models/tournament.model.js";
import { Squad } from "../models/squad.model.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const getAllTournaments = asyncHandler(async (req, res) => {
    try {
        const tournaments = await Tournament.find();
        if (!tournaments || tournaments.length === 0) {
            throw new ApiError(404, "No tournaments found");
        }
        return res.status(200).json(
            new ApiResponse(200, tournaments, "Tournaments fetched successfully")
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
    console.log(req.body);


    if (!inputName?.trim() || !shortName?.trim() || !ballType?.trim() || !tournamentType?.trim()) {
        throw new ApiError(400, "Name, shortName, ballType, and tournamentType are required");
    }

    const name = inputName.trim();
    const existingTournament = await Tournament.findOne({ name, season });
    if (existingTournament) {
        throw new ApiError(409, "Tournament with this name and season already exists");
    }


    let imageLocalPath;
    console.log(imageLocalPath);

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
    console.log(tournamentData)
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

    console.log(req.body);
    console.log(req.files);

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
    console.log(id);

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



// const uploadTeam = asyncHandler(async (req, res) => {
//     const { tournamentId, teamId } = req.body
//     const tournament = await Tournament.findById(tournamentId);
//     const team = await Team.findById(teamId)
//     if (!team) {
//         throw new ApiError(400, "Team not Found ")
//     }

//     if (!tournament) {
//         throw new ApiError(400, "Tournament not Found ")
//     }

//     if (tournament.teams.includes(teamId)) {
//         throw new ApiError(400, "Team Already Added")
//     }

//     const TeamAdd = await Tournament.updateOne(
//         { _id: tournamentId },
//         { $push: { teams: teamId } }
//     );

//     const squad = await Squad.create({
//         team: teamId,
//         tournament: tournamentId
//     })

//     console.log(squad);

//     return res.status(201).json(
//         new ApiResponse(200, TeamAdd, "Team Added Successfully")
//     )


// })

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

    // Filter out teams that are already part of the tournament
    const existingTeams = tournament.teams.map(team => team.toString());
    const newTeams = teamIds.filter(teamId => !existingTeams.includes(teamId));

    // Check if all teams are already part of the tournament
    if (newTeams.length === 0) {
        throw new ApiError(400, "All provided teams are already in the tournament");
    }

    // Add new teams to the tournament's teams array
    tournament.teams.push(...newTeams);

    // Save the updated tournament
    await tournament.save();
    console.log("Tournament updated with new teams:", newTeams);

    // Create squads for each new team added to the tournament
    const createdSquads = [];
    for (const teamId of newTeams) {
        try {
            const squad = new Squad({
                name: `${tournament.name} - Squad for Team ${teamId}`, // Adjust the naming convention as needed
                team: teamId,
                tournament: tournamentId,
                players: [] // Empty players array initially
            });

            // Save each squad to the database
            await squad.save();
            console.log("Created squad for team:", teamId);
            createdSquads.push(squad);
        } catch (error) {
            console.error(`Failed to create squad for team ${teamId}:`, error);
            throw new ApiError(500, `Failed to create squad for team ${teamId}`);
        }
    }

    // Return the success response with the updated tournament and created squads
    return res.status(201).json(
        new ApiResponse(201, { tournament, squads: createdSquads }, "Teams added to tournament and squads created successfully")
    );
});


const getSingleTournamentDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;  // Get the tournament ID from the request parameters
    console.log("id", id);

    try {
        const tournament = await Tournament.findById(id);  // Fetch the tournament from the database

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



// const removeTeamFromTournament = asyncHandler(async (req, res) => {
//     const { tournamentId, teamId } = req.body;

//     const tournament = await Tournament.findById(tournamentId);
//     const team = await Team.findById(teamId);

//     if (!team) {
//         throw new ApiError(400, "Team not found");
//     }

//     if (!tournament) {
//         throw new ApiError(400, "Tournament not found");
//     }

//     if (!tournament.teams.includes(teamId)) {
//         throw new ApiError(400, "Team is not associated with the tournament");
//     }

//     const updatedTournament = await Tournament.findByIdAndUpdate(
//         tournamentId,
//         { $pull: { teams: teamId } },
//         { new: true }
//     );

//     await Squad.deleteMany({ tournament: tournamentId, team: teamId });

//     return res.status(200).json(
//         new ApiResponse(200, updatedTournament, "Team removed from tournament successfully")
//     );
// });
export {
    createTournament,
    updateTournament,
    deleteTournament,
    getAllTournaments,
    getUpcomingTournaments,
    getOngoingTournaments,
    getConcludedTournaments,
    addTeamsToTournaments,
    getSingleTournamentDetail
    // uploadTeam,
    // uploadTeams,
    // removeTeamFromTournament
}