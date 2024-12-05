const multer = require('multer');
const { s3, bucketName } = require('../config/s3');
const { v4: uuidv4 } = require('uuid');

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Increase the file size limit to 10MB
});


upload.s3Upload = async (req, res, next) => {
  const file = req.file;
  if (!file) {
    return next();
  }

  const folder = req.query.folder || ''; // Folder path from query parameter or default to ''
  const params = {
    Bucket: bucketName,
    Key: `${folder}${folder ? '/' : ''}${uuidv4()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const data = await s3.upload(params).promise();
    req.body.photoUrl = data.Location; // Store the URL of the uploaded file
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to upload file to S3' });
  }
};

upload.s3UploadMultiple = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  const folder = req.query.folder || ''; 
  const uploadPromises = req.files.map((file) => {
    const params = {
      Bucket: bucketName,
      Key: `${folder}${folder ? '/' : ''}${uuidv4()}_${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    return s3.upload(params).promise().then(data => ({
      originalName: file.originalname,
      location: data.Location,
    })).catch(err => {
      console.error(err);
      throw new Error('Failed to upload file to S3');
    });
  });

  Promise.all(uploadPromises)
    .then(results => {
      req.body.fileData = results;
      next();
    })
    .catch(err => res.status(500).json({ error: err.message }));
};

module.exports = upload;
