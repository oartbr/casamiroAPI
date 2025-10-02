const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
// const { roles, enumRoles } = require('../config/roles');
// const ApiError = require('../utils/ApiError');
// const httpStatus = require('http-status');

const groupSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: false, // Made optional for backward compatibility
    },
    ownerId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: false, // Made optional for backward compatibility
    },
    isPersonal: {
      type: Boolean,
      default: false,
    },
    settings: {
      allowInvitations: {
        type: Boolean,
        default: true,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json (but we'll override it)
groupSchema.plugin(paginate);

// Custom toJSON transform that includes createdAt and updatedAt
groupSchema.options.toJSON = {
  transform(doc, ret, options) {
    // Apply the standard transformations (remove __v, replace _id with id)
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    
    // Remove private fields
    Object.keys(groupSchema.paths).forEach((path) => {
      if (groupSchema.paths[path].options && groupSchema.paths[path].options.private) {
        const pathArray = path.split('.');
        let current = ret;
        for (let i = 0; i < pathArray.length - 1; i++) {
          current = current[pathArray[i]];
        }
        delete current[pathArray[pathArray.length - 1]];
      }
    });
    
    // Keep createdAt and updatedAt fields (don't delete them)
    // ret.createdAt and ret.updatedAt are already present from timestamps
    
    return ret;
  }
};

/**
 * @typedef Group
 */
const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
