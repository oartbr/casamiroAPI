const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const listService = require('../services/list.service');

/**
 * @swagger
 * /lists:
 *   post:
 *     summary: Create a new list
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - groupId
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               groupId:
 *                 type: string
 *                 format: objectId
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowItemDeletion:
 *                     type: boolean
 *                     default: true
 *                   requireApprovalForItems:
 *                     type: boolean
 *                     default: false
 *     responses:
 *       201:
 *         description: List created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a member of the group
 */
const createList = catchAsync(async (req, res) => {
  const list = await listService.createList({
    ...req.body,
    createdBy: req.user.id,
  });
  res.status(httpStatus.CREATED).send(list);
});

/**
 * @swagger
 * /lists:
 *   get:
 *     summary: Get all lists
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by group ID
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by list name
 *       - in: query
 *         name: isDefault
 *         schema:
 *           type: boolean
 *         description: Filter by default status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort option in the format: sortField:(desc|asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of results per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Current page
 *     responses:
 *       200:
 *         description: Lists retrieved successfully
 *       401:
 *         description: Unauthorized
 */
const getLists = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['groupId', 'name', 'isDefault']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await listService.queryLists(filter, options);
  res.send(result);
});

/**
 * @swagger
 * /lists/{listId}:
 *   get:
 *     summary: Get a list by ID
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: List ID
 *     responses:
 *       200:
 *         description: List retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a member of the group
 *       404:
 *         description: List not found
 */
const getList = catchAsync(async (req, res) => {
  const list = await listService.getListById(req.params.listId, req.user.id);
  res.send(list);
});

/**
 * @swagger
 * /groups/{groupId}/lists:
 *   get:
 *     summary: Get lists by group
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Group ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort option in the format: sortField:(desc|asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of results per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Current page
 *     responses:
 *       200:
 *         description: Lists retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a member of the group
 */
const getListsByGroup = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await listService.getListsByGroup(req.params.groupId, req.user.id, options);
  res.send(result);
});

/**
 * @swagger
 * /groups/{groupId}/lists/default:
 *   get:
 *     summary: Get default list for a group
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Default list retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a member of the group
 */
const getDefaultListByGroup = catchAsync(async (req, res) => {
  const list = await listService.getDefaultListByGroup(req.params.groupId, req.user.id);
  res.send(list);
});

/**
 * @swagger
 * /lists/{listId}:
 *   patch:
 *     summary: Update a list
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: List ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               isDefault:
 *                 type: boolean
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowItemDeletion:
 *                     type: boolean
 *                   requireApprovalForItems:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: List updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have permission to update this list
 *       404:
 *         description: List not found
 */
const updateList = catchAsync(async (req, res) => {
  const list = await listService.updateListById(req.params.listId, req.body, req.user.id);
  res.send(list);
});

/**
 * @swagger
 * /lists/{listId}:
 *   delete:
 *     summary: Delete a list
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: List ID
 *     responses:
 *       204:
 *         description: List deleted successfully
 *       400:
 *         description: Bad request - Cannot delete default list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have permission to delete this list
 *       404:
 *         description: List not found
 */
const deleteList = catchAsync(async (req, res) => {
  await listService.deleteListById(req.params.listId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * @swagger
 * /list-items:
 *   post:
 *     summary: Create a new list item
 *     tags: [List Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - listId
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 500
 *               listId:
 *                 type: string
 *                 format: objectId
 *               isCompleted:
 *                 type: boolean
 *                 default: false
 *               order:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: List item created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a member of the group
 */
const createListItem = catchAsync(async (req, res) => {
  const list = await listService.createListItem(req.body, req.user.id);
  res.status(httpStatus.CREATED).send(list);
});

/**
 * @swagger
 * /lists/{listId}/items:
 *   get:
 *     summary: Get items for a list
 *     tags: [List Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: List ID
 *       - in: query
 *         name: isCompleted
 *         schema:
 *           type: boolean
 *         description: Filter by completion status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort option in the format: sortField:(desc|asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of results per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Current page
 *     responses:
 *       200:
 *         description: List items retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a member of the group
 *       404:
 *         description: List not found
 */
const getListItems = catchAsync(async (req, res) => {
  const options = pick(req.query, ['isCompleted', 'sortBy', 'limit', 'page']);
  const result = await listService.getListItems(req.params.listId, req.user.id, options);
  res.send(result);
});

/**
 * @swagger
 * /list-items/{itemId}:
 *   patch:
 *     summary: Update a list item
 *     tags: [List Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: List item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 500
 *               isCompleted:
 *                 type: boolean
 *               order:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: List item updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have permission to update this item
 *       404:
 *         description: List item not found
 */
const updateListItem = catchAsync(async (req, res) => {
  const list = await listService.updateListItemById(req.params.itemId, req.body, req.user.id);
  res.send(list);
});

/**
 * @swagger
 * /list-items/{itemId}:
 *   delete:
 *     summary: Delete a list item
 *     tags: [List Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: List item ID
 *     responses:
 *       204:
 *         description: List item deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have permission to delete this item
 *       404:
 *         description: List item not found
 */
const deleteListItem = catchAsync(async (req, res) => {
  await listService.deleteListItemById(req.params.itemId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createList,
  getLists,
  getList,
  getListsByGroup,
  getDefaultListByGroup,
  updateList,
  deleteList,
  createListItem,
  getListItems,
  updateListItem,
  deleteListItem,
};


