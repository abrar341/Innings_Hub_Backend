

import { asyncHandler } from "../utils/asyncHandler.js";
import { Club } from "../models/club.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Player } from "../models/player.model.js";
import { Team } from "../models/team.model.js";
import { Notification } from "../models/notification.model.js";

const createClub = asyncHandler(async (req, res) => {
    try {
        const {
            clubName,
            location,
            yearEstablished,
            managerEmail,
            managerPhone,
            managerAddress,
            socialLink,
            review // New field to check if it's a resubmission
        } = req.body;

        console.log("req.body.review", review);

        // Find user by managerEmail
        const managerUser = await User.findOne({ email: managerEmail }).select("-password -refreshToken");
        if (!managerUser) {
            throw new ApiError(404, "Manager not found with the provided email");
        }

        let clubLogoLocalPath;
        if (req.files && Array.isArray(req.files.clubLogo) && req.files.clubLogo.length > 0) {
            clubLogoLocalPath = req.files.clubLogo[0].path;
        }

        // Upload logo if present
        const clubLogo = clubLogoLocalPath ? await uploadOnCloudinary(clubLogoLocalPath) : null;

        // Prepare sanitized data for the club
        const sanitizedData = {
            clubLogo: clubLogo?.url.trim() || "",
            clubName: clubName?.trim(),
            location: location?.trim(),
            yearEstablished: yearEstablished?.trim(),
            socialLink: socialLink?.trim(),
            registrationStatus: 'pending',
            manager: managerUser._id
        };

        let club;

        if (review === 'true') {
            // If review is true, find the existing club and update it
            club = await Club.findOneAndUpdate(
                { manager: managerUser._id },
                { $set: sanitizedData },
                { new: true }
            );
            if (!club) {
                throw new ApiError(404, "Club not found for review resubmission");
            }
        } else {
            // Create new club if not a resubmission
            club = new Club(sanitizedData);
            await club.save();

            // Update manager's club reference after saving the club
            managerUser.club = club._id;
        }

        // Update manager's contact details
        managerUser.address = managerAddress;
        managerUser.phone = managerPhone;
        await managerUser.save();

        // Create a notification for the admin
        const adminUserId = "66e5e61a78e6dd01a8560b47"; // Replace with the actual admin ID
        const notificationMessage =
            review === 'true'
                ? `${club.clubName} has resubmitted their club details for approval by ${managerUser.name}.`
                : `${club.clubName} has registered a new club for approval by ${managerUser.name}.`;

        const notification = new Notification({
            type: "club_registration",
            status: "pending",
            senderId: managerUser._id,
            receiverId: adminUserId,
            message: notificationMessage,
            redirectUrl: "/admin/clubs", // URL for admin to navigate
            isRead: false
        });

        await notification.save();

        // Emit the notification in real-time via Socket.IO to the admin’s room
        global.io.to(adminUserId).emit('notification', {
            type: "club_registration",
            status: "pending",
            senderId: managerUser._id,
            receiverId: adminUserId,
            message: notificationMessage,
            redirectUrl: "/admin/clubs",
            timestamp: notification.timestamp,
            isRead: false
        });

        // Populate the club details in the user object, including the manager details within the club
        const user = await User.findById(managerUser._id)
            .populate({
                path: 'club',
                populate: {
                    path: 'manager',
                    select: '-password -refreshToken'
                }
            })
            .select('-password -refreshToken');

        // Fetch the created or updated club with selected fields
        const savedClub = await Club.findById(club._id);
        const message = review === 'true'
            ? "Club details updated for resubmission..."
            : "Club Registered for Approval successfully...";

        return res.status(201).json(
            new ApiResponse(201, { user, savedClub }, message)
        );
        console.log("savedClub", savedClub);

    } catch (error) {
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
            .populate('manager');
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
const getClubDetails = asyncHandler(async (req, res) => {
    try {
        const { managerId } = req.params; // Manager ID from request params
        console.log("req.params", req.params);

        // Find the manager user by ID and populate their club
        const user = await User.findById(managerId)
            .populate({
                path: 'club',
                populate: {
                    path: 'manager',
                    select: '-password -refreshToken', // Exclude sensitive fields
                },
            })
            .select('-password -refreshToken'); // Exclude sensitive fields from the user object

        if (!user) {
            throw new ApiError(404, "Manager not found");
        }

        return res.status(200).json(
            new ApiResponse(200, user, "Manager and club details retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Server error");
    }
});
const approveClub = asyncHandler(async (req, res) => {
    try {
        const { clubId } = req.body;

        // Find the club by its ID
        const club = await Club.findById(clubId).populate('manager'); // Populate manager details
        console.log("club.manager._id", club.manager._id);

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

        // Create a notification for the club manager
        const adminUserId = "66e5e61a78e6dd01a8560b47";
        const notificationMessage = `${club.clubName} has been approved by the admin. Congratulations!`;
        const notification = new Notification({
            type: "club_approval",
            status: "approved",
            senderId: adminUserId, // Assuming req.user contains the admin's ID
            receiverId: club.manager._id, // Club manager ID
            message: notificationMessage,
            redirectUrl: `/club-manager/dashboard`, // Redirect to the club details page
            isRead: false,
        });

        await notification.save();
        console.log("club.manager._id", club.manager._id);

        // Emit the notification in real-time via Socket.IO to the manager's room
        global.io.to(club.manager._id.toString()).emit('notification', {
            type: "club_approval",
            status: "approved",
            senderId: adminUserId,
            receiverId: club.manager._id,
            message: notificationMessage,
            redirectUrl: `/club-manager/dashboard`,
            timestamp: notification.timestamp,
            isRead: false,
        });

        // Emit a second event for real-time updates (optional use case)
        global.io.to(club.manager._id.toString()).emit('update', {
            club
        });

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

        // Find the club by its ID
        const club = await Club.findById(clubId).populate('manager'); // Populate manager details
        if (!club) {
            throw new ApiError(404, "Club not found");
        }

        // Update the registration status to 'rejected' and store the rejection reason
        club.registrationStatus = 'rejected';
        club.rejectionReason = reason; // Assuming you have a field for rejection reason
        await club.save();

        // Create a notification for the club manager
        const adminUserId = "66e5e61a78e6dd01a8560b47";
        const notificationMessage = `${club.clubName} has been rejected by the admin. Reason: ${reason}`;
        const notification = new Notification({
            type: "club_rejection",
            status: "rejected",
            senderId: adminUserId, // Admin's ID
            receiverId: club.manager._id, // Club manager ID
            message: notificationMessage,
            redirectUrl: `/club-manager/dashboard`, // Redirect to the club manager's dashboard
            isRead: false,
        });

        await notification.save();

        // Emit the notification in real-time via Socket.IO to the manager's room
        global.io.to(club.manager._id.toString()).emit('notification', {
            type: "club_rejection",
            status: "rejected",
            senderId: adminUserId,
            receiverId: club.manager._id,
            message: notificationMessage,
            redirectUrl: `/club-manager/dashboard`,
            timestamp: notification.timestamp,
            isRead: false,
        });

        // Emit a second event for real-time updates (optional use case)
        global.io.to(club.manager._id.toString()).emit('update', {
            club
        });

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
    getClubDetails
}