const httpStatus = require('http-status');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { Membership } = require('../models');

/**
 * Check if user is a member of a specific group
 * @param {string} groupId - Group ID to check membership for
 * @param {string} userId - User ID to check
 * @param {string} requiredStatus - Required membership status (default: 'active')
 * @returns {Promise<Object>} Membership object if found
 */
const checkMembership = async (groupId, userId, requiredStatus = 'active') => {
  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid group or user ID');
  }

  const membership = await Membership.findOne({
    group_id: groupId,
    user_id: userId,
    status: requiredStatus,
  });

  if (!membership) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User is not a member of this group');
  }

  return membership;
};

/**
 * Check if user has required role in a group
 * @param {string} groupId - Group ID to check
 * @param {string} userId - User ID to check
 * @param {Array<string>} requiredRoles - Array of required roles
 * @returns {Promise<Object>} Membership object if user has required role
 */
const checkRole = async (groupId, userId, requiredRoles) => {
  // First check if user is the group creator (they automatically have admin privileges)
  const { Group } = require('../models');
  const group = await Group.findById(groupId);
  
  if (group && group.createdBy.toString() === userId.toString()) {
    // Group creator has all privileges, return a mock membership with admin role
    return {
      role: 'admin',
      status: 'active',
      user_id: userId,
      group_id: groupId
    };
  }
  
  // If not creator, check membership role
  const membership = await checkMembership(groupId, userId, 'active');
  
  if (!requiredRoles.includes(membership.role)) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}. User role: ${membership.role}`
    );
  }

  return membership;
};

/**
 * Middleware to check if user is a member of a group
 * @param {string} requiredStatus - Required membership status (default: 'active')
 * @returns {Function} Express middleware function
 */
const requireMembership = (requiredStatus = 'active') => {
  return async (req, res, next) => {
    try {
      const groupId = req.params.groupId || req.body.group_id || req.query.groupId;
      const userId = req.user?.id || req.body.userId || req.body.user_id;

      if (!groupId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'Group ID is required'));
      }

      if (!userId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'User ID is required'));
      }

      const membership = await checkMembership(groupId, userId, requiredStatus);
      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has admin role in a group
 * @returns {Function} Express middleware function
 */
const requireAdmin = () => {
  return async (req, res, next) => {
    try {
      const groupId = req.params.groupId || req.body.group_id || req.query.groupId;
      const userId = req.user?.id || req.body.userId || req.body.user_id;

      if (!groupId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'Group ID is required'));
      }

      if (!userId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'User ID is required'));
      }

      const membership = await checkRole(groupId, userId, ['admin']);
      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has admin or editor role in a group
 * @returns {Function} Express middleware function
 */
const requireAdminOrEditor = () => {
  return async (req, res, next) => {
    try {
      const groupId = req.params.groupId || req.body.group_id || req.query.groupId;
      const userId = req.user?.id || req.body.userId || req.body.user_id;

      if (!groupId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'Group ID is required'));
      }

      if (!userId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'User ID is required'));
      }

      const membership = await checkRole(groupId, userId, ['admin', 'editor']);
      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has specific role in a group
 * @param {Array<string>} requiredRoles - Array of required roles
 * @returns {Function} Express middleware function
 */
const requireRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const groupId = req.params.groupId || req.body.group_id || req.query.groupId;
      const userId = req.user?.id || req.body.userId || req.body.user_id;

      if (!groupId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'Group ID is required'));
      }

      if (!userId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'User ID is required'));
      }

      if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'Required roles must be specified'));
      }

      const membership = await checkRole(groupId, userId, requiredRoles);
      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can manage a specific membership
 * @returns {Function} Express middleware function
 */
const canManageMembership = () => {
  return async (req, res, next) => {
    try {
      const membershipId = req.params.membershipId;
      const userId = req.user?.id || req.body.userId || req.body.user_id;

      if (!membershipId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'Membership ID is required'));
      }

      if (!userId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'User ID is required'));
      }

      // Get the membership to be managed
      const targetMembership = await Membership.findById(membershipId);
      if (!targetMembership) {
        return next(new ApiError(httpStatus.NOT_FOUND, 'Membership not found'));
      }

      // Check if user is a member of the same group
      const userMembership = await checkMembership(targetMembership.group_id, userId, 'active');

      // Only admins can manage other memberships
      if (userMembership.role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can manage memberships');
      }

      // Prevent admin from managing their own membership if they're the only admin
      if (targetMembership.user_id.toString() === userId && targetMembership.role === 'admin') {
        const adminCount = await Membership.countDocuments({
          group_id: targetMembership.group_id,
          role: 'admin',
          status: 'active',
        });
        if (adminCount <= 1) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot manage your own membership: group must have at least one admin');
        }
      }

      req.targetMembership = targetMembership;
      req.userMembership = userMembership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can invite others to a group
 * @returns {Function} Express middleware function
 */
const canInviteUsers = () => {
  return async (req, res, next) => {
    try {
      const groupId = req.params.groupId || req.body.group_id || req.query.groupId;
      const userId = req.user?.id || req.body.userId || req.body.user_id;

      if (!groupId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'Group ID is required'));
      }

      if (!userId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'User ID is required'));
      }

      // Only admins and editors can invite users
      const membership = await checkRole(groupId, userId, ['admin', 'editor']);
      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can view group information
 * @returns {Function} Express middleware function
 */
const canViewGroup = () => {
  return async (req, res, next) => {
    try {
      const groupId = req.params.groupId || req.body.group_id || req.query.groupId;
      const userId = req.user?.id || req.body.userId || req.body.user_id;



      if (!groupId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'Group ID is required'));
      }

      if (!userId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'User ID is required'));
      }

      // Check if user has any membership in the group (active, pending, etc.)
      // First get the user to check their phone number for pending invitations
      const { User } = require('../models');
      const user = await User.findById(userId);
      
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      const membership = await Membership.findOne({
        group_id: groupId,
        $or: [
          { user_id: userId }, // Active memberships
          { 
            invitee_phone: user.phoneNumber?.toString(), 
            status: 'pending' 
          }, // Pending invitations by phone number (convert to string)
          { 
            invitee_phone: user.phoneNumber, 
            status: 'pending' 
          } // Pending invitations by phone number (as number)
        ]
      });

      if (!membership) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied: not a member of this group');
      }

      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is the owner of a membership or has admin rights
 * @returns {Function} Express middleware function
 */
const isOwnerOrAdmin = () => {
  return async (req, res, next) => {
    try {
      const membershipId = req.params.membershipId;
      const userId = req.user?.id || req.body.userId || req.body.user_id;

      if (!membershipId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'Membership ID is required'));
      }

      if (!userId) {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'User ID is required'));
      }

      const membership = await Membership.findById(membershipId);
      if (!membership) {
        return next(new ApiError(httpStatus.NOT_FOUND, 'Membership not found'));
      }

      // Check if user is the owner of the membership
      if (membership.user_id.toString() === userId) {
        req.membership = membership;
        req.isOwner = true;
        return next();
      }

      // Check if user is an admin of the group
      try {
        const userMembership = await checkRole(membership.group_id, userId, ['admin']);
        req.membership = membership;
        req.userMembership = userMembership;
        req.isOwner = false;
        next();
      } catch (error) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied: not the owner or admin');
      }
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireMembership,
  requireAdmin,
  requireAdminOrEditor,
  requireRole,
  canManageMembership,
  canInviteUsers,
  canViewGroup,
  isOwnerOrAdmin,
  checkMembership,
  checkRole,
};
