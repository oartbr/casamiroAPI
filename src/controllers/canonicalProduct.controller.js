const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { canonicalProductService } = require('../services');

const createCanonicalProduct = catchAsync(async (req, res) => {
  const product = await canonicalProductService.createCanonicalProduct(req.body);
  res.status(httpStatus.CREATED).send({ product });
});

const getAll = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sort', 'limit', 'page']);
  const filter = pick(req.query, ['filters']);
  const result = await canonicalProductService.queryCanonicalProducts(filter, options);
  res.status(httpStatus.OK).send(result);
});

const getCanonicalProduct = catchAsync(async (req, res) => {
  const product = await canonicalProductService.getCanonicalProductById(req.params.id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CanonicalProduct not found');
  }
  res.send({ product });
});

const updateCanonicalProduct = catchAsync(async (req, res) => {
  const product = await canonicalProductService.updateCanonicalProductById(req.params.id, req.body);
  res.send({ product });
});

const deleteCanonicalProduct = catchAsync(async (req, res) => {
  await canonicalProductService.deleteCanonicalProductById(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const search = catchAsync(async (req, res) => {
  const { q: searchTerm } = req.query;
  const groupId = req.query.groupId || null;
  
  if (!searchTerm) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Search term is required');
  }

  const products = await canonicalProductService.searchCanonicalProducts(searchTerm, { groupId });
  res.status(httpStatus.OK).send({ products });
});

const createFromNotaItem = catchAsync(async (req, res) => {
  const { productData, useOpenAI = true } = req.body;
  const userId = req.user?.id || req.body.userId || 'system';
  const groupId = req.body.groupId || null;

  if (!productData) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Product data is required');
  }

  const product = await canonicalProductService.createOrUpdateFromNotaItem(productData, {
    userId,
    groupId,
    useOpenAI,
  });

  res.status(httpStatus.CREATED).send({ product });
});

module.exports = {
  createCanonicalProduct,
  getAll,
  getCanonicalProduct,
  updateCanonicalProduct,
  deleteCanonicalProduct,
  search,
  createFromNotaItem,
};

