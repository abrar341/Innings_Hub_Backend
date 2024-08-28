import mongoose, { Schema } from "mongoose";

// Define the player schema
const playerSchema = new Schema({
    // Image and Additional Details
    profilePicture: {
        type: String,
    },
    // Personal Information
    name: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    phone: {
        type: String,
        match: [/^\d{10,15}$/, 'Please fill a valid phone number']
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
        enum: ['All-Rounder', 'Batter', 'Bowler', 'Wicketkeeper Batter'],
        default: "Batter"
    },
    battingStyle: {
        type: String,
        enum: ['Right-handed', 'Left-handed'],
        default: "Right-handed"
    },
    bowlingStyle: {
        type: String,
        enum: ['Right-arm fast', 'Left-arm fast', 'Right-arm spin', 'Left-arm spin'],
        default: "Right-arm fast"
    },
    // Team and Tournament Associations
    teams: [{                 //list of teams in which played
        type: Schema.Types.ObjectId,
        ref: 'Team',
    }],
    currentTeam: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
    },
    tournamentsPlayed: [{      //list of tournaments played
        type: Schema.Types.ObjectId,
        ref: 'Tournament',
    }],
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

// Indexes
playerSchema.index({ username: 1 });
playerSchema.index({ email: 1 });

export const Player = mongoose.model('Player', playerSchema);
