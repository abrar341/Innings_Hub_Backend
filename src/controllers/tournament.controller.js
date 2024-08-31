import { asyncHandler } from "../utils/asyncHandler.js";
import { Tournament } from "../models/tournament.model.js";
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
    const existingTournament = await Tournament.findOne({ name });
    if (existingTournament) {
        throw new ApiError(409, "Season already exists");
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

    const existingTournament = await Tournament.findOne({ name, _id: { $ne: id } });
    if (existingTournament) {
        throw new ApiError(409, "Season already exists");
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

// const uploadTeams = asyncHandler(async (req, res) => {
//     const { tournamentId, teamIds } = req.body;

//     console.log(tournamentId, teamIds);
//     const tournament = await Tournament.findById(tournamentId);

//     if (!tournament) {
//         throw new ApiError(404, "Tournament Not Found")
//     }

//     // Check if teams are already part of the tournament
//     const existingTeams = tournament.teams.filter(team => teamIds.includes(team.toString()));

//     if (existingTeams.length > 0) {
//         // return res.status(400).json({
//         //     success: false,
//         //     message: "Some teams are already part of the tournament.",
//         //     existingTeams: existingTeams,
//         // });
//         // return res.status(400).json(
//         //     new ApiError(400, "Some teams are already part of the tournament")
//         // );
//         throw new ApiError(400, "Some teams are already part of the tournament")
//     }
//     const updateResult = await Tournament.updateOne(
//         { _id: tournamentId },
//         { $addToSet: { teams: { $each: teamIds } } }
//     );

//     const squads = await Promise.all(teamIds.map(teamId =>
//         Squad.create({ team: teamId, tournament: tournamentId })
//     ))
//     if (!updateResult || !squads) {
//         throw new ApiError(400, "Error in adding team to tournament")
//     }
//     return res.status(201).json(
//         new ApiResponse(200, updateResult, "Teams Added Successfully")
//     )
// })

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
    getConcludedTournaments
    // uploadTeam,
    // uploadTeams,
    // removeTeamFromTournament
}