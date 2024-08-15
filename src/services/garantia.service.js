const httpStatus = require('http-status');
const { Garantia } = require('../models');
const { CheckPhoneNumber } = require('../models');
const { User } = require('../models');
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
    garantia.assignedAt = Date.now();

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
  //console.log({garantiaTESTE: garantia});
  return garantia;
};

/**
 * Query for garantia by userId
 * @param {Object} userId
 * @returns {Promise<QueryResult>}
 */
const getGarantiasByUserId = async (userId) => {
  const garantias = await Garantia.getGarantiasByUserId(userId);
  return garantias;
};

/**
 * Query for user
 * @param {Object} filter - Mongo filter
 * @returns {Promise<User>}
 */
const getUserByGarantiaId = async (garantiaId) => {
  const { phoneNumber, confirmed } = await CheckPhoneNumber.getCheckById(garantiaId);

  // console.log({ phoneNumber, confirmed });

  if (confirmed === true && phoneNumber !== null) {
    const user = await User.getUserByPhoneNumber(phoneNumber);
    return user;
  }

  return false;
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
 * Register garantia - this needs to register a new user and link it to the garantia
 * @param {ObjectId} userData
 * @returns {Promise<garantia>}
 */
const register = async (userData) => {
  const garantia = await Garantia.getGarantiaById(userData.garantiaId);

  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantia not found');
  }

  // const checkPhoneNumber = await CheckPhoneNumber.getCheckById(userData.garantiaId);
  // userData.phoneNumber = checkPhoneNumber.phoneNumber;
  // userData.checkPhoneNumber = checkPhoneNumber._id;

  const user = await User.findOne({ _id: userData.userId });

  /* if (!user) {
    const user = await User.create(userData);
  } */

  if (user) {
    garantia.status = 'registered';
    garantia.userId = user._id;
    garantia.registeredAt = Date.now();

    // Add the new fields from userData to garantia
    garantia.policy = userData.policy;
    garantia.email = userData.email;
    garantia.address = userData.address;
    garantia.city = userData.city;
    garantia.firstName = userData.firstName;
    garantia.lastName = userData.lastName;
    garantia.number = userData.number;
    garantia.phoneNumber = userData.phoneNumber;
    garantia.zipcode = userData.zipcode;



    await garantia.save();
  }

  return garantia.populate('usertId').execPopulate();
};

module.exports = {
  create,
  assign,
  getGarantiaById,
  queryGarantias,
  updateGarantiaById,
  deleteGarantiaById,
  getUserByGarantiaId,
  getGarantiasByUserId,
  register,
};
