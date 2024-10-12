import mongoose, { Schema } from "mongoose";

const squadSchema = new Schema({
    // Squad name or identifier, typically a combination of team name and tournament
    name: {
        type: String,
        required: true,
        trim: true
    },
    team: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    tournament: {
        type: Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true
    },
    players: [{
        type: Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],  // Status for squad approval
        default: 'pending'
    }
}, {
    timestamps: true
});

// Exporting the Squad model
export const Squad = mongoose.model('Squad', squadSchema);
