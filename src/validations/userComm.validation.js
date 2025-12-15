const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getUserContext = {
  query: Joi.object().keys({
    phoneNumber: Joi.alternatives().try(Joi.string().required(), Joi.number().required()).required().messages({
      'any.required': 'Phone number is required',
    }),
  }),
};

const addItemsToList = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    phoneNumber: Joi.alternatives().try(Joi.string().required(), Joi.number().required()).required(),
    items: Joi.array().items(Joi.string().trim().min(1).max(500).required()).min(1).required().messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items array is required',
    }),
  }),
};

const removeItemsFromList = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    phoneNumber: Joi.alternatives().try(Joi.string().required(), Joi.number().required()).required(),
    items: Joi.array().items(Joi.string().trim().min(1).max(500).required()).min(1).required().messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items array is required',
    }),
  }),
};

const getListById = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    phoneNumber: Joi.alternatives().try(Joi.string().required(), Joi.number().required()).required().messages({
      'any.required': 'Phone number is required',
    }),
  }),
};

module.exports = {
  getUserContext,
  addItemsToList,
  removeItemsFromList,
  getListById,
};
