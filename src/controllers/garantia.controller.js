const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { garantiaService } = require('../services');
const { checkPhoneNumberService } = require('../services');
const CodeGenerator = require('../utils/generator');

const create = catchAsync(async (req, res) => {
  const aGarantias = new CodeGenerator(req.body.length, req.body.type, req.body.prefix);
  aGarantias.create(req.body.quantity);
  const newGarantias = [];
  await aGarantias.collection.forEach(async (code) => {
    const newGarantia = await garantiaService.create({ garantiaId: code, brand: '', description: '', sku: '' });

    newGarantias.push(newGarantia);

    if(newGarantia === false){
      throw new ApiError(httpStatus.BAD_REQUEST , 'An error occurred while creating the garantias: ' + newGarantias.length);
    }
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
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantia not found');
  }
  res.send(garantia);
});

const assign = catchAsync(async (req, res) => {
  const garantia = await garantiaService.getGarantiaById(req.body.garantiaId);
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantia not found');
  } else if (
    garantia.status === 'assigned' ||
    garantia.status === 'shipped' ||
    garantia.status === 'delivered' ||
    garantia.status === 'cancelled' ||
    garantia.status === 'sold' ||
    garantia.status === 'registered'
  ) {
    throw new ApiError(httpStatus.LOCKED, 'Garantia already assigned');
  }
  const assignAction = await garantiaService.assign(req.body);
  // console.log({ assign: assignAction });
  res.status(httpStatus.ACCEPTED).send(assignAction);
});

const OLDregister = catchAsync(async (req, res) => {
  const garantia = await garantiaService.getGarantiaById(req.body.garantiaId);
  const checkPhoneNumber = await checkPhoneNumberService.getCheckById(req.body.garantiaId);
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantia not found');
  } else if (garantia.status === 'registered') {
    throw new ApiError(httpStatus.LOCKED, 'Garantia already registered');
  } else if (!checkPhoneNumber || !checkPhoneNumber.confirmed) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Phone number is not registered');
  }
  // todo: check if garantia is already registered
  console.log({ req: req.body, garantia, checkPhoneNumber });
  res.send({ req: req.body, garantia, checkPhoneNumber });
});

const register = catchAsync(async (req, res) => {
  const garantia = await garantiaService.register(req.body);

  res.status(httpStatus.ACCEPTED).send(garantia); 
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
  assign,
  getAvailable,
  getGarantia,
  getGarantias,
  updateGarantia,
  deleteGarantia,
  register,
};
