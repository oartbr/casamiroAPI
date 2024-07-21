const httpStatus = require('http-status');
const { CheckPhoneNumber } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a checkPhoneNumber
 * @param {Object} checkBody
 * @returns {Promise<User>}
 */
const createCheck = async (checkBody) => {
  if (await CheckPhoneNumber.isEmailTaken(checkBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return CheckPhoneNumber.create(checkBody);
};

/**
 * Get check by id
 * @param {String} garantiaId
 *  @param {Object} filter - Mongo filter
 * @returns {Promise<garantia>}
 */
const getCheckById = async (garantiaId) => {
  return CheckPhoneNumber.findOne({ garantiaId });
};



module.exports = {
  createCheck,
  getCheckById,
};
