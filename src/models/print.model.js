const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
// const ApiError = require('../utils/ApiError');
// const httpStatus = require('http-status');

const printSchema = mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    items: {
      type: [String],
    },
    createdAt: {
      type: Date,
    },
    printedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
printSchema.plugin(toJSON);

/**
 * @typedef Print
 */
const Print = mongoose.model('Print', printSchema);

module.exports = Print;
