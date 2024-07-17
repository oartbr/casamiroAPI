const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const checkPhoneNumberSchema = mongoose.Schema(
  {
    garantiaId: {
      type: String,
      required: true,
      index: true,
      unique: true,
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
 * Check if code matches the phoneNumber
 * @param {number} code - The code
 * @param {poneNumber} phoneNumber - phoneNumber
 * @param {garantiaId} garantiaId - garantiaId
 * @returns {Promise<boolean>}
 */
checkPhoneNumberSchema.statics.confirmCode = async function (phoneNumber, code, garantiaId) {
  const check = await this.findOne({phoneNumber, code, garantiaId});

  if( check === null){
    await this.findOne({garantiaId}).updateOne({$inc: {count: 1}});
  }
  return !!check;
};

/**
 * @typedef Token
 */
const CheckPhoneNumber = mongoose.model('CheckPhoneNumber', checkPhoneNumberSchema);

module.exports = CheckPhoneNumber;
