const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const groupValidation = require('../../validations/group.validation');
const groupController = require('../../controllers/group.controller');
const {
  canViewGroup,
  requireAdmin,
} = require('../../middlewares/membershipPermissions');

const router = express.Router();

// Group management
router.get('/:groupId', auth(), canViewGroup(), validate(groupValidation.getGroup), groupController.getGroup);
router.post('/', auth(), validate(groupValidation.createGroup), groupController.createGroup);
router.patch('/:groupId', auth(), requireAdmin(), validate(groupValidation.updateGroup), groupController.updateGroup);
router.delete('/:groupId', auth(), requireAdmin(), validate(groupValidation.deleteGroup), groupController.deleteGroup);

// Group settings
router.patch('/:groupId/settings', auth(), requireAdmin(), validate(groupValidation.updateGroupSettings), groupController.updateGroupSettings);

module.exports = router;
