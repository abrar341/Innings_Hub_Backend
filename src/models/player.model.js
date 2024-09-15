import mongoose, { Schema } from "mongoose";

// Define the player schema
const playerSchema = new Schema({
    // Image and Additional Details
    profilePicture: {
        type: String,
    },
    // Personal Information
    playerName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        match: [/.+\@.+\..+/, 'Please fill a valid email address'],
        default: null,
        sparse: true
    },
    phone: {
        type: String,
        // match: [/^\d{10,15}$/, 'Please fill a valid phone number']
    },
    DOB: {
        type: Date
    },
    age: {
        type: Number,
        min: 15,
        max: 50,
    },
    jersyNo: {
        type: Number,
    },
    country: {
        type: String,
        default: "Pakistan"
    },
    city: {
        type: String,
    },
    // Cricket Specifics
    role: {
        type: String,
        enum: ['All-Rounder', 'Batsman', 'Bowler', 'wicket-keeper'],
    },
    status: {
        type: String,
        enum: ['Active', 'inActive'],
        default: 'inActive'
    },
    battingStyle: {
        type: String,
        enum: ['Right-handed', 'Left-handed'],
    },
    bowlingStyle: {
        type: String,
        enum: ['Right-arm fast', 'Left-arm fast', 'Right-arm spin', 'Left-arm spin'],
    },
    teams: [{
        type: Schema.Types.ObjectId,
        ref: 'Team',
    }],
    currentTeam: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
    },
    associatedClub: {
        type: Schema.Types.ObjectId,
        ref: 'Club',
    },
    stats: {                 //stats of player
        matches: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        highestScore: { type: Number, default: 0 },
        centuries: { type: Number, default: 0 },
        halfCenturies: { type: Number, default: 0 },
    },
    description: {                 //about player
        type: String
    }
},
    {
        timestamps: true
    }
);


export const Player = mongoose.model('Player', playerSchema);
