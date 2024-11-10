import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        profilePicture: {
            type: String,
        },
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        role: {
            type: String,
            enum: ["admin", "club-manager", "regular-user", 'scorer'],
            required: true,
            default: "regular-user",
        },
        phone: {
            type: String,
        },
        address: {
            type: String,

        },
        resetPasswordToken: String,
        resetPasswordExpiresAt: Date,
        verificationToken: String,
        verificationTokenExpiresAt: Date,
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            default: function () {
                return this.role === "club-manager" ? null : undefined;
            }
        },
        address: {
            type: String,
            ref: "Club",
            default: function () {
                return this.role === "club-manager" ? null : undefined;
            }
        },
    },
    { timestamps: true }
)

userSchema.pre("save", async function (next) {
    // Check if the role is `club-manager` and club is not assigned
    if (this.role === "club-manager" && !this.club) {
        this.club = null;  // Explicitly set the club to null if not assigned
    }

    // Check if the role is NOT `club-manager` and the `club` field is assigned
    if (this.role !== "club-manager") {
        this.set('club', undefined);  // Set `club` to undefined to remove it
    }

    next();
});
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            name: this.name,
            role: this.role // Include role in the token
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

export const User = mongoose.model("User", userSchema);
