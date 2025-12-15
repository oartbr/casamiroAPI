const httpStatus = require('http-status');
const { User, Membership, List } = require('../models');
const ApiError = require('../utils/ApiError');
const listService = require('./list.service');

/**
 * Get user context by phone number
 * Returns groups and lists with IDs, names, and default indicators
 * @param {string|number} phoneNumber - User's phone number
 * @returns {Promise<Object>} User context with groups and lists
 */
const getUserContext = async (phoneNumber) => {
  // Convert phoneNumber to number for proper matching since User model stores it as Number
  const phoneNumberAsNumber = typeof phoneNumber === 'string' ? parseInt(phoneNumber.replace(/\D/g, ''), 10) : phoneNumber;

  // Find user by phone number
  const user = await User.getUserByPhoneNumber(phoneNumberAsNumber);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phone number is not linked to any user');
  }

  // Check if user is active (has active memberships)
  const activeMemberships = await Membership.find({
    user_id: user._id,
    status: 'active',
  }).populate('group_id', 'name description iconUrl');

  if (!activeMemberships || activeMemberships.length === 0) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User is not active or has no active group memberships');
  }

  // Get all groups the user is a member of
  const groupIds = activeMemberships.map((m) => m.group_id._id);

  // Get all lists for these groups
  const lists = await List.find({ groupId: { $in: groupIds } })
    .select('_id name groupId isDefault')
    .populate('groupId', 'name');

  // Format groups with default indicator
  const groups = activeMemberships.map((membership) => {
    const group = membership.group_id;
    return {
      id: group._id.toString(),
      name: group.name,
      isDefault: user.activeGroupId && user.activeGroupId.toString() === group._id.toString(),
    };
  });

  // Format lists with default indicator
  const formattedLists = lists.map((list) => ({
    id: list._id.toString(),
    name: list.name,
    groupId: list.groupId._id.toString(),
    groupName: list.groupId.name,
    isDefault: list.isDefault,
  }));

  return {
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
    },
    groups,
    lists: formattedLists,
  };
};

/**
 * Add items to a list
 * @param {string} listId - List ID
 * @param {string|number} phoneNumber - User's phone number
 * @param {Array<string>} items - Array of item texts to add
 * @returns {Promise<List>} Updated list
 */
const addItemsToList = async (listId, phoneNumber, items) => {
  // Get user by phone number
  const phoneNumberAsNumber = typeof phoneNumber === 'string' ? parseInt(phoneNumber.replace(/\D/g, ''), 10) : phoneNumber;
  const user = await User.getUserByPhoneNumber(phoneNumberAsNumber);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phone number is not linked to any user');
  }

  // Validate user has active membership
  const list = await List.findById(listId).populate('groupId', '_id name');
  if (!list) {
    throw new ApiError(httpStatus.NOT_FOUND, 'List not found');
  }

  // Check if user has active membership in the group
  const membership = await Membership.findOne({
    user_id: user._id,
    group_id: list.groupId._id,
    status: 'active',
  });

  if (!membership) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User is not a member of this group');
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Items array is required and must not be empty');
  }

  // Get the next order number
  const nextOrder = list.items.length > 0 ? Math.max(...list.items.map((item) => item.order || 0)) + 1 : 1;

  // Add items to the list
  items.forEach((itemText, index) => {
    if (typeof itemText !== 'string' || !itemText.trim()) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Item at index ${index} must be a non-empty string`);
    }

    const newItem = {
      text: itemText.trim(),
      addedBy: user.firstName,
      order: nextOrder + index,
      isCompleted: false,
    };

    list.items.push(newItem);
  });

  await list.save();

  return list;
};

/**
 * Remove items from a list
 * @param {string} listId - List ID
 * @param {string|number} phoneNumber - User's phone number
 * @param {Array<string>} itemTexts - Array of item texts to remove (matches by text)
 * @returns {Promise<List>} Updated list
 */
const removeItemsFromList = async (listId, phoneNumber, itemTexts) => {
  // Get user by phone number
  const phoneNumberAsNumber = typeof phoneNumber === 'string' ? parseInt(phoneNumber.replace(/\D/g, ''), 10) : phoneNumber;
  const user = await User.getUserByPhoneNumber(phoneNumberAsNumber);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phone number is not linked to any user');
  }

  // Validate user has active membership
  const list = await List.findById(listId).populate('groupId', '_id name');
  if (!list) {
    throw new ApiError(httpStatus.NOT_FOUND, 'List not found');
  }

  // Check if user has active membership in the group
  const membership = await Membership.findOne({
    user_id: user._id,
    group_id: list.groupId._id,
    status: 'active',
  });

  if (!membership) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User is not a member of this group');
  }

  // Validate itemTexts array
  if (!Array.isArray(itemTexts) || itemTexts.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item texts array is required and must not be empty');
  }

  // Remove items matching the texts (case-insensitive, trimmed)
  const itemsToRemove = itemTexts.map((text) => text.trim().toLowerCase());
  const initialLength = list.items.length;

  list.items = list.items.filter((item) => {
    const itemTextLower = item.text.trim().toLowerCase();
    return !itemsToRemove.includes(itemTextLower);
  });

  const removedCount = initialLength - list.items.length;

  if (removedCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No matching items found to remove');
  }

  await list.save();

  return {
    list,
    removedCount,
    message: `Removed ${removedCount} item(s) from the list`,
  };
};

/**
 * Get complete list by list ID
 * @param {string} listId - List ID
 * @param {string|number} phoneNumber - User's phone number
 * @returns {Promise<List>} Complete list with items
 */
const getListById = async (listId, phoneNumber) => {
  // Get user by phone number
  const phoneNumberAsNumber = typeof phoneNumber === 'string' ? parseInt(phoneNumber.replace(/\D/g, ''), 10) : phoneNumber;
  const user = await User.getUserByPhoneNumber(phoneNumberAsNumber);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phone number is not linked to any user');
  }

  // Get list and validate membership
  const list = await listService.getListById(listId, user._id);

  // Sort items by order
  const sortedItems = list.items.sort((a, b) => (a.order || 0) - (b.order || 0));

  // Return list with sorted items
  return {
    id: list._id.toString(),
    name: list.name,
    description: list.description,
    groupId: list.groupId._id.toString(),
    groupName: list.groupId.name,
    isDefault: list.isDefault,
    items: sortedItems.map((item) => ({
      id: item._id.toString(),
      text: item.text,
      isCompleted: item.isCompleted,
      addedBy: item.addedBy,
      order: item.order || 0,
      completedAt: item.completedAt,
    })),
  };
};

module.exports = {
  getUserContext,
  addItemsToList,
  removeItemsFromList,
  getListById,
};
