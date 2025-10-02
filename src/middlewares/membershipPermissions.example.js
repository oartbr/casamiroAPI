/**
 * Example usage of membership permission middlewares
 * This file demonstrates how to use the various permission middlewares
 * in your routes and controllers.
 */

const express = require('express');
const {
  requireMembership,
  requireAdmin,
  requireAdminOrEditor,
  requireRole,
  canManageMembership,
  canInviteUsers,
  canViewGroup,
  isOwnerOrAdmin,
} = require('./membershipPermissions');

const router = express.Router();

// Example 1: Basic membership requirement
// User must be an active member of the group
router.get('/group/:groupId/profile', 
  requireMembership('active'), 
  (req, res) => {
    // req.membership contains the user's membership object
    res.json({ message: 'Access granted', membership: req.membership });
  }
);

// Example 2: Admin-only access
// User must be an admin of the group
router.delete('/group/:groupId', 
  requireAdmin(), 
  (req, res) => {
    // req.membership contains the admin membership
    res.json({ message: 'Group deleted by admin', admin: req.membership });
  }
);

// Example 3: Admin or Editor access
// User must have admin or editor role
router.post('/group/:groupId/announcement', 
  requireAdminOrEditor(), 
  (req, res) => {
    // req.membership contains the user's membership
    res.json({ message: 'Announcement posted', author: req.membership });
  }
);

// Example 4: Custom role requirement
// User must have specific role(s)
router.get('/group/:groupId/analytics', 
  requireRole(['admin', 'analyst']), 
  (req, res) => {
    // req.membership contains the user's membership
    res.json({ message: 'Analytics access granted', user: req.membership });
  }
);

// Example 5: Invitation permissions
// User must be able to invite others (admin or editor)
router.post('/group/:groupId/invite', 
  canInviteUsers(), 
  (req, res) => {
    // req.membership contains the inviter's membership
    res.json({ message: 'Invitation sent', inviter: req.membership });
  }
);

// Example 6: View group information
// User must have any membership status in the group
router.get('/group/:groupId/info', 
  canViewGroup(), 
  (req, res) => {
    // req.membership contains the user's membership (any status)
    res.json({ message: 'Group info accessed', membership: req.membership });
  }
);

// Example 7: Manage specific membership
// User must be admin and able to manage the target membership
router.patch('/membership/:membershipId/role', 
  canManageMembership(), 
  (req, res) => {
    // req.targetMembership contains the membership being managed
    // req.userMembership contains the admin's membership
    res.json({ 
      message: 'Role updated', 
      target: req.targetMembership, 
      admin: req.userMembership 
    });
  }
);

// Example 8: Owner or admin access
// User must be the owner of the membership or an admin of the group
router.get('/membership/:membershipId', 
  isOwnerOrAdmin(), 
  (req, res) => {
    // req.membership contains the target membership
    // req.isOwner indicates if the user is the owner
    // req.userMembership contains the admin's membership (if admin)
    res.json({ 
      message: 'Membership accessed', 
      membership: req.membership, 
      isOwner: req.isOwner,
      admin: req.userMembership 
    });
  }
);

// Example 9: Chaining multiple middlewares
// User must be admin AND pass validation
router.post('/group/:groupId/settings', 
  requireAdmin(),           // First check admin permissions
  validateSettings,         // Then validate input
  (req, res) => {          // Finally process request
    res.json({ message: 'Settings updated', admin: req.membership });
  }
);

// Example 10: Conditional permissions based on group type
router.get('/group/:groupId/advanced-features', 
  async (req, res, next) => {
    try {
      const groupId = req.params.groupId;
      
      // Check if group has advanced features enabled
      const group = await Group.findById(groupId);
      if (!group.advancedFeatures) {
        return res.status(403).json({ message: 'Advanced features not enabled' });
      }
      
      // If enabled, check admin permissions
      next();
    } catch (error) {
      next(error);
    }
  },
  requireAdmin(),           // Only admins can access advanced features
  (req, res) => {
    res.json({ message: 'Advanced features accessed', admin: req.membership });
  }
);

// Example 11: Using middleware in controllers
const exampleController = {
  // Middleware ensures user has required permissions before controller runs
  updateGroupSettings: async (req, res) => {
    // req.membership is guaranteed to exist due to middleware
    const { membership } = req;
    
    // No need to check permissions again - middleware already did it
    const updatedSettings = await updateSettings(req.params.groupId, req.body);
    
    res.json({ 
      message: 'Settings updated', 
      updatedBy: membership.user_id,
      role: membership.role 
    });
  }
};

// Example 12: Error handling with middleware
router.get('/group/:groupId/restricted', 
  requireAdmin(),
  (req, res, next) => {
    try {
      // Additional business logic checks
      if (someCondition) {
        throw new Error('Business rule violation');
      }
      next();
    } catch (error) {
      next(error);
    }
  },
  (req, res) => {
    res.json({ message: 'Restricted access granted', admin: req.membership });
  }
);

module.exports = router;
