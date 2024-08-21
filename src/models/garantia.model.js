const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const httpStatus = require('http-status');
const { toJSON, paginate } = require('./plugins');
const ApiError = require('../utils/ApiError');

const garantiaSchema = mongoose.Schema(
  {
    garantiaId: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    builtAt: {
      type: Date,
    },
    assignedAt: {
      type: Date,
    },
    shippedAt: {
      type: Date,
    },
    registeredAt: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    reseller: {
      type: String,
      trim: true,
    },
    soldTo: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ['created', 'assigned', 'shipped', 'delivered', 'cancelled', 'sold', 'registered'],
      default: 'created',
    },
    phoneNumber: {
      type: String,
      // to-do: make this required: true,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: false,
    },
    number: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    zipcode: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
garantiaSchema.plugin(toJSON);
garantiaSchema.plugin(paginate);

/**
 * Check if garantiaId is taken
 * @param {string} garantiaId - The garantia id
 * @returns {Promise<boolean>}
 */
garantiaSchema.statics.isGarantiaTaken = async function (garantiaId) {
  const garantia = await this.findOne({ garantiaId });

  return !!garantia;
};

/**
 * Get Garantia by garantiaId
 * @param {string} garantiaId - The garantia id
 * @returns {Promise<boolean>}
 */
garantiaSchema.statics.getGarantiaById = async function (garantiaId) {
  const garantia = await this.findOne({ garantiaId });
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantia not found');
  }

  return garantia;
};

/**
 * Get Garantia by userId
 * @param {string} userId - The user id
 * @returns {Promise<boolean>}
 */
garantiaSchema.statics.getGarantiasByUserId = async function (userId) {
  const garantias = await this.find({ userId }).sort({ registeredAt: -1 });
  if (!garantias) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantias not found for this user');
  }

  return garantias;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
garantiaSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

garantiaSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model('Garantia', garantiaSchema);

module.exports = User;
