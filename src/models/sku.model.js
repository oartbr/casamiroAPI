const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
// const { roles, enumRoles } = require('../config/roles');
// const ApiError = require('../utils/ApiError');
// const httpStatus = require('http-status');

const skuSchema = mongoose.Schema(
  {
    skuId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      integer: true,
    },
    length: {
      type: Number,
      integer: true,
    },
    width: {
      type: String,
    },
    height: {
      type: String,
    },
    weight: {
      type: Number,
      integer: true,
    },
    material: {
      type: String,
    },
    cost: {
      type: Number,
    },
    price: {
      type: Number,
      integer: true,
    },
    brand: {
      type: String,
      integer: true,
    },
    madeOn: {
      type: Date,
    },
    madeIn: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
skuSchema.plugin(toJSON);
skuSchema.plugin(paginate);

skuSchema.pre('save', async function (next) {
  const sku = this;
  if (sku.isModified('password')) {
    sku.password = await bcrypt.hash(sku.password, 8);
  }
  next();
});

/**
 * @typedef Sku
 */
const Sku = mongoose.model('Sku', skuSchema);

module.exports = Sku;
