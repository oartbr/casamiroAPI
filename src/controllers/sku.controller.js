const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { skuService } = require('../services');

const createSku = catchAsync(async (req, res) => {
  // console.log({body: req.body});
  const sku = await skuService.createSku(req.body);

  res.status(httpStatus.CREATED).send(sku);
});

const getSkus = catchAsync(async (req, res) => {
  // const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sort', 'limit', 'page']);
  const filter = pick(req.query, ['filters']);
  // console.log({req: req.query, filter, options});
  const result = await skuService.querySkus(filter, options);
  res.send(result);
});

const getSku = catchAsync(async (req, res) => {
  const sku = await skuService.getSkuById(req.params.id);
  if (!sku) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sku not found');
  }
  res.send({ sku });
});

const updateSku = catchAsync(async (req, res) => {
  const sku = await skuService.updateSkuById(req.params.id, req.body);
  res.send(sku);
});

const deleteSku = catchAsync(async (req, res) => {
  const sku = await skuService.deleteSkuById(req.params.skuId);
  res.status(httpStatus.OK).send({ message: `Sku ${sku.skuId} successfully deleted` });
});

module.exports = {
  createSku,
  getSkus,
  getSku,
  updateSku,
  deleteSku,
};
