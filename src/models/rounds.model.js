import mongoose, { Schema } from 'mongoose';

const roundSchema = new Schema({
    roundName: {
        type: String,
        required: true,
    },
    scheduleType: {
        type: String,
        enum: ['round-robin', 'knockout'],
        required: true,
    },
    tournament: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true,
    },
    // Optional: Array of groups
    groups: [{
        groupName: {
            type: String,
            required: true,
        },
        // Teams in the group
        teams: [{
            type: mongoose.Schema.Types.ObjectId, // Assuming teams are identified by ID or some identifier
            ref: 'Team'
        }],
        // Array of Match references
        matches: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Match',
        }],
        // Standings for each team in the group
        standings: [{
            team: {
                type: mongoose.Schema.Types.ObjectId, // Reference to the team
                ref: 'Team',
                required: true,
            },
            played: {
                type: Number,
                default: 0,
            },
            won: {
                type: Number,
                default: 0,
            },
            lost: {
                type: Number,
                default: 0,
            },
            tied: {
                type: Number,
                default: 0,
            },
            points: {
                type: Number,
                default: 0,
            },
            netRunRate: {
                type: Number,
                default: 0, // Used as a tie-breaker in cricket
            },
        }],
    }],
}, { timestamps: true });


export const Round = mongoose.model('Round', roundSchema);
