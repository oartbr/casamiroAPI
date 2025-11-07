const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { Group, Membership, List } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateAndUploadHashicon } = require('../utils/hashicon');

/**
 * Create a group
 * @param {Object} groupBody
 * @param {Object} options - Optional configuration
 * @param {mongoose.ClientSession} [options.session] - Optional session for transaction management
 * @param {boolean} [options.skipMembership] - Skip creating membership for creator (default: false)
 * @param {boolean} [options.skipList] - Skip creating default list (default: false)
 * @param {boolean} [options.skipHashicon] - Skip generating hashicon (default: false)
 * @returns {Promise<Group>}
 */
const createGroup = async (groupBody, options = {}) => {
  const { session: providedSession, skipMembership = false, skipList = false, skipHashicon = false } = options;

  // Use provided session or create a new one
  const session = providedSession || (await mongoose.startSession());
  const shouldManageTransaction = !providedSession;

  if (shouldManageTransaction) {
    session.startTransaction();
  }

  try {
    // Ensure ownerId is set to the same as createdBy
    if (groupBody.createdBy && !groupBody.ownerId) {
      groupBody.ownerId = groupBody.createdBy;
    }

    // Create the group
    const group = await Group.create([groupBody], { session });

    // Create a membership for the creator (unless skipped)
    if (!skipMembership && groupBody.createdBy) {
      await Membership.create(
        [
          {
            user_id: groupBody.createdBy,
            group_id: group[0]._id,
            invited_by: groupBody.createdBy, // Creator invites themselves
            status: 'active',
            role: 'admin', // Creator is always admin
            accepted_at: new Date(),
          },
        ],
        { session }
      );
    }

    // Create a default list for the group (unless skipped)
    if (!skipList && groupBody.createdBy) {
      await List.create(
        [
          {
            name: 'Default List',
            description: 'Default list for this group',
            groupId: group[0]._id,
            isDefault: true,
            createdBy: groupBody.createdBy,
            settings: {
              allowItemDeletion: true,
              requireApprovalForItems: false,
            },
          },
        ],
        { session }
      );
    }

    // Only commit/end session if we created it
    if (shouldManageTransaction) {
      await session.commitTransaction();
      session.endSession();

      // Generate and upload hashicon after transaction commits (unless skipped)
      // Only generate hashicon if we're managing the transaction (to ensure it happens after commit)
      if (!skipHashicon) {
        try {
          const iconUrl = await generateAndUploadHashicon(group[0]._id.toString());
          group[0].iconUrl = iconUrl;
          await group[0].save();
        } catch (hashiconError) {
          // Log error but don't fail group creation if hashicon generation fails
          console.error('Error generating hashicon for group:', group[0]._id, hashiconError);
        }
      }
    }
    // If session is provided by caller, don't generate hashicon here
    // Caller should handle hashicon generation after their transaction commits

    return group[0];
  } catch (error) {
    // Only abort/end session if we created it
    if (shouldManageTransaction) {
      await session.abortTransaction();
      session.endSession();
    }
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
