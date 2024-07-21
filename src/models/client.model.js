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
      type: String,
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
