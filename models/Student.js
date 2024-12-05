const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {

    username: {
      type: String,
      required: true,
      unique: true
    },
    admissionNumber: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true 
    },

    agreementAccepted: { type: Boolean, default: false },

    agreementAcceptedDate: { type: Date },

    resetToken: { type: String },

    resetTokenExpiry: { type: Date },  
    
    mustChangePassword: { type: Boolean, default: false },

    refreshToken: { type: String },
    
    email: { 
      type: String,
      required: true,
      unique: true 
  },

  importantInformation: {
    type: String,
  },
    profile: {
      firstName: String,
      middleName: String,
      lastName: String,
      idNumber: String,
      dateOfBirth: String,
      gender: { type: String, enum: ['Male', 'Female', 'Other'] },
      homeLanguage: String,
      avatar: String,
      mobileNumber: String,
      cityAndGuildNumber: String,
      admissionDate: String,
      address: {
        street1: String,
        street2: String,
        city: String,
        province: String,
        country: String,
        postalCode: String,
      },
      postalAddress: {
        street1: String,
        street2: String,
        city: String,
        province: String,
        country: String,
        postalCode: String,
      },
    },
    campus: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campus',
      },
    ],
    intakeGroup: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IntakeGroup',
      },
    ],
    outcome: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outcome',
      },
    ],

    qualification: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Qualification',
      },
    ],
    assignments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignments',
      },
    ],
    
    alumni: {
      type: Boolean,
      default: false,
    },

    currentResult: {
      type: String,
      enum: ['Pass', 'Fail'],
      default: 'Fail',
    },
    
    guardians: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Guardian',
      },
    ],

    active: {
      type: Boolean,
      default: true,
    },
    inactiveReason: {
      type: String,
    },
    userType: {
      type: String,
      default: 'Student'
  }
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model('Student', studentSchema);
