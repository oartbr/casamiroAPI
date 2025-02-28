// const httpStatus = require('http-status');
const { Nota, User } = require('../models');
// const ApiError = require('../utils/ApiError');

/**
 * check a nota
 * @param {Object} notaBody
 * @returns {Promise<Sku>}
 */
const checkNota = async (notaBody) => {
  const exists = await Nota.findOne({ notaUrl: notaBody.notaUrl });

  // Find the user by userId
  const user = await User.findById(notaBody.userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (exists) {
    return exists; // if it already exists, return it (or should it be an error?)
  }

  const newNota = await Nota.create({
    url: notaBody.notaUrl,
    user: user._id,
    registeredAt: new Date(),
  });
  return newNota;
};

module.exports = {
  checkNota,
};
