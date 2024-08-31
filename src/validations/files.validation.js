const Joi = require('joi');

const postFile = {
  body: Joi.object().keys({
    file: Joi.binary(),
  }),
  params: Joi.object().keys({
    folder: Joi.string(),
  }),
};

module.exports = {
  postFile,
};
