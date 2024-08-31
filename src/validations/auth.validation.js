const Joi = require('joi');
const { password } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    address: Joi.string(),
    city: Joi.string(),
    number: Joi.number(),
    zipcode: Joi.string(),
    policy: Joi.array().items({
      id: Joi.string().required(),
      name: Joi.string().required(),
    }),
    password: Joi.string().required(),
    phoneNumber: Joi.string().required(),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const getMe = {
  body: Joi.object().keys({
    firstName: Joi.string(),
    lastName: Joi.string(),
    photo: Joi.string(),
  }),
  headers: Joi.object({
    authorization: Joi.string(),
  }),
};

const patchMe = {
  body: Joi.object().keys({
    firstName: Joi.string(),
    lastName: Joi.string(),
    photo: Joi.string(),
  }),
  headers: Joi.object({
    authorization: Joi.string(),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getMe,
  patchMe,
};
