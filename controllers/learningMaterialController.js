const AWS = require('aws-sdk');
const LearningMaterial = require('../models/LearningMaterial');
const { v4: uuidv4 } = require('uuid');
const { s3, bucketName } = require('../config/s3');
const Student = require('../models/Student');
const IntakeGroup = require('../models/IntakeGroup');

const sanitizeFileName = (fileName) => {
  return fileName.replace(/[\s!@#$%^&*()+={}[\]|\\:;'"<>?,/]/g, '_');
};


const getPreSignedUrl = (key) => {
  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: 60 * 60
  };
  return s3.getSignedUrl('getObject', params);
};

// Function to upload file to S3
const uploadFileToS3 = async (req, res) => {
  console.log(req.body)
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const sanitizedFileName = sanitizeFileName(file.originalname);

    const fileName = `${uuidv4()}_${sanitizedFileName}`;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer, 
      ContentType: file.mimetype,
    };

    const data = await s3.upload(params).promise();

    const intakeGroupIds = req.body.intakeGroup.split(',').map(id => id.trim());

    // Save file metadata to database
    const learningMaterial = new LearningMaterial({
      title: req.body.title,
      uploadType: req.body.uploadType,
      intakeGroup: intakeGroupIds,
      description: req.body.description,
      filePath: data.Location,
    });
    await learningMaterial.save();

    res.json({ url: data.Location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file to S3' });
  }
};

// Function to download file from S3
const downloadFileFromS3 = async (req, res) => {
  try {
    const learningMaterial = await LearningMaterial.findById(req.params.id);
    if (!learningMaterial) {
      return res.status(404).json({ error: 'Learning material not found' });
    }

    // Extract the key from the filePath (S3 URL)
    const filePath = learningMaterial.filePath;
    const fileKey = filePath.split('.com/')[1]; // Extract the key from the URL
    const fileExtension = fileKey.split('.').pop(); // Extract the file extension
    const sanitizedTitle = sanitizeFileName(learningMaterial.title);
    const fileName = `${sanitizedTitle}.${fileExtension}`; // Replace spaces with underscores

    const params = {
      Bucket: bucketName,
      Key: fileKey,
      Expires: 60, // URL expires in 60 seconds
      ResponseContentDisposition: `attachment; filename="${fileName}"`
    };

    const url = s3.getSignedUrl('getObject', params);

    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
};

const getAllLearningMaterials = async (req, res) => {
  try {
    const learningMaterials = await LearningMaterial.find().populate('intakeGroup');

    const learningMaterialsWithSignedUrls = learningMaterials.map(material => {
      const fileKey = material.filePath.split('.com/')[1];
      const signedUrl = getPreSignedUrl(fileKey);
      return {
        ...material.toObject(),
        signedUrl,
      };
    });

    res.json(learningMaterialsWithSignedUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve learning materials' });
  }
};

  const deleteMultipleLearningMaterials = async (req, res) => {
    try {
      const { ids } = req.body;
      const learningMaterials = await LearningMaterial.find({ _id: { $in: ids } });
  
      // Prepare the S3 delete objects array
      const deleteObjects = learningMaterials.map(material => ({
        Key: material.filePath.split('/').pop(),
      }));
  
      const deleteParams = {
        Bucket: bucketName,
        Delete: {
          Objects: deleteObjects,
          Quiet: false,
        },
      };
  
      // Delete files from S3
      await s3.deleteObjects(deleteParams).promise();
  
      // Delete learning materials from the database
      await LearningMaterial.deleteMany({ _id: { $in: ids } });
  
      res.json({ message: 'Learning materials deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete learning materials' });
    }
  };

  const getLearningMaterialsByStudentId = async (req, res) => {
    try {
      const studentId = req.params.id;
      const student = await Student.findById(studentId);
  
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      const intakeGroup = student.intakeGroup;
      const learningMaterials = await LearningMaterial.find({ intakeGroup: { $in: intakeGroup } });
  
      const learningMaterialsWithSignedUrls = learningMaterials.map(material => {
        const fileKey = material.filePath.split('.com/')[1];
        const signedUrl = getPreSignedUrl(fileKey);
        return {
          ...material.toObject(),
          signedUrl,
        };
      });
  
      res.json(learningMaterialsWithSignedUrls);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve learning materials' });
    }
  };


module.exports = { uploadFileToS3, downloadFileFromS3, getAllLearningMaterials, deleteMultipleLearningMaterials, getLearningMaterialsByStudentId};
