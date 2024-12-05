// controllers/fileController.js
const { s3, bucketName } = require('../config/s3');

const getFile = async (req, res) => {
  const { key } = req.query;

  const params = {
    Bucket: bucketName,
    Key: key
  };

  try {
    const data = await s3.getObject(params).promise();
    res.writeHead(200, {
      'Content-Type': data.ContentType,
      'Content-Length': data.ContentLength,
    });
    res.write(data.Body);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching the file');
  }
};

module.exports = {
  getFile
};
