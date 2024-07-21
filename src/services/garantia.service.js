const httpStatus = require('http-status');
const { Garantia } = require('../models');
const { CheckPhoneNumber } = require('../models');
const { Client } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a garantia
 * @param {Object} quantity
 * @returns {Promise<Garantia>}
 */
const create = async (garantiaId) => {
  if (await Garantia.isGarantiaTaken(garantiaId.garantiaId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Garantia already exists.');
  }

  const newGarantia = await Garantia.create(garantiaId);

  if (newGarantia === null) {
    return false;
  }
  return newGarantia;
};

/**
 * Assign garantia - this updates the garantia with the details of the actual product
 * @param {ObjectId} garantiaId
 * @param {String} brand
 * @param {string} description
 * @param {string} sku
 * @returns {Promise<garantia>}
 */
const assign = async (assignObj) => {
  const garantia = await Garantia.findOne({ garantiaId: assignObj.garantiaId });
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'garantia not found');
  } else {
    garantia.brand = assignObj.brand;
    garantia.description = assignObj.description;
    garantia.sku = assignObj.sku;
    garantia.status = 'assigned';
    await garantia.save();
  }

  return garantia;
};

/**
 * Query for garantia
 * @param {Object} filter - Mongo filter
 * @returns {Promise<QueryResult>}
 */
const getGarantiaById = async (garantiaId) => {
  const garantia = await Garantia.getGarantiaById(garantiaId);
  return garantia;
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
 * Update garantia by id
 * @param {ObjectId} garantiaId
 * @param {Object} updateBody
 * @returns {Promise<Garantia>}
 */
const updateGarantiaById = async (garantiaId, updateBody) => {
  const garantia = await Garantia.getGarantiaById(garantiaId);
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

/**
 * Register garantia - this needs to register a new client and link it to the garantia
 * @param {ObjectId} clientData
 * @returns {Promise<garantia>}
 */
const register = async (clientData) => {
  const garantia = await Garantia.getGarantiaById(clientData.garantiaId);
  const checkPhoneNumber = await CheckPhoneNumber.getCheckById(clientData.garantiaId);
  clientData.phoneNumber = checkPhoneNumber.phoneNumber;
  clientData.checkPhoneNumber = checkPhoneNumber._id;

  const client = await Client.getClientByEmail(clientData.email);
  if (!client) {
    const client = await Client.create(clientData);
  }

  if (client) {
    garantia.status = 'registered';
    garantia.clientId = client._id;
    await garantia.save();
  }
  // console.log({garantia, checkPhoneNumber, client});
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'garantia not found');
  }
  return garantia.populate('clientId').execPopulate();
};

module.exports = {
  create,
  assign,
  getGarantiaById,
  queryGarantias,
  updateGarantiaById,
  deleteGarantiaById,
  register,
};
