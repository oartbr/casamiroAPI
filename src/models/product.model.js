const mongoose = require('mongoose');
// const validator = require('validator');
// const bcrypt = require('bcryptjs');
// const { toJSON, paginate } = require('./plugins');

const product = new mongoose.Schema({
  product: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
  },
  quantity: {
    type: Number,
  },
  unitPrice: {
    type: Number,
  },
  totalPrice: {
    type: Number,
  },
  purchaseDate: {
    type: Date,
  },
  date: {
    type: Date,
  },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, // Reference the Vendor schema
  nota: { type: mongoose.Schema.Types.ObjectId, ref: 'Nota' }, // Reference the Nota schema
});

/**
 * @typedef Product
 */
const Product = mongoose.model('Product', product);

module.exports = Product;
