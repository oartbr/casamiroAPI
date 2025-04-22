const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
// const ApiError = require('../utils/ApiError');
// const httpStatus = require('http-status');

const printSchema = mongoose.Schema(
  {
    url: {
      type: String,
      index: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    items: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Garantia',
      },
    ],
    printedAt: {
      type: Date,
      select: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
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
