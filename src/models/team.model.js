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
    // Team owner information
    owner: {
        type: String,
        trim: true
    },
    // Coach of the team
    coach: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    teamtype: {
        type: String,
        trim: true

        // enum: ['Club-level', 'School', 'Other'],
        // default: 'Club', // Adjust based on your app's requirements
    },
    // Team captain information
    captain: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
    },
    // Tournaments in which the team has participated
    tournamentsPlayed: [{
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
