const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const clientSchema = mongoose.Schema(
  {
    checkPhoneNumber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CheckPhoneNumber',
      // to-do: make this required: true,
    },
    phoneNumber: {
      type: Number,
      // to-do: make this required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: false,
    },
    number: {
      type: Number,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    zipcode: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    policy: {
      type: Object,
      default: false,
    },
    password: { 
      type: String, 
      required: true, 
      trim: true, 
      minlength: 6 },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
clientSchema.plugin(toJSON);
clientSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The client's email
 * @param {ObjectId} [excludeclientId] - The id of the client to be excluded
 * @returns {Promise<boolean>}
 */
clientSchema.statics.isEmailTaken = async function (email, excludeclientId) {
  const client = await this.findOne({ email, _id: { $ne: excludeclientId } });
  return !!client;
};

/**
 * Get if email is taken
 * @param {string} email - The client's email
 * @returns {Promise<boolean>}
 */
clientSchema.statics.getClientByEmail = async function (email) {
  const client = await this.findOne({ email });

  if (client === null) {
    return false;
  }
  return client;
};

/**
 * Get client by Id
 * @param {string} clientId - The client's id
 * @returns {Promise<Client>}
 */
clientSchema.statics.getClientById = async function (clientId) {
  const client = await this.findOne({ _id: clientId }).select('-policy -password -checkPhoneNumber');

  if (client === null) {
    return null;
  }
  return client;
};

/**
 * Get client by phoneNumber
 * @param {string} clientId - The client's phoneNumber
 * @returns {Promise<Client>}
 */
clientSchema.statics.getClientByPhoneNumber = async function (phoneNumber) {
  const client = await this.findOne({ phoneNumber }).select('-policy -password -checkPhoneNumber');
  console.log({ phoneNumber });
  if (client === null) {
    return null;
  }
  return client;
};

/**
 * Check if password matches the client's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
clientSchema.methods.isPasswordMatch = async function (password) {
  const client = this;
  return bcrypt.compare(password, client.password);
};

clientSchema.pre('save', async function (next) {
  const client = this;
  if (client.isModified('password')) {
    client.password = await bcrypt.hash(client.password, 8);
  }
  next();
});

/**
 * @typedef Client
 */
const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
