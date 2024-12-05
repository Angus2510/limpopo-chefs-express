const Event = require('../models/Event');
const mongoose = require('mongoose');

const getAllEvents = async (req, res) => {
  try {
    console.log("Attempting to retrieve events...");
    const events = await Event.find()
      .populate('location')
      .populate('assignedTo')
      .populate('createdBy')
      .exec();

    if (!events || events.length === 0) {
      console.log("No events found.");
      return res.status(404).json({ message: 'No events found' });
    }

    console.log("Events retrieved successfully.");
    res.status(200).json(events);
  } catch (error) {
    console.error('Error retrieving events:', error);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
};

const createEvent = async (req, res) => {
  console.log(req.body)
  try {
    console.log('Incoming request body:', req.body); // Log the incoming request body

    const { title, type, details, startDate, endDate, allDay, assignedTo, assignedToModel, createdBy, color, location } = req.body;

    if (!title || !startDate || !createdBy) {
      console.error('Missing required fields'); // Log the error for missing fields
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const newEvent = new Event({
      title,
      type,
      details,
      startDate,
      endDate: allDay ? null : endDate, 
      allDay,
      assignedTo,
      assignedToModel,
      createdBy,
      color,
      location,
    });

    console.log('New event object:', newEvent); // Log the new event object before saving

    await newEvent.save();
    console.log('Event saved successfully:', newEvent); // Log successful save
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error); // Log the error with context
    res.status(500).json({ error: 'Failed to create event' });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('assignedTo')
      .populate('createdBy')
      .populate('location')
      .exec();
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve event' });
  }
};

const updateEvent = async (req, res) => {
  console.log(req.body)
  try {
    const { title, details, startDate, endDate, assignedTo, assignedToModel, createdBy, color, location } = req.body;
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { title, details, startDate, endDate, assignedTo, assignedToModel, createdBy, color, location },
      { new: true, runValidators: true }
    ).populate('assignedTo')
     .populate('createdBy')
     .populate('location')
     .exec();

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

module.exports = {
  getAllEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
};
