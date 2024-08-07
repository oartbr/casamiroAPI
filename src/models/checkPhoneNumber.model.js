const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const checkPhoneNumberSchema = mongoose.Schema(
  {
    garantiaId: {
      type: String,
      default: "pending",
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    count: {
      type: Number,
      default: 0,
    },
    hash: {
      type: String,
      trim: true,
    },
    code: {
      type: Number,
      default: false,
    },
    countryCode: {
      type: Number,
    },
    phoneNumber: {
      type: Number,
      required: true,
      unique: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
checkPhoneNumberSchema.plugin(toJSON);

/**
 * Create a CheckPhoneNumber
 * @param {string} garantiaId - garantiaId
 * @returns {Promise<boolean>}
 */
checkPhoneNumberSchema.statics.createNewCheck = async function (data) {
  const newCheckPhoneNumber = await this.create(data);
  return !!newCheckPhoneNumber;
};

/**
 * Check if checkPhoneNumber exists
 * @param {string} garantiaId - garantiaId
 * @returns {Promise<boolean>}
 */
checkPhoneNumberSchema.statics.checkExists = async function (filter) {
  const check = await this.findOne(filter);
  return !!check;
};

/**
 * Get checkPhoneNumber by garantiaId
 * @param {string} garantiaId - garantiaId
 * @returns {Promise<boolean>}
 */
checkPhoneNumberSchema.statics.getCheckById = async function (garantiaId) {
  const check = await this.findOne({ garantiaId });
  if (check === null) {
    throw new ApiError(httpStatus.NOT_FOUND, `Phone number hasn't been checked.`);
  }
  return check;
};

/**
 * Check if code matches the phoneNumber
 * @param {number} code - The code
 * @param {garantiaId} garantiaId - garantiaId
 * @returns {Promise<boolean>}
 */
checkPhoneNumberSchema.statics.confirmCode = async function (code, garantiaId) {
  console.log({code, garantiaId});
  const check = await this.findOne({ code, garantiaId });
  if (check === null) {
    await this.findOne({ garantiaId }).updateOne({ $inc: { count: 1 } });
  } else if (check.confirmed === true) {
    return false;
  }
  return !!check;
};

/**
 * Check if code matches the phoneNumber
 * @param {number} code - The code
 * @param {garantiaId} garantiaId - garantiaId
 * @returns {Promise<boolean>}
 */
checkPhoneNumberSchema.statics.confirmCodeLogin = async function (code, phoneNumber) {
  const check = await this.findOne({ code, phoneNumber });
  if (check === null) {
    await this.findOne({ phoneNumber }).updateOne({ $inc: { count: 1 } });
  } else if (check.confirmed === true) {
    return false;
  }
  return !!check;
};

/**
 * @typedef Token
 */
const CheckPhoneNumber = mongoose.model('CheckPhoneNumber', checkPhoneNumberSchema);

module.exports = CheckPhoneNumber;
