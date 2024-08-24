const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { garantiaService } = require('../services');
// const { checkPhoneNumberService } = require('../services');
const CodeGenerator = require('../utils/generator');

const create = catchAsync(async (req, res) => {
  const aGarantias = new CodeGenerator(req.body.length, req.body.type, req.body.prefix);
  aGarantias.create(req.body.quantity);
  const newGarantias = [];
  await aGarantias.collection.forEach(async (code) => {
    const newGarantia = await garantiaService.create({ garantiaId: code, brand: '', description: '', sku: '' });

    newGarantias.push(newGarantia);

    if (newGarantia === false) {
      throw new ApiError(httpStatus.BAD_REQUEST, `An error occurred while creating the garantias: ${newGarantias.length}`);
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
  const options = pick(req.query, ['sort', 'limit', 'page']);
  const result = await garantiaService.queryGarantias(filter, options);
  res.send(result);
});

const getGarantia = catchAsync(async (req, res) => {
  const userId = typeof req.params.userId !== 'undefined' ? req.params.userId : false;
  const garantia = await garantiaService.getGarantiaById(req.params.garantiaId, userId);

  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantia not found');
  }
  res.send({ garantia });
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

const getUser = catchAsync(async (req, res) => {
  const user = await garantiaService.getUserByGarantiaId(req.params.garantiaId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const getList = catchAsync(async (req, res) => {
  const user = await garantiaService.getUserByGarantiaId(req.params.garantiaId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const garantias = await garantiaService.getGarantiasByUserId(user._id);

  res.send(garantias);
});

const getListByUser = catchAsync(async (req, res) => {
  const garantias = await garantiaService.getGarantiasByUserId(req.params.userId);

  if (!garantias) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found'); // to-do: check if the user exists, or inform there are not garantias for this user
  }

  res.send(garantias);
});

const register = catchAsync(async (req, res) => {
  const garantia = await garantiaService.register(req.body);

  res.status(httpStatus.OK).send(garantia);
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
  getUser,
  getList,
  getListByUser,
  register,
};
