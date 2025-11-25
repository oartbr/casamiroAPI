const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createInvitation = {
  body: Joi.object().keys({
    group_id: Joi.string().required().custom(objectId),
    invitee_phone: Joi.string().min(10).max(15).allow(null, '').optional(),
    invited_by: Joi.string().required().custom(objectId),
    role: Joi.string().valid('admin', 'editor', 'contributor').default('contributor'),
  }),
};

const acceptInvitation = {
  params: Joi.object().keys({
    token: Joi.string().required().min(32).max(64),
  }),
  body: Joi.object().keys({
    userId: Joi.string().required().custom(objectId),
  }),
};

const declineInvitation = {
  params: Joi.object().keys({
    token: Joi.string().required().min(32).max(64),
  }),
};

const getInvitationByToken = {
  params: Joi.object().keys({
    token: Joi.string().required().min(32).max(64),
  }),
};

const cancelInvitation = {
  params: Joi.object().keys({
    membershipId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object().keys({
    cancellerId: Joi.string().required().custom(objectId),
  }),
};

const resendInvitation = {
  params: Joi.object().keys({
    membershipId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object().keys({
    resenderId: Joi.string().required().custom(objectId),
  }),
};

const getGroupMemberships = {
  params: Joi.object().keys({
    groupId: Joi.string().required().custom(objectId),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('pending', 'active', 'declined', 'removed'),
  }),
};

const getUserMemberships = {
  params: Joi.object().keys({
    userId: Joi.string().required().custom(objectId),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('pending', 'active', 'declined', 'removed'),
  }),
};

const getMembership = {
  params: Joi.object().keys({
    membershipId: Joi.string().required().custom(objectId),
  }),
};

const updateRole = {
  params: Joi.object().keys({
    membershipId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object().keys({
    newRole: Joi.string().required().valid('admin', 'editor', 'contributor'),
    updaterId: Joi.string().required().custom(objectId),
  }),
};

const removeMember = {
  params: Joi.object().keys({
    membershipId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object().keys({
    removerId: Joi.string().required().custom(objectId),
  }),
};

const getPendingInvitations = {
  params: Joi.object().keys({
    groupId: Joi.string().required().custom(objectId),
  }),
};

module.exports = {
  createInvitation,
  acceptInvitation,
  declineInvitation,
  getInvitationByToken,
  cancelInvitation,
  resendInvitation,
  getGroupMemberships,
  getUserMemberships,
  getMembership,
  updateRole,
  removeMember,
  getPendingInvitations,
};
