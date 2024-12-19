const AWS = require("aws-sdk");
const multer = require("multer"); // Add this line to import multer
const multerS3 = require("multer-s3"); // Import multer-s3 for S3 integration

// Initialize S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Configure multer with S3 storage
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "limpopochefs-media", // Your S3 bucket name
    acl: "public-read", // Make files publicly accessible
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically set file content type
    key: function (req, file, cb) {
      cb(null, `uploads/${Date.now()}-${file.originalname}`); // Unique filename
    },
  }),
});

const bucketName = process.env.S3_BUCKET_NAME;

module.exports = { s3, upload, bucketName };
