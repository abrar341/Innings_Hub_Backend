import multer from "multer";
import path from "path";

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp"); // Destination folder for uploaded files
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension); // Unique file name
    }
});

// Export the upload middleware
export const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        // Validate file type (e.g., only allow images)
        const fileTypes = /jpeg|jpg|png/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Only images are allowed"));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});
