const express = require('express');
const validate = require('../../middlewares/validate');
const userCommValidation = require('../../validations/userComm.validation');
const userCommController = require('../../controllers/userComm.controller');

const router = express.Router();

// Get user context (groups and lists) by phone number
router.route('/context').get(validate(userCommValidation.getUserContext), userCommController.getUserContext);

// Get complete list by ID
router.route('/lists/:listId').get(validate(userCommValidation.getListById), userCommController.getListById);

// Add items to a list
router.route('/lists/:listId/items').post(validate(userCommValidation.addItemsToList), userCommController.addItemsToList);

// Remove items from a list
router
  .route('/lists/:listId/items')
  .delete(validate(userCommValidation.removeItemsFromList), userCommController.removeItemsFromList);

module.exports = router;
