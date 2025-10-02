const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { Group, Membership } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a group
 * @param {Object} groupBody
 * @returns {Promise<Group>}
 */
const createGroup = async (groupBody) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Ensure ownerId is set to the same as createdBy
    if (groupBody.createdBy && !groupBody.ownerId) {
      groupBody.ownerId = groupBody.createdBy;
    }

    // Create the group
    const group = await Group.create([groupBody], { session });

    // Create a membership for the creator
    await Membership.create([{
      user_id: groupBody.createdBy,
      group_id: group[0]._id,
      invited_by: groupBody.createdBy, // Creator invites themselves
      status: 'active',
      role: 'admin', // Creator is always admin
      accepted_at: new Date(),
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return group[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Get group by id
 * @param {ObjectId} id
 * @returns {Promise<Group>}
 */
const getGroupById = async (id) => {
  const group = await Group.findById(id);
  
  // Ensure ownerId is set (for backward compatibility with existing groups)
  if (group && !group.ownerId && group.createdBy) {
    group.ownerId = group.createdBy;
    await group.save();
  }
  
  return group;
};

/**
 * Get group by id with memberships
 * @param {ObjectId} id
 * @returns {Promise<Group>}
 */
const getGroupByIdWithMemberships = async (id) => {
  const group = await Group.findById(id).populate('createdBy', 'firstName lastName email');
  
  if (!group) {
    return null;
  }

  // Ensure ownerId is set (for backward compatibility with existing groups)
  if (!group.ownerId && group.createdBy) {
    group.ownerId = group.createdBy;
    await group.save();
  }

  // Get memberships for this group
  const { Membership } = require('../models');
  const memberships = await Membership.find({ group_id: id })
    .populate('user_id', 'firstName lastName email')
    .populate('invited_by', 'firstName lastName email');

  // Convert to the format expected by frontend
  const groupWithMemberships = group.toObject();
  groupWithMemberships.members = memberships;

  return groupWithMemberships;
};

/**
 * Get group by id with populated fields
 * @param {ObjectId} id
 * @returns {Promise<Group>}
 */
const getGroupByIdPopulated = async (id) => {
  const group = await Group.findById(id)
    .populate('createdBy', 'firstName lastName email')
    .populate('members', 'firstName lastName email');
  
  // Ensure ownerId is set (for backward compatibility with existing groups)
  if (group && !group.ownerId && group.createdBy) {
    group.ownerId = group.createdBy;
    await group.save();
  }
  
  return group;
};

/**
 * Update group by id
 * @param {ObjectId} groupId
 * @param {Object} updateBody
 * @returns {Promise<Group>}
 */
const updateGroupById = async (groupId, updateBody) => {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }
  Object.assign(group, updateBody);
  await group.save();
  return group;
};

/**
 * Delete group by id
 * @param {ObjectId} groupId
 * @returns {Promise<Group>}
 */
const deleteGroupById = async (groupId) => {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }
  await group.remove();
  return group;
};

/**
 * Update group settings
 * @param {ObjectId} groupId
 * @param {Object} settingsBody
 * @returns {Promise<Group>}
 */
const updateGroupSettings = async (groupId, settingsBody) => {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }
  
  if (!group.settings) {
    group.settings = {};
  }
  
  Object.assign(group.settings, settingsBody);
  await group.save();
  return group;
};

/**
 * Get groups by user id
 * @param {ObjectId} userId
 * @returns {Promise<Group[]>}
 */
const getGroupsByUserId = async (userId) => {
  return Group.find({ members: userId });
};

/**
 * Fix groups that don't have memberships for their creators
 * This is a one-time migration function
 * @returns {Promise<number>} Number of groups fixed
 */
const fixGroupsWithoutCreatorMemberships = async () => {
  const groups = await Group.find({});
  let fixedCount = 0;

  for (const group of groups) {
    // Check if creator has a membership
    const existingMembership = await Membership.findOne({
      group_id: group._id,
      user_id: group.createdBy,
      status: 'active',
    });

    if (!existingMembership && group.createdBy) {
      // Create membership for the creator
      await Membership.create({
        user_id: group.createdBy,
        group_id: group._id,
        invited_by: group.createdBy,
        status: 'active',
        role: 'admin',
        accepted_at: new Date(),
      });
      fixedCount++;
    }
  }

  return fixedCount;
};

module.exports = {
  createGroup,
  getGroupById,
  getGroupByIdPopulated,
  getGroupByIdWithMemberships,
  updateGroupById,
  deleteGroupById,
  updateGroupSettings,
  getGroupsByUserId,
  fixGroupsWithoutCreatorMemberships,
};
