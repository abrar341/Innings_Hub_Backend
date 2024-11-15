import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notification } from "../models/notification.model.js";

const markNotificationAsRead = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params; // Notification ID
        console.log("Notification ID:", id);

        // Find the notification by ID
        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json(new ApiResponse(404, null, "Notification not found"));
        }

        // Mark the notification as read
        notification.isRead = true;
        await notification.save();

        return res.status(200).json(
            new ApiResponse(200, { notification }, "Notification marked as read successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "An error occurred while marking the notification as read");
    }
});

export { markNotificationAsRead };
