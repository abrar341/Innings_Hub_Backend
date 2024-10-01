import mongoose from "mongoose";

const ballSchema = new mongoose.Schema({
    ballNumber: { type: Number }, // 1 to 6 for each ball in the over
    batsmanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true // The batsman facing the ball
    },
    nonStrikerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player' // Non-striker at the time of this ball
    },
    bowlerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true // The bowler delivering the ball
    },
    runs: {
        scored: {
            type: Number,
            required: true // Runs scored on this ball (excluding extras)
        },
        extras: {
            type: {
                type: String,
                enum: ['none', 'wide', 'no-ball', 'bye', 'leg-bye'], // Added bye and leg-bye
                default: 'none'
            },
            runs: { type: Number, default: 0 } // Runs from extras
        }
    },
    event: {
        boundary: {
            type: { type: String, enum: ['none', '6', '4'], default: 'none' } // Boundary details
        },
        wicket: {
            type: {
                type: String,
                enum: ['none', 'bowled', 'caught', 'LBW', 'run-out', 'stumped'], // Added more dismissal types
                default: 'none'
            },
            by: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        }
    },
    isOut: { type: Boolean, default: false }, // Marks whether the batsman is out on this ball
    isValidBall: { type: Boolean, default: true }, // Marks whether this is a valid delivery (i.e., not wide or no-ball)
});

ballSchema.pre('save', function (next) {
    if (this.runs.extras === 'wide' || this.runs.extras === 'no-ball') {
        this.isValidBall = false;
    } else {
        this.isValidBall = true;
    }
    next();
});

const overSchema = new mongoose.Schema({
    overNumber: { type: Number, required: true, default: 0 }, // Over number (1, 2, etc.)
    balls: [ballSchema], // Details of each ball in the over
    totalRuns: { type: Number, default: 0 }, // Total runs in the over
    wickets: { type: Number, default: 0 }, // Wickets in the over
    extras: { type: Number, default: 0 }, // Extras in the over
    bowler: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
        required: true
    }, // Bowler for the over
});
const battingPerformanceSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    runs: { type: Number, default: 0 },
    ballsFaced: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    dismissalType: { type: String }, // Type of dismissal: "bowled", "caught", "LBW", etc.
    bowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // The bowler who took the wicket
    fielder: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // The fielder involved (if caught, run-out, etc.)
});

const bowlingPerformanceSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    overs: { type: Number, default: 0 }, // This will store full overs (e.g., 4.0 overs)
    balls: { type: Number, default: 0 }, // Total number of balls bowled (this helps in calculating partial overs like 4.3)
    maidens: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    economy: { type: Number, default: 0 }, // Will be calculated dynamically based on runsConceded / total overs (including partial overs)
});

const inningSchema = new mongoose.Schema({
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: [overSchema], // Array of overs in this inning
    totalOvers: { type: Number, default: 0 }, // Total overs bowled (for quick reference)
    extras: {
        wides: { type: Number, default: 0 },
        noBalls: { type: Number, default: 0 },
        byes: { type: Number, default: 0 },
        legByes: { type: Number, default: 0 },
        total: { type: Number, default: 0 }, // Total extras
    },
    fallOfWickets: [
        {
            runs: { type: Number }, // Runs at which wicket fell
            over: { type: String }, // Over when the wicket fell (e.g., 4.5 overs)
            ball: { type: String },
            batsmanOut: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
        },
    ],
    battingPerformances: [battingPerformanceSchema], // Array of individual batting performances
    bowlingPerformances: [bowlingPerformanceSchema], // Array of individual bowling performances
    currentStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // Batsman on strike
    nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // Batsman not on strike
    currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // Bowler for the ongoing over
    previousBowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // Bowler for the ongoing over
});

const matchSchema = new mongoose.Schema({
    teams: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
            required: true,
        },
    ],
    venue: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    round: {
        type: String,
        required: true,
    },
    overs: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["scheduled", "live", "completed", "canceled", "abandoned", "delay"],
        default: "scheduled",
    },
    tournament: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tournament",
        required: true,
    },
    toss: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team", // Team that wins the toss
    },
    tossDecision: {
        type: String,
        enum: ["bat", "bowl"],
    },
    playing11: [
        {
            team: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Team",
            },
            players: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Player",
                },
            ],
        },
    ],
    innings: [inningSchema], // Array of innings, allowing for multiple innings (Test or ODI format)
    currentInning: {
        type: Number, // Either 1 or 2 (for two innings in limited overs)
        default: 1,
    },
    umpires: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Official",
        },
    ],
    scorer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // The scorer managing this match
    },
    result: {
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
        },
        margin: {
            type: String, // Margin of victory (e.g., "20 runs" or "5 wickets")
        },
        isTie: {
            type: Boolean,
            default: false,
        }
    },
},
    {
        timestamps: true,
    });

const Match = mongoose.model("Match", matchSchema);

export default Match;
