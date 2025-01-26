const httpStatus = require('http-status');
const { Sku } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a sku
 * @param {Object} skuBody
 * @returns {Promise<Sku>}
 */
const createSku = async (skuBody) => {
  return Sku.create(skuBody);
};

/**
 * Query for skus
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const querySkus = async (filter, options) => {
  const newOptions = { ...options, sortBy: options.sortBy };
  const skus = await Sku.paginate(filter, newOptions);
  return skus;

  // console.log({ filterResults, adjustedOptions });
  // const skus = await Sku.paginate(filterResults, adjustedOptions);
  /*
  const parsedFilter = filter.filters ? JSON.parse(filter.filters) : { status: [] };
  const parsedSort = JSON.parse(options.sort);
  const filterResults =
    parsedFilter.roles && parsedFilter.roles.length > 0
      ? { 'role.id': parsedFilter.roles.map((item) => item.id) }
      : { 'role.id': [1, 2] };
  const adjustedOptions = {
    limit: parseInt(options.limit, 10),
    offset: (parseInt(options.page, 10) - 1) * parseInt(options.limit, 10),
    sortBy: parsedSort[0].order === 'desc' ? `{ -${parsedSort[0].orderBy}: -1 }` : `{ ${parsedSort[0].orderBy}: 1 }`,
  };
  
  const skus = await Sku.paginate(filterResults, adjustedOptions);
  skus.hasNextPage = skus.page < skus.totalPages;
  return skus; */
};

/**
 * Get sku by id
 * @param {ObjectId} id
 * @returns {Promise<Sku>}
 */
const getSkuById = async (id) => {
  return Sku.findById(id);
};

/**
 * Get sku by email
 * @param {string} email
 * @returns {Promise<Sku>}
 */
const getSkuByEmail = async (email) => {
  return Sku.findOne({ email });
};

/**
 * Update sku by id
 * @param {ObjectId} skuId
 * @param {Object} updateBody
 * @returns {Promise<Sku>}
 */
const updateSkuById = async (id, updateBody) => {
  const sku = await getSkuById(id);
  if (!sku) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sku not found');
  }

  Object.assign(sku, updateBody);
  await sku.save();
  return sku;
};

/**
 * Delete sku by id
 * @param {ObjectId} skuId
 * @returns {Promise<Sku>}
 */
const deleteSkuById = async (skuId) => {
  const sku = await getSkuById(skuId);
  if (!sku) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sku not found');
  }
  await sku.remove();
  return sku;
};

module.exports = {
  createSku,
  querySkus,
  getSkuById,
  getSkuByEmail,
  updateSkuById,
  deleteSkuById,
};
