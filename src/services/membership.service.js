const httpStatus = require('http-status');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { Membership, User, Group } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a new membership invitation
 * @param {Object} membershipBody
 * @returns {Promise<Membership>}
 */
const createMembershipInvitation = async (membershipBody) => {
  const { group_id, invitee_phone, invited_by, role = 'contributor' } = membershipBody;

  // Validate that the group exists
  const group = await Group.findById(group_id);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }

  // Validate that the inviter exists and is a member of the group
  const inviterMembership = await Membership.findOne({
    group_id,
    user_id: invited_by,
    status: 'active',
  });
  if (!inviterMembership || !['admin', 'editor'].includes(inviterMembership.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions to invite users');
  }

  // Check if invitation already exists
  const existingInvitation = await Membership.findOne({
    group_id,
    invitee_phone,
    status: 'pending',
  });
  if (existingInvitation) {
    throw new ApiError(httpStatus.CONFLICT, 'Invitation already exists for this phone number');
  }

  // Check if user is already a member (by phone number)
  const existingUser = await User.findOne({ phoneNumber: invitee_phone });
  if (existingUser) {
    const existingMembership = await Membership.findOne({
      group_id,
      user_id: existingUser._id,
      status: 'active',
    });
    if (existingMembership) {
      throw new ApiError(httpStatus.CONFLICT, 'User is already a member of this group');
    }
  }

  // Generate unique invitation token
  const token = crypto.randomBytes(32).toString('hex');

  const membership = await Membership.create({
    group_id,
    invitee_phone,
    invited_by,
    role,
    token,
    status: 'pending',
  });

  return membership;
};

/**
 * Accept a membership invitation
 * @param {string} token - Invitation token
 * @param {string} userId - User ID accepting the invitation
 * @returns {Promise<Membership>}
 */
const acceptMembershipInvitation = async (token, userId) => {
  const membership = await Membership.findOne({ token, status: 'pending' });
  if (!membership) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invalid or expired invitation token');
  }

  // Check if invitation has expired
  if (membership.expiration_date && membership.expiration_date < new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invitation has expired');
  }

  // Update membership to active
  membership.user_id = userId;
  membership.status = 'active';
  membership.accepted_at = new Date();
  membership.token = undefined; // Remove token after acceptance
  membership.expiration_date = undefined; // Remove expiration after acceptance

  await membership.save();
  return membership;
};

/**
 * Decline a membership invitation
 * @param {string} token - Invitation token
 * @returns {Promise<Membership>}
 */
const declineMembershipInvitation = async (token) => {
  const membership = await Membership.findOne({ token, status: 'pending' });
  if (!membership) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invalid or expired invitation token');
  }

  membership.status = 'declined';
  membership.token = undefined;
  membership.expiration_date = undefined;

  await membership.save();
  return membership;
};

/**
 * Get membership by ID
 * @param {ObjectId} id
 * @returns {Promise<Membership>}
 */
const getMembershipById = async (id) => {
  const membership = await Membership.findById(id)
    .populate('user_id', 'firstName lastName email')
    .populate('group_id', 'name')
    .populate('invited_by', 'firstName lastName email');
  
  if (!membership) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Membership not found');
  }
  
  return membership;
};

/**
 * Get all memberships for a specific group
 * @param {ObjectId} groupId
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getGroupMemberships = async (groupId, options = {}) => {
  const { limit = 10, page = 1, status } = options;
  
  const filter = { group_id: groupId };
  if (status) {
    filter.status = status;
  }

  const memberships = await Membership.find(filter)
    .populate('user_id', 'firstName lastName email')
    .populate('invited_by', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Membership.countDocuments(filter);

  return {
    memberships,
    total,
    page: page * 1,
    limit: limit * 1,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get all memberships for a specific user
 * @param {ObjectId} userId
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getUserMemberships = async (userId, options = {}) => {
  const { limit = 10, page = 1, status } = options;
  
  const filter = { user_id: userId };
  if (status) {
    filter.status = status;
  }

  const memberships = await Membership.find(filter)
    .populate('group_id', 'name')
    .populate('invited_by', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Membership.countDocuments(filter);

  return {
    memberships,
    total,
    page: page * 1,
    limit: limit * 1,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Update membership role
 * @param {ObjectId} membershipId
 * @param {string} newRole
 * @param {ObjectId} updaterId - ID of user making the change
 * @returns {Promise<Membership>}
 */
const updateMembershipRole = async (membershipId, newRole, updaterId) => {
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Membership not found');
  }

  // Check if updater has permission to change roles
  const updaterMembership = await Membership.findOne({
    group_id: membership.group_id,
    user_id: updaterId,
    status: 'active',
  });

  if (!updaterMembership || updaterMembership.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can change member roles');
  }

  // Prevent admin from changing their own role if they're the only admin
  if (membership.user_id.toString() === updaterId.toString() && membership.role === 'admin') {
    const adminCount = await Membership.countDocuments({
      group_id: membership.group_id,
      role: 'admin',
      status: 'active',
    });
    if (adminCount <= 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot change role: group must have at least one admin');
    }
  }

  membership.role = newRole;
  await membership.save();
  
  return membership;
};

/**
 * Remove a member from a group
 * @param {ObjectId} membershipId
 * @param {ObjectId} removerId - ID of user removing the member
 * @returns {Promise<Membership>}
 */
const removeMember = async (membershipId, removerId) => {
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Membership not found');
  }

  // Check if remover has permission
  const removerMembership = await Membership.findOne({
    group_id: membership.group_id,
    user_id: removerId,
    status: 'active',
  });

  if (!removerMembership || removerMembership.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can remove members');
  }

  // Prevent admin from removing themselves if they're the only admin
  if (membership.user_id.toString() === removerId.toString() && membership.role === 'admin') {
    const adminCount = await Membership.countDocuments({
      group_id: membership.group_id,
      role: 'admin',
      status: 'active',
    });
    if (adminCount <= 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot remove yourself: group must have at least one admin');
    }
  }

  membership.status = 'removed';
  await membership.save();
  
  return membership;
};

/**
 * Cancel a pending invitation
 * @param {ObjectId} membershipId
 * @param {ObjectId} cancellerId - ID of user cancelling the invitation
 * @returns {Promise<Membership>}
 */
const cancelInvitation = async (membershipId, cancellerId) => {
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Membership not found');
  }

  if (membership.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Can only cancel pending invitations');
  }

  // Check if canceller has permission
  const cancellerMembership = await Membership.findOne({
    group_id: membership.group_id,
    user_id: cancellerId,
    status: 'active',
  });

  if (!cancellerMembership || !['admin', 'editor'].includes(cancellerMembership.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions to cancel invitations');
  }

  // Only allow canceller to cancel their own invitations, or admins to cancel any
  if (membership.invited_by.toString() !== cancellerId.toString() && cancellerMembership.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Can only cancel your own invitations');
  }

  membership.status = 'declined';
  membership.token = undefined;
  membership.expiration_date = undefined;
  await membership.save();
  
  return membership;
};

/**
 * Resend invitation (creates new token and extends expiration)
 * @param {ObjectId} membershipId
 * @param {ObjectId} resenderId - ID of user resending the invitation
 * @returns {Promise<Membership>}
 */
const resendInvitation = async (membershipId, resenderId) => {
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Membership not found');
  }

  if (membership.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Can only resend pending invitations');
  }

  // Check if resender has permission
  const resenderMembership = await Membership.findOne({
    group_id: membership.group_id,
    user_id: resenderId,
    status: 'active',
  });

  if (!resenderMembership || !['admin', 'editor'].includes(resenderMembership.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions to resend invitations');
  }

  // Generate new token and extend expiration
  membership.token = crypto.randomBytes(32).toString('hex');
  membership.expiration_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await membership.save();
  
  return membership;
};

/**
 * Get pending invitations for a group
 * @param {ObjectId} groupId
 * @returns {Promise<Membership[]>}
 */
const getPendingInvitations = async (groupId) => {
  return Membership.find({
    group_id: groupId,
    status: 'pending',
  }).populate('invited_by', 'firstName lastName email');
};

/**
 * Clean up expired invitations
 * @returns {Promise<number>} Number of expired invitations removed
 */
const cleanupExpiredInvitations = async () => {
  const result = await Membership.deleteMany({
    status: 'pending',
    expiration_date: { $lt: new Date() },
  });
  
  return result.deletedCount;
};

module.exports = {
  createMembershipInvitation,
  acceptMembershipInvitation,
  declineMembershipInvitation,
  getMembershipById,
  getGroupMemberships,
  getUserMemberships,
  updateMembershipRole,
  removeMember,
  cancelInvitation,
  resendInvitation,
  getPendingInvitations,
  cleanupExpiredInvitations,
};
