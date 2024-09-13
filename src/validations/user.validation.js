const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    confirmEmail: Joi.string().valid(Joi.ref('email')).error(new Error('Emails must match')),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    address: Joi.string(),
    city: Joi.string(),
    zipcode: Joi.string(),
    phoneNumber: Joi.string(),
    policy: Joi.array().items({
      id: Joi.string(),
      name: Joi.string(),
    }),
    password: Joi.string().required(),
    passwordConfirmation: Joi.string(),
    role: Joi.object().keys({
      id: Joi.number(),
    }),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    orderBy: Joi.string(),
    sort: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.string(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
