const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
// const { roles, enumRoles } = require('../config/roles');
// const ApiError = require('../utils/ApiError');
// const httpStatus = require('http-status');

const notaSchema = mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    registeredAt: {
      type: Date,
      required: true,
    },
    purchaseDate: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'read', 'cannceled', 'flagged'],
    },
    processDate: {
      type: Date,
    },
    code: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
notaSchema.plugin(toJSON);
notaSchema.plugin(paginate);

notaSchema.pre('save', async function (next) {
  const nota = this;
  if (nota.isModified('password')) {
    nota.password = await bcrypt.hash(nota.password, 8);
  }
  next();
});

/**
 * @typedef Nota
 */
const Nota = mongoose.model('Nota', notaSchema);

module.exports = Nota;
