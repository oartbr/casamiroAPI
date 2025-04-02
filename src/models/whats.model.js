const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
// const { whatsTypes } = require('../config/whats');
// const ApiError = require('../utils/ApiError');
// const httpStatus = require('http-status');

const whatsSchema = mongoose.Schema(
  {
    SmsMessageSid: {
      type: String,
    },
    NumMedia: {
      type: String,
    },
    ProfileName: {
      type: String,
    },
    MessageType: {
      type: String,
    },
    SmsSid: {
      type: String,
    },
    WaId: {
      type: String,
    },
    SmsStatus: {
      type: String,
    },
    Body: {
      type: String,
    },
    To: {
      type: String,
    },
    MessagingServiceSid: {
      type: String,
    },
    NumSegments: {
      type: String,
    },
    ReferralNumMedia: {
      type: String,
    },
    MessageSid: {
      type: String,
    },
    AccountSid: {
      type: String,
    },
    From: {
      type: String,
    },
    ApiVersion: {
      type: String,
    },
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