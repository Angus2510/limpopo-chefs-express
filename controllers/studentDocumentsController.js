const AWS = require('aws-sdk');
const GeneralDocument = require('../models/GeneralDocument');
const LegalDocument = require('../models/LegalDocument');
const { v4: uuidv4 } = require('uuid');
const { s3, bucketName } = require('../config/s3');

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

// Function to upload a general document to S3
const uploadGeneralDocument = async (req, res) => {
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

    // Save file metadata to database
    const generalDocument = new GeneralDocument({
      title: req.body.title,
      description: req.body.description,
      documentUrl: data.Location,
      student: req.body.studentId,
    });
    await generalDocument.save();

    res.json({ url: data.Location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file to S3' });
  }
};

// Function to upload a legal document to S3
const uploadLegalDocument = async (req, res) => {
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

    // Save file metadata to database
    const legalDocument = new LegalDocument({
      title: req.body.title,
      description: req.body.description,
      documentUrl: data.Location,
      student: req.body.studentId,
    });
    await legalDocument.save();

    res.json({ url: data.Location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file to S3' });
  }
};

// Function to download a general document from S3
const downloadGeneralDocument = async (req, res) => {
  try {
    const generalDocument = await GeneralDocument.findById(req.params.id);
    if (!generalDocument) {
      return res.status(404).json({ error: 'General document not found' });
    }

    const fileKey = generalDocument.documentUrl.split('.com/')[1];
    const fileName = fileKey.split('/').pop();

    const params = {
      Bucket: bucketName,
      Key: fileKey,
      Expires: 60,
      ResponseContentDisposition: `attachment; filename="${fileName}"`
    };

    const url = s3.getSignedUrl('getObject', params);

    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
};

// Function to download a legal document from S3
const downloadLegalDocument = async (req, res) => {
  try {
    const legalDocument = await LegalDocument.findById(req.params.id);
    if (!legalDocument) {
      return res.status(404).json({ error: 'Legal document not found' });
    }

    const fileKey = legalDocument.documentUrl.split('.com/')[1];
    const fileName = fileKey.split('/').pop();

    const params = {
      Bucket: bucketName,
      Key: fileKey,
      Expires: 60,
      ResponseContentDisposition: `attachment; filename="${fileName}"`
    };

    const url = s3.getSignedUrl('getObject', params);

    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
};

// Function to get all general documents
const getAllGeneralDocuments = async (req, res) => {
  try {
    const generalDocuments = await GeneralDocument.find();

    const documentsWithSignedUrls = generalDocuments.map(doc => {
      const fileKey = doc.documentUrl.split('.com/')[1];
      const signedUrl = getPreSignedUrl(fileKey);
      return {
        ...doc.toObject(),
        signedUrl,
      };
    });

    res.json(documentsWithSignedUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve general documents' });
  }
};

// Function to get all legal documents
const getAllLegalDocuments = async (req, res) => {
  try {
    const legalDocuments = await LegalDocument.find();

    const documentsWithSignedUrls = legalDocuments.map(doc => {
      const fileKey = doc.documentUrl.split('.com/')[1];
      const signedUrl = getPreSignedUrl(fileKey);
      return {
        ...doc.toObject(),
        signedUrl,
      };
    });

    res.json(documentsWithSignedUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve legal documents' });
  }
};

// Function to delete multiple general documents
const deleteMultipleGeneralDocuments = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Invalid request format. id is required.' });
    }

    const document = await GeneralDocument.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const key = document.documentUrl.split('.com/')[1];
    if (!key) {
      throw new Error(`Invalid documentUrl for document with ID ${id}`);
    }

    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: [{ Key: key.trim() }],
        Quiet: false,
      },
    };

    // Debugging information
    console.log('deleteParams:', JSON.stringify(deleteParams, null, 2));

    const deleteResult = await s3.deleteObjects(deleteParams).promise();
    await GeneralDocument.findByIdAndDelete(id);

    res.json({ message: 'General document deleted successfully', deleteResult });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete general document' });
  }
};

// Function to delete multiple legal documents
const deleteMultipleLegalDocuments = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Invalid request format. id is required.' });
    }

    const document = await LegalDocument.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const key = document.documentUrl.split('.com/')[1];
    if (!key) {
      throw new Error(`Invalid documentUrl for document with ID ${id}`);
    }

    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: [{ Key: key.trim() }],
        Quiet: false,
      },
    };

    // Debugging information
    console.log('deleteParams:', JSON.stringify(deleteParams, null, 2));

    const deleteResult = await s3.deleteObjects(deleteParams).promise();
    await LegalDocument.findByIdAndDelete(id);

    res.json({ message: 'Legal document deleted successfully', deleteResult });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete legal document' });
  }
};

// Function to get all general documents for a specific student
const getGeneralDocumentsByStudentId = async (req, res) => {
  try {
    const generalDocuments = await GeneralDocument.find({ student: req.params.studentId });

    const documentsWithSignedUrls = generalDocuments.map(doc => {
      const fileKey = doc.documentUrl.split('.com/')[1];
      const signedUrl = getPreSignedUrl(fileKey);
      return {
        ...doc.toObject(),
        signedUrl,
      };
    });

    res.json(documentsWithSignedUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve general documents for the student' });
  }
};

// Function to get all legal documents for a specific student
const getLegalDocumentsByStudentId = async (req, res) => {
  try {
    const legalDocuments = await LegalDocument.find({ student: req.params.studentId });

    const documentsWithSignedUrls = legalDocuments.map(doc => {
      const fileKey = doc.documentUrl.split('.com/')[1];
      const signedUrl = getPreSignedUrl(fileKey);
      return {
        ...doc.toObject(),
        signedUrl,
      };
    });

    res.json(documentsWithSignedUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve legal documents for the student' });
  }
};

module.exports = { 
  uploadGeneralDocument, 
  uploadLegalDocument, 
  downloadGeneralDocument, 
  downloadLegalDocument, 
  getAllGeneralDocuments, 
  getAllLegalDocuments, 
  deleteMultipleGeneralDocuments, 
  deleteMultipleLegalDocuments,
  getGeneralDocumentsByStudentId,
  getLegalDocumentsByStudentId 
};
