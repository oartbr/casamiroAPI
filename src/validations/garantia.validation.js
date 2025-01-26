const Joi = require('joi');
const { objectId } = require('./custom.validation');

const create = {
  body: Joi.object().keys({
    quantity: Joi.number().required(),
    length: Joi.number().required(),
    prefix: Joi.string().required(),
    type: Joi.string(),
  }),
};

const getAvailable = {
  query: Joi.object().keys({
    brand: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getGarantias = {
  query: Joi.object().keys({
    owner: Joi.string(),
    role: Joi.string(),
    orderBy: Joi.string(),
    sort: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.string(),
  }),
};

const getGarantia = {
  params: Joi.object().keys({
    garantiaId: Joi.string(),
    userId: Joi.string(),
  }),
};

const assignGarantia = {
  params: Joi.object().keys({
    garantiaId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      brand: Joi.string().required(),
      builtOn: Joi.string().required(),
      description: Joi.string().required(),
      sku: Joi.string().required(),
    })
    .min(1),
};

const distributeGarantia = {
  params: Joi.object().keys({
    garantiaId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      reseller: Joi.string().required(),
      shippedDate: Joi.date().required(),
    })
    .min(1),
};

const sellGarantia = {
  params: Joi.object().keys({
    garantiaId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      soldTo: Joi.string().required(),
      soldDate: Joi.date().required(),
    })
    .min(1),
};

const updateGarantia = {
  params: Joi.object().keys({
    garantiaId: Joi.required(),
  }),
  body: Joi.object()
    .keys({
      garantiaId: Joi.string(),
      brand: Joi.string().required(),
      createdAt: Joi.string(),
      updateddAt: Joi.string(),
      assignedAt: Joi.string(),
      registeredAt: Joi.string(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      description: Joi.string().required(),
      owner: Joi.string(),
      sku: Joi.string().required(),
      soldTo: Joi.string(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      zipcode: Joi.string().required(),
      phoneNumber: Joi.string(),
      number: Joi.number().required(),
    })
    .min(1),
};

const deleteGarantia = {
  params: Joi.object().keys({
    garantiaId: Joi.string(),
  }),
};

const assign = {
  body: Joi.object().keys({
    garantiaId: Joi.string().required(),
    brand: Joi.string().required(),
    description: Joi.string().required(),
    sku: Joi.string().required(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    garantiaId: Joi.string(),
  }),
};

const getList = {
  params: Joi.object().keys({
    garantiaId: Joi.string(),
  }),
};

const getListByUser = {
  params: Joi.object().keys({
    userId: Joi.string(),
  }),
};

const register = {
  body: Joi.object().keys({
    garantiaId: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    address: Joi.string().required(),
    number: Joi.number(),
    city: Joi.string().required(),
    zipcode: Joi.string().required(),
    email: Joi.string().required().email(),
    policy: Joi.array().required(),
    userId: Joi.string().required(),
    phoneNumber: Joi.string().required(),
  }),
};

module.exports = {
  create,
  assign,
  getAvailable,
  getGarantias,
  getGarantia,
  assignGarantia,
  distributeGarantia,
  sellGarantia,
  updateGarantia,
  deleteGarantia,
  getUser,
  getList,
  getListByUser,
  register,
};
