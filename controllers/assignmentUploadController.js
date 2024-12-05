const { s3, bucketName } = require('../config/s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); 

const uploadFileToAssignment = async (req, res) => {
    console.log('Received upload request');
    const file = req.file;
    const { assignmentId, questionId } = req.query;

    console.log('Request query params:', { assignmentId, questionId });
    console.log('Request file:', file);

    if (!file || !assignmentId || !questionId) {
        console.error('Missing required parameters or file');
        return res.status(400).json({ error: 'Missing required parameters or file' });
    }

    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
    console.log('Generated file name:', fileName);

    const params = {
        Bucket: bucketName,
        Key: fileName, 
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        const data = await s3.upload(params).promise();
        console.log('File uploaded to S3:', data);
        res.json({ url: data.Location });
    } catch (err) {
        console.error('Failed to upload file to S3:', err);
        res.status(500).json({ error: 'Failed to upload file to S3' });
    }
};

module.exports = {
    uploadFileToAssignment,
};
