

import { asyncHandler } from "../utils/asyncHandler.js";
import { Club } from "../models/club.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Player } from "../models/player.model.js";
import { Team } from "../models/team.model.js";


const createClub = asyncHandler(async (req, res) => {
    try {
        const {
            clubName,
            location,
            yearEstablished,
            managerEmail,
            managerPhone,
            managerAddress,
            socialLink
        } = req.body;

        // Find user by managerEmail
        const managerUser = await User.findOne({ email: managerEmail }).
            select("-password -refreshToken")
        if (!managerUser) {
            throw new ApiError(404, "Manager not found with the provided email");
        }

        let clubLogoLocalPath;
        if (req.files && Array.isArray(req.files.clubLogo) && req.files.clubLogo.length > 0) {
            clubLogoLocalPath = req.files.clubLogo[0].path;
        }

        // Upload logo if present
        const clubLogo = await uploadOnCloudinary(clubLogoLocalPath);

        // Prepare sanitized data for the club
        const sanitizedData = {
            clubLogo: clubLogo?.url.trim() || "",
            clubName: clubName?.trim(),
            location: location?.trim(),
            yearEstablished: yearEstablished?.trim(),
            socialLink: socialLink?.trim(),
            manager: managerUser._id // Set manager reference to the found user's ID
        };

        // console.log("sanitizedData", sanitizedData);
        const club = new Club(sanitizedData);
        await club.save();

        // After saving the club, update the manager's club reference
        managerUser.club = club._id;
        managerUser.address = managerAddress;
        const user = await managerUser.save();

        // Fetch the created club with selected fields
        const createdClub = await Club.findById(club._id)
            .select('clubLogo clubName location');

        return res.status(201).json(
            new ApiResponse(201, { user, createdClub }, "Club Registered for Approval successfully")
        );
    } catch (error) {
        // console.error("Error creating club:", error);
        throw new ApiError(500, error);
    }
});
const getPlayersByClub = asyncHandler(async (req, res) => {
    try {
        // console.log("fsdf", req.params.id);

        const clubId = req.params.id; // Assuming user ID is set on req.user by your auth middleware

        // Find the user by their ID
        // const user = await User.findById(userId).populate('club'); // Assuming 'club' is the field in the user model where the club ID is stored
        // // console.log("user", user);

        // // If user doesn't exist or isn't associated with a club
        // if (!user || !user.club) {
        //     return res.status(404).json(new ApiResponse(404, null, "User or club not found"));
        // }

        // console.log("clubId", clubId);

        // Find all players associated with this club
        const players = await Player.find({ associatedClub: clubId })
            .select('playerName city phone email profilePicture DOB status jersyNo role battingStyle bowlingStyle CNIC');
        // console.log(players);

        if (!players.length) {
            return res.status(404).json(new ApiResponse(404, null, "No players found for this club"));
        }
        console.log(players);

        return res.status(200).json(
            new ApiResponse(200, players, "Players retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Server error");
    }
});
const getTeamsByClub = asyncHandler(async (req, res) => {

    try {
        const clubId = req.params.id; // Get clubId from request parameters
        // console.log(clubId);

        // Fetch teams associated with the club
        const teams = await Team.find({ associatedClub: clubId })
            .populate('associatedClub', 'clubName')// Optionally populate associated club details
            .populate('players'); // Optionally populate associated club details

        if (!teams || teams.length === 0) {
            throw new ApiError(404, "No teams found for the specified club");
        }
        return res.status(200).json(new ApiResponse(200, teams, "Teams fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "Error fetching teams");
    }
});
const getClubs = asyncHandler(async (req, res) => {
    try {
        const registrationStatus = req.query.registrationStatus;
        console.log(registrationStatus);


        let query = {};
        if (registrationStatus && registrationStatus !== 'all') {
            query.registrationStatus = registrationStatus;
        }

        const clubs = await Club.find(query)
            .populate('manager', 'email name');
        // .select('clubName type registrationStatus regDate'); // Adjust fields as needed

        if (!clubs) {
            throw new ApiError(404, "No Clubs found");
        }

        return res.status(200).json(
            new ApiResponse(200, clubs, "Clubs retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Server error");
    }
});
const approveClub = asyncHandler(async (req, res) => {
    try {
        const { clubId } = req.body;
        // console.log("clubId", clubId);


        // Find the club by its ID
        const club = await Club.findById(clubId);
        if (!club) {
            throw new ApiError(404, "Club not found");
        }

        // Update the registration status to 'approved'
        club.registrationStatus = 'approved';
        await Club.updateOne(
            { _id: clubId },
            { $unset: { rejectionReason: "" } } // Unset removes the field
        );
        await club.save();

        return res.status(200).json(
            new ApiResponse(200, club, "Club approved successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Server error");
    }
});
const rejectClub = asyncHandler(async (req, res) => {
    try {
        const { clubId, reason } = req.body;
        // console.log("clubId", clubId);
        // console.log("reason", reason);

        // Find the club by its ID
        const club = await Club.findById(clubId);
        if (!club) {
            throw new ApiError(404, "Club not found");
        }

        // Update the registration status to 'rejected' and store the rejection reason
        club.registrationStatus = 'rejected';
        club.rejectionReason = reason; // Assuming you have a field for rejection reason
        await club.save();

        return res.status(200).json(
            new ApiResponse(200, club, "Club rejected successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Server error");
    }
});

export {
    createClub,
    getPlayersByClub,
    getTeamsByClub,
    getClubs,
    approveClub,
    rejectClub,

}