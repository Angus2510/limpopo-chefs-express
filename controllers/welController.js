const Wel = require('../models/Wel');
const { v4: uuidv4 } = require('uuid');
const { s3, bucketName } = require('../config/s3');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');


const getPreSignedUrl = (key) => {
  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: 60 * 60 
  };
  return s3.getSignedUrl('getObject', params);
};

const getFileKeyFromUrl = (url) => {
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1].split('?')[0];
};

const createWel = async (req, res) => {
  try {
    const { title, location, description, accommodation } = req.body;
    const photoFiles = req.files; 

    if (!photoFiles || photoFiles.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploadPromises = photoFiles.map((file) => {
      const params = {
        Bucket: bucketName,
        Key: `${uuidv4()}_${file.originalname}`,
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

    const photoUploadResults = await Promise.all(uploadPromises);

    const wel = new Wel({
      title,
      location,
      description,
      accommodation,
      photoPath: photoUploadResults.map(result => result.location),
    });

    await wel.save();

    res.json({ wel, photoUrls: wel.photoPath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create wel and upload photos' });
  }
};


const getAllWels = async (req, res) => {
    try {
      const wels = await Wel.find();
      res.json(wels);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve wels' });
    }
  };


  const getWelById = async (req, res) => {
    try {
      const wel = await Wel.findById(req.params.id);
      if (!wel) {
        return res.status(404).json({ error: 'Wel not found' });
      }
  
      // Generate pre-signed URLs for each photo
      const photos = wel.photoPath.map(path => {
        const fileKey = path.split('.com/')[1]; // Extract the key from the URL
        return getPreSignedUrl(fileKey);
      });
  
      res.json({ ...wel.toObject(), photos });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve wel' });
    }
  };
  
  const updateWel = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, location, description, accommodation, available,note, deletePhotoPaths } = req.body;
        const photoFiles = req.files;

        console.log('Request Params ID:', id);
        console.log('Request Body:', req.body);
        console.log('Photo Files:', photoFiles);
        const parsedDeletePhotoPaths = JSON.parse(deletePhotoPaths || '[]');
        console.log('Parsed deletePhotoPaths:', parsedDeletePhotoPaths);

        const wel = await Wel.findById(id);
        if (!wel) {
            console.error('Wel not found for ID:', id);
            return res.status(404).json({ error: 'Wel not found' });
        }

        if (title) wel.title = title;
        if (location) wel.location = location;
        if (description) wel.description = description;
        if (accommodation !== undefined) wel.accommodation = accommodation;
        if (available !== undefined) wel.available = available;
        if (note !== undefined) wel.note = note;

        // Strip query parameters from URLs for comparison
        const strippedDeletePhotoPaths = parsedDeletePhotoPaths.map(url => url.split('?')[0]);

        // Delete photos if specified
        if (strippedDeletePhotoPaths.length > 0) {
            console.log('Deleting photos:', strippedDeletePhotoPaths);
            const deletePromises = strippedDeletePhotoPaths.map(url => {
                const fileKey = url.split('/').pop(); // Extract the key from the URL
                console.log('Deleting file key:', fileKey);
                const params = {
                    Bucket: bucketName,
                    Key: fileKey,
                };
                return s3.deleteObject(params).promise();
            });
            await Promise.all(deletePromises);
            console.log('Photos deleted successfully');
            wel.photoPath = wel.photoPath.filter(path => !strippedDeletePhotoPaths.includes(path));
            console.log('Updated photoPath:', wel.photoPath);
        }

        // Upload new photos if any
        if (photoFiles && photoFiles.length > 0) {
            console.log('Uploading new photos');
            const uploadPromises = photoFiles.map((file) => {
                const params = {
                    Bucket: bucketName,
                    Key: `${uuidv4()}_${file.originalname}`,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };

                return s3.upload(params).promise().then(data => data.Location);
            });

            const newPhotoPaths = await Promise.all(uploadPromises);
            wel.photoPath = [...wel.photoPath, ...newPhotoPaths];
            console.log('New photos uploaded:', newPhotoPaths);
        }

        await wel.save();

        console.log('Wel updated successfully:', wel);
        res.json(wel);
    } catch (error) {
        console.error('Error updating wel:', error);
        res.status(500).json({ error: 'Failed to update wel' });
    }
};

const deleteWel = async (req, res) => {
  const { id } = req.params;
  console.log(`Deleting Wel with ID: ${id}`);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  try {
    const wel = await Wel.findById(id);
    if (!wel) {
      return res.status(404).json({ message: 'Wel not found' });
    }

    // Delete associated photos from S3
    const deletePromises = wel.photoPath.map(photoUrl => {
      const key = getFileKeyFromUrl(photoUrl);
      const params = { Bucket: bucketName, Key: key };
      return s3.deleteObject(params).promise();
    });

    await Promise.all(deletePromises);
    console.log('Photos deleted successfully');

    await Wel.findByIdAndDelete(id);
    console.log('Wel deleted successfully');
    res.status(200).json({ message: 'Wel and associated photos deleted successfully' });
  } catch (error) {
    console.error('Failed to delete Wel:', error);
    res.status(500).json({ message: 'Failed to delete Wel' });
  }
};


module.exports = { createWel, getAllWels, getWelById, updateWel, deleteWel };