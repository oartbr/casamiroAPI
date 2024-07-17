const Joi = require('joi');

const createCheck = {
  body: Joi.object().keys({
    garantiaId: Joi.string().required(),
    confirmed: Joi.boolean(),
    count: Joi.number().required(),
    hash: Joi.string(),
    code: Joi.number(),
    countryCode: Joi.number(),
    phoneNumber: Joi.number(),
  }),
};

const confirmCode = {
  body: Joi.object().keys({
    code: Joi.number(),
    phoneNumber: Joi.number(),
    confirmed: Joi.boolean(),
    garantiaId: Joi.string(),
  }),
};

module.exports = {
  createCheck,
  confirmCode,
};
