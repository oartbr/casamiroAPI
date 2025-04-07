const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
// const { whatsTypes } = require('../config/whats');
// const ApiError = require('../utils/ApiError');
// const httpStatus = require('http-status');

const whatsSchema = mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    threadId: { type: String, required: true },
    lastReply: { type: String },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
whatsSchema.plugin(toJSON);

/**
 * @typedef Whats
 */
const Whats = mongoose.model('Whats', whatsSchema);

module.exports = Whats;