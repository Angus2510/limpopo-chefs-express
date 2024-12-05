const mongoose = require('mongoose');

const rolesSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  permissions: [{
    page: {
      type: String,
      required: true,
    },
    actions: {
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
}, {
  timestamps: true,
});

module.exports = mongoose.model('Roles', rolesSchema);