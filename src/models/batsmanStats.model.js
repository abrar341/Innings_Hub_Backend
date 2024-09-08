import mongoose from "mongoose";

const batsmanStatsSchema = new mongoose.Schema({
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    runs: {
        type: Number,
        default: 0
    },
    ballsFaced: {
        type: Number,
        default: 0
    },
    fours: {
        type: Number,
        default: 0
    },
    sixes: {
        type: Number,
        default: 0
    },
    isOut: {
        type: Boolean,
        default: false
    },
    howOut: {
        type: String,
        enum: ['bowled', 'caught', 'LBW', 'run out', 'stumped', 'not out'],
        default: 'not out'
    },
    dismissalDetails: {
        bowlerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player'
        },
        fielderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player'
        }
    }
});

export const BatsmanStats = mongoose.model('BatsmanStats', batsmanStatsSchema);