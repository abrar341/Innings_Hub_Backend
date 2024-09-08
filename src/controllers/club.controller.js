

import { asyncHandler } from "../utils/asyncHandler.js";
import { Club } from "../models/club.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const createClub = asyncHandler(async (req, res) => {
    try {
        const {
            clubName,
            location,
        } = req.body;
        console.log("body", req.body);
        console.log("files", req.files);
        const existingClub = await Club.findOne({ $or: [{ clubName }] });
        if (existingClub) {
            throw new ApiError(409, "club with the same name or short name already exists");
        }


        let clubLogoLocalPath;
        if (req.files && Array.isArray(req.files.clubLogo) && req.files.clubLogo.length > 0) {
            clubLogoLocalPath = req.files.clubLogo[0].path;
        }
        const clubLogo = await uploadOnCloudinary(clubLogoLocalPath);
        console.log(clubLogo);

        const sanitizedData = {
            clubLogo: clubLogo?.url.trim() || "",
            clubName: clubName?.trim(),
            location: location?.trim(),
        };

        console.log("sanitizedData", sanitizedData);
        const club = new Club(sanitizedData);
        await club.save();

        const createdClub = await Club.findById(club._id)
            .select('clubLogo clubName location');

        return res.status(201).json(
            new ApiResponse(201, createdClub, "Club created successfully")
        );
    } catch (error) {
        throw new ApiError(500, error);
    }
});

export {
    createClub
}