import mongoose, { Schema } from 'mongoose';

// Define sub-schema for a match within the schedule
const matchDetailSchema = new Schema({
    matchNumber: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    venue: {
        type: String,
        required: true,
    },
    teams: {
        team1: {
            type: Schema.Types.ObjectId,
            ref: 'Team',
            required: true,
        },
        team2: {
            type: Schema.Types.ObjectId,
            ref: 'Team',
            required: true,
        },
    },
    result: {
        type: Schema.Types.ObjectId,
        ref: 'Match', // This will refer to the Match document where the result will be stored
    },
}, { _id: false });

// Main Schedule schema
const scheduleSchema = new Schema({
    tournament: {
        type: Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true,
    },
    matches: [matchDetailSchema],
}, {
    timestamps: true,
});

export const Schedule = mongoose.model('Schedule', scheduleSchema);
