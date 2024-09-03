const Joi = require('joi');

const getQRcode = {
  params: Joi.object().keys({
    url: Joi.string(),
  }),
};

module.exports = {
  getQRcode,
};
