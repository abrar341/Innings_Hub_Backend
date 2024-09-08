import mongoose from "mongoose";

const bowlerStatsSchema = new mongoose.Schema({
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    oversBowled: {
        type: Number,
        default: 0
    },
    maidens: {
        type: Number,
        default: 0
    },
    runsConceded: {
        type: Number,
        default: 0
    },
    wickets: {
        type: Number,
        default: 0
    },
    wides: {
        type: Number,
        default: 0
    },
    noBalls: {
        type: Number,
        default: 0
    }
});

export const bowlerStats = mongoose.model('BowlerStats', bowlerStatsSchema);