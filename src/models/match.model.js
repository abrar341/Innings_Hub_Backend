
import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    teams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    }],
    overs: {
        type: Number,
        required: true
    },
    currentOver: {
        type: Number,
        default: 0
    },
    currentBall: {
        type: Number,
        default: 0
    },
    totalRuns: {
        type: Number,
        default: 0
    },
    totalWickets: {
        type: Number,
        default: 0
    },
    battingTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    bowlingTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    currentBatsmen: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    }],

    batsmanStats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BatsmanStats',
        required: true
    }],
    bowlerStats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BowlerStats',
        required: true
    }],

    currentBowler: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    status: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed'],
        default: 'not-started'
    },
    isLive: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const Match = mongoose.model('Match', matchSchema);

export default Match;
