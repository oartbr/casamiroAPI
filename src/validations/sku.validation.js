const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createSku = {
  body: Joi.object().keys({
    skuId: Joi.string(),
    name: Joi.string(),
    description: Joi.string(),
    category: Joi.string(),
    capacity: Joi.number().integer(),
    length: Joi.number().integer(),
    width: Joi.string(),
    height: Joi.string(),
    weight: Joi.number().integer(),
    material: Joi.string(),
    cost: Joi.number().integer(),
    price: Joi.number().integer(),
    brand: Joi.string(),
    madeOn: Joi.date(),
    madeIn: Joi.string(),
  }),
};

const getSkus = {
  query: Joi.object().keys({
    category: Joi.string(),
    capacity: Joi.number().integer(),
  }),
};

const getSku = {
  params: Joi.object().keys({
    skuId: Joi.string().custom(objectId),
  }),
};

const updateSku = {
  params: Joi.object().keys({
    skuId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      category: Joi.string(),
      capacity: Joi.number().integer(),
      length: Joi.number().integer(),
      width: Joi.string(),
      height: Joi.string(),
      weight: Joi.number().integer(),
      material: Joi.string(),
      cost: Joi.number().integer(),
      price: Joi.number().integer(),
      brand: Joi.string(),
      madeOn: Joi.date(),
      madeIn: Joi.string(),
    })
    .min(1),
};

const deleteSku = {
  params: Joi.object().keys({
    skuId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createSku,
  getSkus,
  getSku,
  updateSku,
  deleteSku,
};
