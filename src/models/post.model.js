import mongoose, { Schema } from "mongoose";

const postSchema = new Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    matchId: {
        type: Schema.Types.ObjectId,
        ref: 'Match',
        required: true
    },
    postPhotoUrl: {
        type: String,
        required: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields automatically
});

export const Post = mongoose.model('Post', postSchema);