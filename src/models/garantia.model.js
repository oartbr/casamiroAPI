const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');

const garantiaSchema = mongoose.Schema(
  {
    brand: {
      type: String,
      trim: true,
    },
    builtOn: {
      type: String,
      trim: true,
    },
    garantiaId: {
      type: String,
      required: true,
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
      required: false,
      trim: true,
    },
    shippedDate: {
      type: Date,
      required: false,
    },
    soldTo: {
      type: String,
      required: false,
      trim: true,
    },
    soldDate: {
      type: Date,
      required: false,
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
  const garantia = await this.findOne(garantiaId);
  return !!garantia;
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
