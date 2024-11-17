import { User } from "../models/user.model.js";

/**
 * Fetch the single admin's ID from the User model.
 * @returns {Promise<ObjectId>} The admin user's ID
 */
const getAdminUserId = async () => {
    try {
        const admin = await User.findOne({ role: 'admin' }, '_id'); // Fetch the user with the 'admin' role
        if (!admin) {
            throw new Error("Admin user not found");
        }
        return admin._id; // Return the admin's ID
    } catch (error) {
        console.error("Error fetching admin user ID:", error);
        throw new Error("Unable to fetch admin user");
    }
};

export { getAdminUserId };
