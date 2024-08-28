import mongoose, { Schema } from "mongoose";

const squadSchema = new Schema({
    // Squad name or identifier, typically a combination of team name and tournament
    name: {
        type: String,
        required: true,
        trim: true
    },
    // The team this squad belongs to
    team: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    // The tournament this squad is participating in
    tournament: {
        type: Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true
    },
    // Players in the squad
    players: [{
        type: Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    }],
}, {
    timestamps: true
});

// Exporting the Squad model
export const Squad = mongoose.model('Squad', squadSchema);
