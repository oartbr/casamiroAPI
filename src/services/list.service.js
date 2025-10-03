const httpStatus = require('http-status');
const { List, Membership, User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a list
 * @param {Object} listBody
 * @returns {Promise<List>}
 */
const createList = async (listBody) => {
  // Check if user has active membership in the group
  const membership = await Membership.findOne({
    user_id: listBody.createdBy,
    group_id: listBody.groupId,
    status: 'active',
  });

  if (!membership) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not a member of this group');
  }

  // If this is set as default, ensure no other default exists
  if (listBody.isDefault) {
    await List.updateMany(
      { groupId: listBody.groupId, isDefault: true },
      { isDefault: false }
    );
  }

  return List.create(listBody);
};

/**
 * Query for lists
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryLists = async (filter, options) => {
  const lists = await List.paginate(filter, options);
  return lists;
};

/**
 * Get list by id
 * @param {ObjectId} id
 * @param {ObjectId} userId - User ID for membership validation
 * @returns {Promise<List>}
 */
const getListById = async (id, userId = null) => {
  const list = await List.findById(id).populate('groupId', 'name').populate('createdBy', 'firstName lastName');
  
  if (!list) {
    throw new ApiError(httpStatus.NOT_FOUND, 'List not found');
  }

  // If userId is provided, check membership
  if (userId) {
    const membership = await Membership.findOne({
      user_id: userId,
      group_id: list.groupId,
      status: 'active',
    });

    if (!membership) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not a member of this group');
    }
  }

  return list;
};

/**
 * Get lists by group
 * @param {ObjectId} groupId
 * @param {ObjectId} userId - User ID for membership validation
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getListsByGroup = async (groupId, userId, options = {}) => {
  // Check if user has active membership in the group
  const membership = await Membership.findOne({
    user_id: userId,
    group_id: groupId,
    status: 'active',
  });

  if (!membership) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not a member of this group');
  }

  const filter = { groupId };
  const lists = await List.paginate(filter, options);
  return lists;
};

/**
 * Get default list for a group
 * @param {ObjectId} groupId
 * @param {ObjectId} userId - User ID for membership validation
 * @returns {Promise<List>}
 */
const getDefaultListByGroup = async (groupId, userId) => {
  // Check if user has active membership in the group
  const membership = await Membership.findOne({
    user_id: userId,
    group_id: groupId,
    status: 'active',
  });

  if (!membership) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not a member of this group');
  }

  let list = await List.findOne({ groupId, isDefault: true }).populate('groupId', 'name').populate('createdBy', 'firstName lastName');
  
  // If no default list exists, create one
  if (!list) {
    list = await createList({
      name: 'Default List',
      description: 'Default list for this group',
      groupId,
      isDefault: true,
      createdBy: userId,
    });
  }

  return list;
};

/**
 * Update list by id
 * @param {ObjectId} listId
 * @param {Object} updateBody
 * @param {ObjectId} userId - User ID for permission validation
 * @returns {Promise<List>}
 */
const updateListById = async (listId, updateBody, userId) => {
  const list = await getListById(listId, userId);
  
  // Check if user is the creator or has admin role
  const membership = await Membership.findOne({
    user_id: userId,
    group_id: list.groupId,
    status: 'active',
  });

  if (!membership || (list.createdBy.toString() !== userId.toString() && membership.role !== 'admin')) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this list');
  }

  // If setting as default, ensure no other default exists
  if (updateBody.isDefault) {
    await List.updateMany(
      { groupId: list.groupId, isDefault: true, _id: { $ne: listId } },
      { isDefault: false }
    );
  }

  Object.assign(list, updateBody);
  await list.save();
  return list;
};

/**
 * Delete list by id
 * @param {ObjectId} listId
 * @param {ObjectId} userId - User ID for permission validation
 * @returns {Promise<void>}
 */
const deleteListById = async (listId, userId) => {
  const list = await getListById(listId, userId);
  
  // Check if user is the creator or has admin role
  const membership = await Membership.findOne({
    user_id: userId,
    group_id: list.groupId,
    status: 'active',
  });

  if (!membership || (list.createdBy.toString() !== userId.toString() && membership.role !== 'admin')) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this list');
  }

  // Cannot delete default list
  if (list.isDefault) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete the default list');
  }

  // Items are embedded, so they'll be deleted with the list
  await list.remove();
};

/**
 * Create a list item
 * @param {Object} itemBody
 * @param {ObjectId} userId - User ID for membership validation
 * @returns {Promise<List>}
 */
const createListItem = async (itemBody, userId) => {
  // Get the list and validate membership
  const list = await getListById(itemBody.listId, userId);
  
  // Get user's firstName
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  // Get the next order number
  const nextOrder = list.items.length > 0 ? Math.max(...list.items.map(item => item.order || 0)) + 1 : 1;

  // Create the new item
  const newItem = {
    text: itemBody.text,
    addedBy: user.firstName,
    order: nextOrder,
    isCompleted: false,
  };

  // Add the item to the list
  list.items.push(newItem);
  await list.save();
  
  return list;
};

/**
 * Get list items
 * @param {ObjectId} listId
 * @param {ObjectId} userId - User ID for membership validation
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
const getListItems = async (listId, userId, options = {}) => {
  // Get the list with items and validate access
  const list = await getListById(listId, userId);
  
  // Populate user details for completedBy only (addedBy is now a string)
  await list.populate([
    { path: 'items.completedBy', select: 'firstName lastName' }
  ]);
  
  // Sort items by order
  const sortedItems = list.items.sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Apply filters if needed
  let filteredItems = sortedItems;
  if (options.isCompleted !== undefined) {
    filteredItems = sortedItems.filter(item => item.isCompleted === options.isCompleted);
  }
  
  // Apply pagination
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 50;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedItems = filteredItems.slice(startIndex, endIndex);
  
  return {
    results: paginatedItems,
    page,
    limit,
    totalPages: Math.ceil(filteredItems.length / limit),
    totalResults: filteredItems.length,
  };
};

/**
 * Update list item by id
 * @param {ObjectId} itemId
 * @param {Object} updateBody
 * @param {ObjectId} userId - User ID for permission validation
 * @returns {Promise<List>}
 */
const updateListItemById = async (itemId, updateBody, userId) => {
  // Find the list that contains this item
  const list = await List.findOne({ 'items._id': itemId });
  
  if (!list) {
    throw new ApiError(httpStatus.NOT_FOUND, 'List item not found');
  }

  // Validate list access
  await getListById(list._id, userId);

  // Find the specific item
  const item = list.items.id(itemId);
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'List item not found');
  }

  // Check if user can update this item
  const membership = await Membership.findOne({
    user_id: userId,
    group_id: list.groupId,
    status: 'active',
  });

  // Get user's firstName to compare with addedBy
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!membership || (item.addedBy !== user.firstName && membership.role !== 'admin')) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this item');
  }

  // If marking as completed, set completedBy and completedAt
  if (updateBody.isCompleted && !item.isCompleted) {
    updateBody.completedBy = userId;
    updateBody.completedAt = new Date();
  }

  // Update the item
  Object.assign(item, updateBody);
  await list.save();

  // Populate user details for completedBy only (addedBy is now a string)
  await list.populate([
    { path: 'items.completedBy', select: 'firstName lastName' }
  ]);
  
  return list;
};

/**
 * Delete list item by id
 * @param {ObjectId} itemId
 * @param {ObjectId} userId - User ID for permission validation
 * @returns {Promise<void>}
 */
const deleteListItemById = async (itemId, userId) => {
  // Find the list that contains this item
  const list = await List.findOne({ 'items._id': itemId });
  
  if (!list) {
    throw new ApiError(httpStatus.NOT_FOUND, 'List item not found');
  }

  // Validate list access
  await getListById(list._id, userId);

  // Find the specific item
  const item = list.items.id(itemId);
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'List item not found');
  }

  // Check if user can delete this item
  const membership = await Membership.findOne({
    user_id: userId,
    group_id: list.groupId,
    status: 'active',
  });

  // Get user's firstName to compare with addedBy
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!membership || (item.addedBy !== user.firstName && membership.role !== 'admin')) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this item');
  }

  // Remove the item from the list
  item.remove();
  await list.save();
};

module.exports = {
  createList,
  queryLists,
  getListById,
  getListsByGroup,
  getDefaultListByGroup,
  updateListById,
  deleteListById,
  createListItem,
  getListItems,
  updateListItemById,
  deleteListItemById,
};


