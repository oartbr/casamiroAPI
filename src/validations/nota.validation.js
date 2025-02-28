const Joi = require('joi');
// const { objectId } = require('./custom.validation');

const checkNota = {
  body: Joi.object().keys({
    notaUrl: Joi.string(),
    userId: Joi.string(),
  }),
};

module.exports = {
  checkNota,
};
