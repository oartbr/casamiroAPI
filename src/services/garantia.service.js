const httpStatus = require('http-status');
const { Garantia } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a garantia
 * @param {Object} quantity
 * @returns {Promise<Garantia>}
 */
const create = async (garantiaId) => {
  if (await Garantia.isGarantiaTaken(garantiaId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Garantia already exists.');
  }
  return Garantia.create(garantiaId);
};

/**
 * Query for garantias
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryGarantias = async (filter, options) => {
  const garantias = await Garantia.paginate(filter, options);
  return garantias;
};

/**
 * Get garantia by id
 * @param {ObjectId} id
 *  @param {Object} filter - Mongo filter
 * @returns {Promise<garantia>}
 */
const getGarantiaById = async (id) => {
  console.log({garantiaId: id });
  return Garantia.findOne({garantiaId: id});
};

/**
 * Update garantia by id
 * @param {ObjectId} garantiaId
 * @param {Object} updateBody
 * @returns {Promise<Garantia>}
 */
const updateGarantiaById = async (garantiaId, updateBody) => {
  const garantia = await getGarantiaById(garantiaId);
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'garantia not found');
  }
  if (updateBody.email && (await garantia.isEmailTaken(updateBody.email, garantiaId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(garantia, updateBody);
  await garantia.save();
  return garantia;
};

/**
 * Delete garantia by id
 * @param {ObjectId} garantiaId
 * @returns {Promise<garantia>}
 */
const deleteGarantiaById = async (garantiaId) => {
  const garantia = await getGarantiaById(garantiaId);
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'garantia not found');
  }
  await garantia.remove();
  return garantia;
};

module.exports = {
  create,
  queryGarantias,
  getGarantiaById,
  updateGarantiaById,
  deleteGarantiaById,
};
