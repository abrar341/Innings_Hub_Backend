import mongoose, { Schema } from "mongoose";

const tournamentSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    shortName: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        // validate: {
        //     validator: function (value) {
        //         return this.startDate <= value;
        //     },
        //     message: 'End date must be after start date',
        // },
    },
    image: {
        type: String, // cloudinary url
    },
    ballType: {
        type: String,
        required: true,
        enum: ['Leather', 'Cork', 'Tennis'],
        default: 'cork', // Adjust based on your app's requirements
    },
    tournamentType: {
        type: String,
        required: true,
        enum: ['Open', 'School', 'Club'],
        default: 'Club', // Adjust based on your app's requirements
    },
    season: {
        type: Number,
        required: true,

    },
    format: {
        groups: {
            type: Number,
        },
        maxOvers: {
            type: Number,
        },
        rule: {
            type: String,
        },
    },
    venues: [{
        type: String,
    }],
    winner: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
    },
    runnerUp: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
    },
    leaderboard: {
        bat: {
            player: {
                type: Schema.Types.ObjectId,
                ref: 'Player',
            },
            runs: {
                type: Number,
                default: 0,
            },
        },
        bowl: {
            player: {
                type: Schema.Types.ObjectId,
                ref: 'Player',
            },
            wickets: {
                type: Number,
                default: 0,
            },
        },
    },
    // matches: [{
    //     type: Schema.Types.ObjectId,
    //     ref: 'Match',
    // }],
    teams: [{
        type: Schema.Types.ObjectId,
        ref: 'Team',
    }],
    schedule: {
        type: Schema.Types.ObjectId,
        ref: 'Schedule',
    },
    squad: {
        type: Schema.Types.ObjectId,
        ref: 'Squad',
    },
}, {
    timestamps: true,
});

export const Tournament = mongoose.model('Tournament', tournamentSchema);
