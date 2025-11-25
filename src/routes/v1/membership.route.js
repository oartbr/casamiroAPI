const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const membershipValidation = require('../../validations/membership.validation');
const membershipController = require('../../controllers/membership.controller');
const {
  requireAdmin,
  requireAdminOrEditor,
  canInviteUsers,
  canManageMembership,
  canViewGroup,
  isOwnerOrAdmin,
} = require('../../middlewares/membershipPermissions');

const router = express.Router();

// Invitation management
router.post('/invite', auth(), canInviteUsers(), validate(membershipValidation.createInvitation), membershipController.createInvitation);
router.get('/invite/:token', validate(membershipValidation.getInvitationByToken), membershipController.getInvitationByToken);
router.post('/accept/:token', validate(membershipValidation.acceptInvitation), membershipController.acceptInvitation);
router.post('/decline/:token', validate(membershipValidation.declineInvitation), membershipController.declineInvitation);
router.delete('/invite/:membershipId', auth(), isOwnerOrAdmin(), validate(membershipValidation.cancelInvitation), membershipController.cancelInvitation);
router.post('/invite/:membershipId/resend', auth(), canInviteUsers(), validate(membershipValidation.resendInvitation), membershipController.resendInvitation);

// Membership management
router.get('/group/:groupId', auth(), canViewGroup(), validate(membershipValidation.getGroupMemberships), membershipController.getGroupMemberships);
router.get('/user/:userId', auth(), validate(membershipValidation.getUserMemberships), membershipController.getUserMemberships);
router.get('/:membershipId', auth(), isOwnerOrAdmin(), validate(membershipValidation.getMembership), membershipController.getMembership);
router.patch('/:membershipId/role', auth(), canManageMembership(), validate(membershipValidation.updateRole), membershipController.updateRole);
router.delete('/:membershipId', auth(), canManageMembership(), validate(membershipValidation.removeMember), membershipController.removeMember);

// Utility endpoints
router.get('/group/:groupId/pending', auth(), canViewGroup(), validate(membershipValidation.getPendingInvitations), membershipController.getPendingInvitations);
router.post('/cleanup', auth(), requireAdmin(), membershipController.cleanupExpiredInvitations);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Memberships
 *   description: Group membership management and invitations
 */

/**
 * @swagger
 * /memberships/invite:
 *   post:
 *     summary: Create a membership invitation
 *     description: Invite a user to join a group. Only group members with admin or editor roles can invite users.
 *     tags: [Memberships]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - group_id
 *               - invitee_phone
 *               - invited_by
 *             properties:
 *               group_id:
 *                 type: string
 *                 description: ID of the group to invite user to
 *               invitee_phone:
 *                 type: string
 *                 description: Phone number of the user to invite
 *               invited_by:
 *                 type: string
 *                 description: ID of the user sending the invitation
 *               role:
 *                 type: string
 *                 enum: [admin, editor, contributor]
 *                 default: contributor
 *                 description: Role to assign to the invited user
 *             example:
 *               group_id: "507f1f77bcf86cd799439011"
 *               invitee_phone: "+1234567890"
 *               invited_by: "507f1f77bcf86cd799439012"
 *               role: "contributor"
 *     responses:
 *       "201":
 *         description: Invitation created successfully
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Membership'
 *       "400":
 *         description: Bad request
 *       "403":
 *         description: Insufficient permissions
 *       "404":
 *         description: Group not found
 *       "409":
 *         description: User already member or invitation exists
 *
 * @swagger
 * /memberships/accept/{token}:
 *   post:
 *     summary: Accept a membership invitation
 *     description: Accept an invitation using the invitation token
 *     tags: [Memberships]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user accepting the invitation
 *             example:
 *               userId: "507f1f77bcf86cd799439012"
 *     responses:
 *       "200":
 *         description: Invitation accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Membership'
 *       "400":
 *         description: Bad request or expired invitation
 *       "404":
 *         description: Invalid token
 *
 * @swagger
 * /memberships/decline/{token}:
 *   post:
 *     summary: Decline a membership invitation
 *     description: Decline an invitation using the invitation token
 *     tags: [Memberships]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *     responses:
 *       "200":
 *         description: Invitation declined successfully
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Membership'
 *       "404":
 *         description: Invalid token
 *
 * @swagger
 * /memberships/{membershipId}/role:
 *   patch:
 *     summary: Update membership role
 *     description: Change a member's role. Only group admins can change roles.
 *     tags: [Memberships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *         description: Membership ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newRole
 *               - updaterId
 *             properties:
 *               newRole:
 *                 type: string
 *                 enum: [admin, editor, contributor]
 *                 description: New role to assign
 *               updaterId:
 *                 type: string
 *                 description: ID of the user making the change
 *             example:
 *               newRole: "editor"
 *               updaterId: "507f1f77bcf86cd799439012"
 *     responses:
 *       "200":
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Membership'
 *       "400":
 *         description: Bad request
 *       "403":
 *         description: Insufficient permissions
 *       "404":
 *         description: Membership not found
 *
 * @swagger
 * /memberships/{membershipId}:
 *   delete:
 *     summary: Remove a member from a group
 *     description: Remove a member from a group. Only group admins can remove members.
 *     tags: [Memberships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *         description: Membership ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - removerId
 *             properties:
 *               removerId:
 *                 type: string
 *                 description: ID of the user removing the member
 *             example:
 *               removerId: "507f1f77bcf86cd799439012"
 *     responses:
 *       "200":
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Membership'
 *       "400":
 *         description: Bad request
 *       "403":
 *         description: Insufficient permissions
 *       "404":
 *         description: Membership not found
 *
 * @swagger
 * /memberships/group/{groupId}:
 *   get:
 *     summary: Get group memberships
 *     description: Get all memberships for a specific group with pagination
 *     tags: [Memberships]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, declined, removed]
 *         description: Filter by membership status
 *     responses:
 *       "200":
 *         description: Group memberships retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memberships:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Membership'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *
 * @swagger
 * /memberships/user/{userId}:
 *   get:
 *     summary: Get user memberships
 *     description: Get all memberships for a specific user with pagination
 *     tags: [Memberships]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, declined, removed]
 *         description: Filter by membership status
 *     responses:
 *       "200":
 *         description: User memberships retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memberships:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Membership'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
