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
    width: Joi.number().integer(),
    height: Joi.number().integer(),
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
    orderBy: Joi.string(),
    sort: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.string(),
  }),
};

const getSku = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const updateSku = {
  params: Joi.object().keys({
    id: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      skuId: Joi.string(),
      description: Joi.string(),
      category: Joi.string(),
      capacity: Joi.number().integer(),
      length: Joi.number(),
      width: Joi.number(),
      height: Joi.number(),
      weight: Joi.number(),
      material: Joi.string(),
      cost: Joi.number(),
      price: Joi.number(),
      brand: Joi.string(),
      madeOn: Joi.date(),
      madeIn: Joi.string(),
      output: Joi.string(),
      updatedAt: Joi.date(),
      id: Joi.string(), // this is just to allow the id to be passed in the body
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
