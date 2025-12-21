const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getOnboardingStatus = {
  params: Joi.object().keys({
    userId: Joi.string().required().custom(objectId),
  }),
};

const updateOnboardingContext = {
  params: Joi.object().keys({
    userId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object().keys({
    context: Joi.string().required().valid('casa', 'casal', 'republica', 'escritorio', 'condominio'),
  }),
};

const completeOnboarding = {
  params: Joi.object().keys({
    userId: Joi.string().required().custom(objectId),
  }),
};

const checkUserActivation = {
  params: Joi.object().keys({
    userId: Joi.string().required().custom(objectId),
  }),
};

module.exports = {
  getOnboardingStatus,
  updateOnboardingContext,
  completeOnboarding,
  checkUserActivation,
};

