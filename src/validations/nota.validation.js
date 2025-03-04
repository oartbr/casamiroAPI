const Joi = require('joi');
// const { objectId } = require('./custom.validation');

const checkNota = {
  body: Joi.object().keys({
    notaUrl: Joi.string(),
    userId: Joi.string(),
  }),
};

const getAll = {
  query: Joi.object().keys({
    user: Joi.string(),
    orderBy: Joi.string(),
    sort: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.string(),
  }),
};

const get = {
  query: Joi.object().keys({
    id: Joi.string(),
  }),
};

const loadNota = {
  body: Joi.object().keys({
    notaUrl: Joi.string(),
    userId: Joi.string(),
  }),
};

module.exports = {
  checkNota,
  getAll,
  loadNota,
  get,
};
