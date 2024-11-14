// models/Notification.js
import mongoose, { Schema } from "mongoose";

// Define the player schema
const notificationSchema = new Schema({
    type: { type: String, required: true }, // "player_request" or "club_registration"
    status: { type: String, default: 'pending' }, // "pending", "approved", "rejected"
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    message: { type: String },
    isRead: { type: Boolean, default: false }
});

export const Notification = mongoose.model('Notification', notificationSchema);
