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
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getGarantia = {
  params: Joi.object().keys({
    garantiaId: Joi.string(),
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
    garantiaId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      brand: Joi.string().required(),
      builtOn: Joi.string().required(),
      lastName: Joi.string().required(),
      garantiaID: Joi.string().required(),
      description: Joi.string().required(),
      owner: Joi.string().required(),
      sku: Joi.string().required(),
      soldTo: Joi.string().required(),
    })
    .min(1),
};

const deleteGarantia = {
  params: Joi.object().keys({
    garantiaId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  create,
  getAvailable,
  getGarantias,
  getGarantia,
  assignGarantia,
  distributeGarantia,
  sellGarantia,
  updateGarantia,
  deleteGarantia,
};
