const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  CNPJ: {
    type: String,
    required: true,
  },
  address: {
    street: { type: String, required: false },
    number: { type: String, required: false },
    neighborhood: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
  },
  gps: {
    latitude: { type: String, required: false },
    longitude: { type: String, required: false },
  },
});

// add plugin that converts mongoose to json
vendorSchema.plugin(toJSON);
vendorSchema.plugin(paginate);

vendorSchema.pre('save', async function (next) {
  const nota = this;
  if (nota.isModified('password')) {
    nota.password = await bcrypt.hash(nota.password, 8);
  }
  next();
});

/**
 * @typedef Vendor
 */
const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
