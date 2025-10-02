const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
};

const createGroup = {
  body: Joi.object().keys({
    name: Joi.string().required().min(1).max(100),
    description: Joi.string().optional().max(500),
    settings: Joi.object().keys({
      allowInvitations: Joi.boolean().default(true),
      requireApproval: Joi.boolean().default(false),
    }).optional(),
  }),
};

const updateGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().optional().min(1).max(100),
    description: Joi.string().optional().max(500),
  }).min(1),
};

const deleteGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
};

const updateGroupSettings = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    allowInvitations: Joi.boolean().optional(),
    requireApproval: Joi.boolean().optional(),
  }).min(1),
};

module.exports = {
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  updateGroupSettings,
};
