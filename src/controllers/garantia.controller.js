const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { garantiaService } = require('../services');
const CodeGenerator = require('../utils/generator');

const create = catchAsync(async (req, res) => {
  const aGarantias = new CodeGenerator(req.body.length, req.body.type, req.body.prefix);
  aGarantias.create(req.body.quantity);
  aGarantias.collection.forEach(async (code) => {
    const newGarantia = await garantiaService.create({ garantiaId: code, brand: '', description: '', sku: '' });
  });
  res.status(httpStatus.CREATED).send(aGarantias.collection);
});

const getAvailable = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['brand']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await garantiaService.queryGarantias(filter, options);
  res.send(result);
});

const getGarantias = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await garantiaService.queryGarantias(filter, options);
  res.send(result);
});

const getGarantia = catchAsync(async (req, res) => {
  const garantia = await garantiaService.getGarantiaById(req.params.garantiaId);
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'garantia not found');
  }
  res.send(garantia);
});

const updateGarantia = catchAsync(async (req, res) => {
  const garantia = await garantiaService.updateGarantiaById(req.params.garantiaId, req.body);
  res.send(garantia);
});

const deleteGarantia = catchAsync(async (req, res) => {
  await garantiaService.deleteGarantiaById(req.params.garantiaId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  create,
  getAvailable,
  getGarantia,
  getGarantias,
  updateGarantia,
  deleteGarantia,
};
