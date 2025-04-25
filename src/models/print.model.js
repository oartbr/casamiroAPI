const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
// const ApiError = require('../utils/ApiError');
// const httpStatus = require('http-status');

const printSchema = mongoose.Schema(
  {
    url: {
      type: String,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    items: [
      {
        type: String,
      },
    ],
    printedAt: {
      type: Date,
      select: true,
    },
    status: {
      type: String,
      enum: ['pending', 'created', 'processing', 'completed', 'printed', 'error'],
      default: 'pending',
      required: true,
    },
    quantity: {
      type: Number,
    },
    printId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // include virtuals (createdAt and updatedAt) in json output
  }
);

// add plugin that converts mongoose to json
printSchema.plugin(toJSON);

/**
 * @typedef Print
 */
const Print = mongoose.model('Print', printSchema);

module.exports = Print;
