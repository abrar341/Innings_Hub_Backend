import mongoose, { Schema } from "mongoose";

const teamSchema = new Schema({
    // Logo of the team
    teamLogo: {
        type: String,
        trim: true

    },
    // Team name
    teamName: {
        type: String,
        required: true,
        trim: true
    },
    // Abbreviated or short name for the team
    shortName: {
        type: String,
        required: true,
        trim: true
    },
    stats: {                 //stats of player
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        loss: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
    },
    // Team owner information
    associatedClub: {
        type: Schema.Types.ObjectId,
        ref: 'Club',
    },
    // Coach of the team
    coach: {
        type: String,
        trim: true
    },
    teamtype: {
        type: String,
        trim: true,
        enum: ['senior', 'junior', 'other'],
        // default: 'Club', // Adjust based on your app's requirements
    },
    status: {
        type: String,
        enum: ['Active', 'inActive'],
        default: 'inActive'
    },
    // Team captain information
    captain: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
    },
    // Tournaments in which the team has participated
    tournamentsWon: [{
        type: Schema.Types.ObjectId,
        ref: 'Tournament',
    }],
    // The current tournament the team is participating in
    currentTournament: {
        type: Schema.Types.ObjectId,
        ref: 'Tournament',
    },
    // All matches the team has played or scheduled
    matches: [{
        type: Schema.Types.ObjectId,
        ref: 'Match',
    }],
    players: [{
        type: Schema.Types.ObjectId,
        ref: 'Player',
    }],
}, {
    timestamps: true
});

// Exporting the Team model
export const Team = mongoose.model('Team', teamSchema);
