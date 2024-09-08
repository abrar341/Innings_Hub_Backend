import mongoose, { Schema } from "mongoose";

const clubSchema = new Schema(
    {
        clubName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        clubLogo: {
            type: String,
        },
        location: {
            type: String,
            required: true,
            trim: true
        },
        manager: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            // required: true
        },
        registrationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        teams: [{
            type: Schema.Types.ObjectId,
            ref: 'Team'
        }],
        players: [{
            type: Schema.Types.ObjectId,
            ref: 'Player'
        }],
    },
    {
        timestamps: true
    }
);

// Middleware to update `updatedAt` on document modification
clubSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual field to count the number of teams in the club
clubSchema.virtual('teamCount').get(function () {
    return this.teams.length;
});

// Virtual field to count the number of players in the club
clubSchema.virtual('playerCount').get(function () {
    return this.players.length;
});

export const Club = mongoose.model('Club', clubSchema);
