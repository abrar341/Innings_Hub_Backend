import mongoose, { Schema } from 'mongoose';

// Define sub-schemas for nested structures
const topScorerSchema = new Schema({
    player: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
    },
    runsScored: {
        type: Number,
        required: true,
    },
}, { _id: false });

const bowlingAnalysisSchema = new Schema({
    player: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
    },
    oversBowled: {
        type: Number,
        required: true,
    },
    maidens: {
        type: Number,
        required: true,
    },
    runsConceded: {
        type: Number,
        required: true,
    },
    wicketsTaken: {
        type: Number,
        required: true,
    },
}, { _id: false });

const fallOfWicketSchema = new Schema({
    wicketNumber: {
        type: Number,
        required: true,
    },
    batsman: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
    },
    runsScored: {
        type: Number,
    },
    bowler: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
    },
}, { _id: false });

const inningsSchema = new Schema({
    team: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    wicketsLost: {
        type: Number,
        required: true,
    },
    oversBowled: {
        type: Number,
        required: true,
    },
    topScorer: topScorerSchema,
    bowlingAnalysis: [bowlingAnalysisSchema],
    fallOfWickets: [fallOfWicketSchema],
}, { _id: false });

const scorecardSchema = new Schema({
    // Match Context
    match: {
        type: Schema.Types.ObjectId,
        ref: 'Match',
        required: true,
    },
    // Teams and Toss Outcome
    tossWinner: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
    },
    battingFirst: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
    },
    bowlingFirst: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
    },
    // First Innings
    firstInnings: inningsSchema,
    // Second Innings (Optional)
    secondInnings: inningsSchema,
    result: {
        type: String,
        enum: ['Won by Team1', 'Won by Team2', 'Tie', 'No Result'],
    },
    marginOfVictory: {
        type: String, // e.g., by 7 wickets, by 56 runs
    },
}, {
    timestamps: true,
});

export const Scorecard = mongoose.model("Scorecard", scorecardSchema);
