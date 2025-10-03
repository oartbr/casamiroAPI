const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const listValidation = require('../../validations/list.validation');
const listController = require('../../controllers/list.controller');

const router = express.Router();

// List routes
router
  .route('/')
  .post(auth(), validate(listValidation.createList), listController.createList)
  .get(auth(), validate(listValidation.getLists), listController.getLists);

router
  .route('/:listId')
  .get(auth(), validate(listValidation.getList), listController.getList)
  .patch(auth(), validate(listValidation.updateList), listController.updateList)
  .delete(auth(), validate(listValidation.deleteList), listController.deleteList);

// Group-specific list routes
router
  .route('/groups/:groupId/lists')
  .get(auth(), validate(listValidation.getListsByGroup), listController.getListsByGroup);

router
  .route('/groups/:groupId/lists/default')
  .get(auth(), validate(listValidation.getDefaultListByGroup), listController.getDefaultListByGroup);

// List items routes
router
  .route('/items')
  .post(auth(), validate(listValidation.createListItem), listController.createListItem);

router
  .route('/:listId/items')
  .get(auth(), validate(listValidation.getListItems), listController.getListItems);

router
  .route('/items/:itemId')
  .patch(auth(), validate(listValidation.updateListItem), listController.updateListItem)
  .delete(auth(), validate(listValidation.deleteListItem), listController.deleteListItem);

module.exports = router;


