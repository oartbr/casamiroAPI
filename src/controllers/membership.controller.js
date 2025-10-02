const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { membershipService } = require('../services');

/**
 * Create a membership invitation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createInvitation = catchAsync(async (req, res) => {
  const membership = await membershipService.createMembershipInvitation(req.body);
  res.status(httpStatus.CREATED).send(membership);
});

/**
 * Accept a membership invitation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const acceptInvitation = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { userId } = req.body;
  
  const membership = await membershipService.acceptMembershipInvitation(token, userId);
  res.status(httpStatus.OK).send(membership);
});

/**
 * Decline a membership invitation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const declineInvitation = catchAsync(async (req, res) => {
  const { token } = req.params;
  
  const membership = await membershipService.declineMembershipInvitation(token);
  res.status(httpStatus.OK).send(membership);
});

/**
 * Cancel a pending invitation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelInvitation = catchAsync(async (req, res) => {
  const { membershipId } = req.params;
  const { cancellerId } = req.body;
  
  const membership = await membershipService.cancelInvitation(membershipId, cancellerId);
  res.status(httpStatus.OK).send(membership);
});

/**
 * Resend an invitation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resendInvitation = catchAsync(async (req, res) => {
  const { membershipId } = req.params;
  const { resenderId } = req.body;
  
  const membership = await membershipService.resendInvitation(membershipId, resenderId);
  res.status(httpStatus.OK).send(membership);
});

/**
 * Get group memberships
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getGroupMemberships = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { page, limit, status } = req.query;
  
  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    status,
  };
  
  const result = await membershipService.getGroupMemberships(groupId, options);
  res.status(httpStatus.OK).send(result);
});

/**
 * Get user memberships
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserMemberships = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { page, limit, status } = req.query;
  
  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    status,
  };
  
  const result = await membershipService.getUserMemberships(userId, options);
  res.status(httpStatus.OK).send(result);
});

/**
 * Get membership by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMembership = catchAsync(async (req, res) => {
  const { membershipId } = req.params;
  
  const membership = await membershipService.getMembershipById(membershipId);
  res.status(httpStatus.OK).send(membership);
});

/**
 * Update membership role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateRole = catchAsync(async (req, res) => {
  const { membershipId } = req.params;
  const { newRole, updaterId } = req.body;
  
  const membership = await membershipService.updateMembershipRole(membershipId, newRole, updaterId);
  res.status(httpStatus.OK).send(membership);
});

/**
 * Remove a member from a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeMember = catchAsync(async (req, res) => {
  const { membershipId } = req.params;
  const { removerId } = req.body;
  
  const membership = await membershipService.removeMember(membershipId, removerId);
  res.status(httpStatus.OK).send(membership);
});

/**
 * Get pending invitations for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPendingInvitations = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  
  const invitations = await membershipService.getPendingInvitations(groupId);
  res.status(httpStatus.OK).send(invitations);
});

/**
 * Clean up expired invitations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cleanupExpiredInvitations = catchAsync(async (req, res) => {
  const deletedCount = await membershipService.cleanupExpiredInvitations();
  res.status(httpStatus.OK).send({
    message: `Cleaned up ${deletedCount} expired invitations`,
    deletedCount,
  });
});

module.exports = {
  createInvitation,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  resendInvitation,
  getGroupMemberships,
  getUserMemberships,
  getMembership,
  updateRole,
  removeMember,
  getPendingInvitations,
  cleanupExpiredInvitations,
};
