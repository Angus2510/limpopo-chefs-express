const AWS = require('aws-sdk');
const { bucketName } = require('../config/s3');

const s3 = new AWS.S3();

const downloadFileById = (req, res) => {
    const fileId = req.params.id;

    const params = {
        Bucket: bucketName,
        Key: fileId 
    };

    s3.getObject(params, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to download file from S3' });
        }

        res.setHeader('Content-Type', data.ContentType);

        res.send(data.Body);
    });
};
module.exports = {
    downloadFileById
};
