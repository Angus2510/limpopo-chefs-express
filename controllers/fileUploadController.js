const { s3, bucketName } = require('../config/s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); 

const uploadFile = (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileName = `${uuidv4()}${path.extname(file.originalname)}`;

  const params = {
    Bucket: bucketName,
    Key: fileName, 
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to upload file to S3' });
    }
    res.json({ url: data.Location });
  });
};


const getAllFiles = (req, res) => {
  const params = {
    Bucket: bucketName,
  };

  s3.listObjects(params, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list files from S3' });
    }

    const files = data.Contents.map(file => ({
      key: file.Key,
      url: `https://${params.Bucket}.s3.amazonaws.com/${file.Key}`
    }));

    res.json({ files });
  });
};


const getFileById = (req, res) => {
  const fileId = req.params.id; 
  const file = {
    id: fileId,
    name: `File_${fileId}`,
  };

  res.json({ file });
};

const updateFileInfo = (req, res) => {
  const fileId = req.params.id;
  const updatedFileInfo = req.body; 

  updatedFileInfo.id = fileId; 

  res.json({ message: `File with ID ${fileId} updated`, updatedFileInfo });
};

const deleteFile = (req, res) => {
  const fileId = req.params.id;

  const params = {
    Bucket: bucketName,
    Key: fileId,
  };

  s3.deleteObject(params, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete file from S3' });
    }
    res.json({ message: `File with ID ${fileId} deleted` });
  });
};


module.exports = {
  uploadFile,
  getAllFiles,
  getFileById,
  updateFileInfo,
  deleteFile,
};
