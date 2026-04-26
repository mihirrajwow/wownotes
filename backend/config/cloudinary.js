const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const streamifier = require("streamifier");

// Configure Cloudinary with env credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — we stream the buffer directly to Cloudinary
// (no temp files written to disk)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF and image files are allowed."), false);
    }
};

// Max 20 MB per file
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 80 * 1024 * 1024 },
});

/**
 * Upload a buffer directly to Cloudinary.
 * Returns the full Cloudinary upload result.
 *
 * @param {Buffer} buffer   - File buffer from multer memoryStorage
 * @param {string} folder   - Cloudinary folder path, e.g. "wownotes/sem5"
 * @param {string} publicId - Optional custom public_id (filename)
 * @param {string} resourceType - 'raw' for PDFs, 'image' for images
 */
function uploadToCloudinary(buffer, folder, publicId, resourceType = "raw") {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId || undefined,
                resource_type: resourceType,
                use_filename: true, // use the public_id we pass as the filename
                unique_filename: false, // don't append random suffix — we handle uniqueness ourselves
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            },
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

/**
 * Delete a file from Cloudinary by its public_id.
 * resource_type must match what was used during upload ('raw' for PDF).
 */
function deleteFromCloudinary(publicId, resourceType = "raw") {
    return cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
    });
}

/**
 * Generate a signed URL for a private/authenticated asset.
 * Expires in `expiresInSeconds` seconds (default 1 hour).
 * Use this if you set your Cloudinary delivery type to 'authenticated'.
 */
function signedUrl(publicId, resourceType = "raw", expiresInSeconds = 3600) {
    return cloudinary.utils.private_download_url(publicId, "pdf", {
        resource_type: resourceType,
        expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
        attachment: false,
    });
}

module.exports = {
    cloudinary,
    upload,
    uploadToCloudinary,
    deleteFromCloudinary,
    signedUrl,
};
