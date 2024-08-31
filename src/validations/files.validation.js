const Joi = require('joi');

const postFile = {
  body: Joi.object().keys({
    file: Joi.binary(),
  }),
  query: Joi.object().keys({
    fileName: Joi.string(),
  }),
};

module.exports = {
  postFile,
};
