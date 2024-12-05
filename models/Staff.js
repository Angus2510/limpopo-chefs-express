const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true 
  },

  email: {
    type: String,
    required: true,
    unique: true 
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
  
  profile: {
    firstName: String,
    middleName: String,
    lastName: String,
    employeeId: String,
    idNumber: String,
    passportNumber: String,
    dateOfBirth: String,
    qualification: [{ type: String }],
    workExperience: [{ type: String }],
    gender: String,	
    designation: String,
    maritalStatus: String,
    avatar: String,
    mobileNumber: String,
    emergencyContact: String,
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

  roles:[
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roles',
    },
  ],

  active: {
    type: Boolean,
    default: true,
  },
  userPermissions: [{
    page: {
      type: String,
    },
    permissions: {
      view: {
        type: Boolean,
        default: false,
      },
      edit: {
        type: Boolean,
        default: false,
      },
      upload: {
        type: Boolean,
        default: false,
      },
    },
  }],
  
  userType: {
    type: String,
    default: 'Staff'
}
},
{
  timestamps: true,
}
);

module.exports = mongoose.model('Staff', staffSchema);