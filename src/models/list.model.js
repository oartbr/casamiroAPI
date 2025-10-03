const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

// List item subdocument schema
const listItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Item text is required'],
    trim: true,
    maxlength: 500,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  addedBy: {
    type: String,
    required: [true, 'Added by user firstName is required'],
  },
  completedBy: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
  },
  completedAt: {
    type: Date,
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Apply toJSON plugin to subdocument schema as well
listItemSchema.plugin(toJSON);

const listSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'List name is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    groupId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
    },
    settings: {
      allowItemDeletion: {
        type: Boolean,
        default: true,
      },
      requireApprovalForItems: {
        type: Boolean,
        default: false,
      },
    },
    items: [listItemSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
listSchema.index({ groupId: 1, isDefault: 1 }); // For querying lists by group and default status
listSchema.index({ groupId: 1, name: 1 }); // For querying lists by group and name
listSchema.index({ createdBy: 1 }); // For querying lists by creator

// Validation middleware to ensure only one default list per group
listSchema.pre('save', async function (next) {
  if (this.isDefault && this.isNew) {
    // Check if there's already a default list for this group
    const existingDefault = await mongoose.model('List').findOne({
      groupId: this.groupId,
      isDefault: true,
    });
    
    if (existingDefault) {
      // If we're setting this as default, remove default from existing
      existingDefault.isDefault = false;
      await existingDefault.save();
    }
  }
  next();
});

// add plugin that converts mongoose to json
listSchema.plugin(toJSON);
listSchema.plugin(paginate);

/**
 * @typedef List
 */
const List = mongoose.model('List', listSchema);

module.exports = List;


