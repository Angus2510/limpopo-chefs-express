const Accommodation = require('../models/Accommodation');
const asyncHandler = require('express-async-handler');


// @desc Get accommodation by ID
// @route GET /accommodations/:id
// @access Private
const getAccommodationById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const accommodation = await Accommodation.findById(id).populate({
        path: 'occupants',
        select: 'profile.firstName profile.lastName'
    }).lean();

    if (!accommodation) {
        return res.status(404).json({ message: 'Accommodation not found' });
    }
    console.log(accommodation)
    res.json(accommodation);
});
// @desc Get all Accommodations with their occupants (students)
// @route GET /accommodations
// @access Private
const getAllAccommodations = asyncHandler(async (req, res) => {
    const accommodations = await Accommodation.find().populate({
      path: 'occupants',
      select: 'profile.firstName profile.lastName'
    }).lean();
  
    if (!accommodations?.length) {
      return res.status(400).json({ message: 'No accommodations found' });
    }
  
    const accommodationsWithAvailability = accommodations.map(accommodation => {
      const occupantsCount = accommodation.occupants ? accommodation.occupants.length : 0;
      const isAvailable = occupantsCount < accommodation.numberOfOccupants;
      return {
        ...accommodation,
        isAvailable
      };
    });
  
    res.json(accommodationsWithAvailability);
});

// @desc Get all available Accommodations
// @route GET /accommodations/available
// @access Private

const getAvailableAccommodations = asyncHandler(async (req, res) => {
    const accommodations = await Accommodation.find().populate({
      path: 'occupants',
      select: 'profile.firstName profile.lastName'
    }).lean();
  
    if (!accommodations?.length) {
      return res.status(400).json({ message: 'No accommodations found' });
    }
  
    const availableAccommodations = accommodations.filter(accommodation => {
      const occupantsCount = accommodation.occupants ? accommodation.occupants.length : 0;
      return occupantsCount < accommodation.numberOfOccupants;
    }).map(accommodation => {
      const occupantsCount = accommodation.occupants ? accommodation.occupants.length : 0;
      const isAvailable = occupantsCount < accommodation.numberOfOccupants;
      return {
        ...accommodation,
        isAvailable
      };
    });
    console.log(availableAccommodations)
    res.json(availableAccommodations);
  });

// @desc Create new accommodation
// @route POST /accommodations
// @access Private
const createNewAccommodation = asyncHandler(async (req, res) => {
    const { roomNumber, address, roomType, occupantType, numberOfOccupants, costPerBed, occupantIds } = req.body;
    console.log(req.body)
  
    if (!roomNumber || !address || !roomType || !occupantType || !numberOfOccupants || !costPerBed) {
      return res.status(400).json({ message: 'All fields are required' });
    } 
  
    const accommodation = new Accommodation({ roomNumber, address, roomType, occupantType, numberOfOccupants, costPerBed, occupants: occupantIds });
  
    await accommodation.save();
  
    res.status(201).json({ message: `New accommodation ${roomNumber} created`, accommodation });
  });

// @desc Update accommodation
// @route PATCH /accommodations/:id
// @access Private
const updateAccommodation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { roomNumber, address, roomType, occupantType, numberOfOccupants, costPerBed, occupantIds } = req.body;

    if (!id || !roomNumber || !address || !roomType || !occupantType || !numberOfOccupants || !costPerBed) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const accommodation = await Accommodation.findById(id);

    if (!accommodation) {
        return res.status(404).json({ message: 'Accommodation not found' });
    }

    accommodation.roomNumber = roomNumber;
    accommodation.address = address;
    accommodation.roomType = roomType;
    accommodation.occupantType = occupantType;
    accommodation.numberOfOccupants = numberOfOccupants;
    accommodation.costPerBed = costPerBed;
    accommodation.occupants = occupantIds;

    await accommodation.save();

    res.status(200).json({ message: `Accommodation ${roomNumber} updated successfully`, accommodation });
});
// @desc Delete accommodation
// @route DELETE /accommodations
// @access Private
const deleteAccommodation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(req.params);

  if (!id) {
    return res.status(400).json({ message: 'Accommodation ID is required' });
  }

  const accommodation = await Accommodation.findById(id).exec();

  if (!accommodation) {
    return res.status(404).json({ message: 'Accommodation not found' });
  }

  await accommodation.deleteOne();

  res.status(200).json({ message: `Accommodation ${accommodation.roomNumber} deleted successfully` });
});

module.exports = {
  getAccommodationById,
  getAllAccommodations,
  createNewAccommodation,
  updateAccommodation, 
  deleteAccommodation,
  getAvailableAccommodations,
};
