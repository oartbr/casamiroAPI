const Joi = require('joi');

const receiveCall = {
  params: Joi.object().keys({
    source: Joi.string().optional(),
  }),
};

module.exports = {
  receiveCall,
};
