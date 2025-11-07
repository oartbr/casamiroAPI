const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { User, Group, Membership } = require('../models');
const ApiError = require('../utils/ApiError');
const { createGroup } = require('./group.service');
const { generateAndUploadHashicon } = require('../utils/hashicon');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (await User.isPhoneNumberTaken(userBody.phoneNumber)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number is already taken');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create the user
    const user = await User.create([userBody], { session });

    // Create a default personal group using the group service
    const defaultGroupName = `${user[0].firstName} [Personal]`;
    const group = await createGroup(
      {
        name: defaultGroupName,
        description: `Personal group for ${user[0].firstName} ${user[0].lastName}`,
        createdBy: user[0]._id,
        isPersonal: true,
        settings: {
          allowInvitations: false,
          requireApproval: false,
        },
      },
      {
        session, // Use the same session to maintain transaction consistency
        skipMembership: true, // Skip membership creation - we'll create it with specific settings
        skipList: false, // Still create default list for personal groups
        skipHashicon: false, // Generate hashicon for personal groups
      }
    );

    // Create a membership linking the user to the group
    await Membership.create(
      [
        {
          user_id: user[0]._id,
          group_id: group._id,
          invited_by: user[0]._id, // User is their own inviter for default group
          status: 'active',
          role: 'admin', // Default to admin for their own group
          accepted_at: new Date(),
        },
      ],
      { session }
    );

    // Set the personal group as the active group
    user[0].activeGroupId = group._id;
    await user[0].save({ session });

    await session.commitTransaction();
    session.endSession();

    // Generate hashicon after transaction commits
    // Since we passed a session to createGroup, it won't generate hashicon automatically
    // So we generate it here after the transaction commits
    try {
      const iconUrl = await generateAndUploadHashicon(group._id.toString());
      group.iconUrl = iconUrl;
      await group.save();
    } catch (hashiconError) {
      // Log error but don't fail user creation if hashicon generation fails
      console.error('Error generating hashicon for personal group:', group._id, hashiconError);
    }

    return { user: user[0], group };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const parsedFilter = filter.filters ? JSON.parse(filter.filters) : { status: [] };
  const parsedSort = JSON.parse(options.sort);
  const filterResults =
    parsedFilter.roles && parsedFilter.roles.length > 0
      ? { 'role.id': parsedFilter.roles.map((item) => item.id) }
      : { 'role.id': [1, 2] };
  const adjustedOptions = {
    limit: parseInt(options.limit, 10),
    offset: (parseInt(options.page, 10) - 1) * parseInt(options.limit, 10),
    sortBy: parsedSort[0].order === 'desc' ? `{ -${parsedSort[0].orderBy}: -1 }` : `{ ${parsedSort[0].orderBy}: 1 }`,
  };

  const users = await User.paginate(filterResults, adjustedOptions);

  // Enhance users with group information
  const usersWithGroups = await Promise.all(
    users.results.map(async (user) => {
      // Get user's primary group (first active membership)
      const primaryMembership = await Membership.findOne({
        user_id: user._id,
        status: 'active',
      }).populate('group_id', 'name iconUrl');

      // Get total groups count
      const totalGroups = await Membership.countDocuments({
        user_id: user._id,
        status: 'active',
      });

      return {
        ...user.toJSON(),
        primaryGroup: primaryMembership?.group_id || null,
        primaryRole: primaryMembership?.role || null,
        totalGroups,
      };
    })
  );

  users.results = usersWithGroups;
  users.hasNextPage = users.page < users.totalPages;
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<Object>} User with memberships
 */
const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Get user's memberships with group details
  const memberships = await Membership.find({ user_id: id })
    .populate('group_id', 'name iconUrl')
    .populate('invited_by', 'firstName lastName email')
    .sort({ createdAt: -1 });

  // Get primary group (first active membership)
  const primaryMembership = memberships.find((m) => m.status === 'active');

  return {
    user,
    memberships,
    primaryGroup: primaryMembership?.group_id || null,
    primaryRole: primaryMembership?.role || null,
    totalGroups: memberships.filter((m) => m.status === 'active').length,
    pendingInvitations: memberships.filter((m) => m.status === 'pending').length,
  };
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const userData = await getUserById(userId);
  if (!userData || !userData.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if email is already taken by another user
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // Handle password change - verify old password
  if (updateBody.password && updateBody.oldPassword) {
    const isPasswordMatch = await userData.user.isPasswordMatch(updateBody.oldPassword);
    if (!isPasswordMatch) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Current password is incorrect');
    }
  }

  // Update user fields
  Object.assign(userData.user, updateBody);
  await userData.user.save();
  return userData.user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

/**
 * Get user memberships with pagination
 * @param {ObjectId} userId
 * @param {Object} options - Query options
 * @returns {Promise<Object>} User memberships
 */
const getUserMemberships = async (userId, options = {}) => {
  const { page = 1, limit = 10, status } = options;

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const filter = { user_id: userId };
  if (status) {
    filter.status = status;
  }

  const memberships = await Membership.find(filter)
    .populate('group_id', 'name description createdBy isPersonal settings createdAt updatedAt iconUrl')
    .populate('invited_by', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Membership.countDocuments(filter);

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    memberships,
    total,
    page: page * 1,
    limit: limit * 1,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get user groups summary
 * @param {ObjectId} userId
 * @returns {Promise<Object>} User groups summary
 */
const getUserGroups = async (userId) => {
  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Get all memberships for this user (both active memberships and pending invitations)
  // Active memberships: user_id matches the user
  // Pending invitations: invitee_phone matches the user's phone number
  const memberships = await Membership.find({
    $or: [
      { user_id: userId }, // Active memberships
      {
        invitee_phone: user.phoneNumber?.toString(),
        status: 'pending',
      }, // Pending invitations by phone number (convert to string)
      {
        invitee_phone: user.phoneNumber,
        status: 'pending',
      }, // Pending invitations by phone number (as number)
    ],
  })
    .populate('group_id', 'name description createdBy isPersonal settings createdAt updatedAt iconUrl')
    .populate('invited_by', 'firstName lastName email');

  // Debug logging
  console.log('User groups query debug:', {
    userId,
    userPhoneNumber: user.phoneNumber,
    userPhoneNumberAsString: user.phoneNumber?.toString(),
    totalMemberships: memberships.length,
    activeMemberships: memberships.filter((m) => m.status === 'active').length,
    pendingMemberships: memberships.filter((m) => m.status === 'pending').length,
    pendingDetails: memberships
      .filter((m) => m.status === 'pending')
      .map((m) => ({
        id: m._id,
        invitee_phone: m.invitee_phone,
        group_id: m.group_id,
        invited_by: m.invited_by,
        token: m.token,
      })),
  });

  // Additional debug: Check all pending memberships in the database
  const allPendingMemberships = await Membership.find({ status: 'pending' });
  console.log('All pending memberships in database:', {
    count: allPendingMemberships.length,
    details: allPendingMemberships.map((m) => ({
      id: m._id,
      invitee_phone: m.invitee_phone,
      group_id: m.group_id,
      token: m.token,
    })),
  });

  const groupsByStatus = {
    active: memberships.filter((m) => m.status === 'active'),
    pending: memberships.filter((m) => m.status === 'pending'),
    declined: memberships.filter((m) => m.status === 'declined'),
    removed: memberships.filter((m) => m.status === 'removed'),
  };

  // Get role distribution
  const roleDistribution = memberships
    .filter((m) => m.status === 'active')
    .reduce((acc, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1;
      return acc;
    }, {});

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    groupsByStatus,
    roleDistribution,
    totalActiveGroups: groupsByStatus.active.length,
    totalPendingInvitations: groupsByStatus.pending.length,
    summary: {
      totalGroups: memberships.length,
      activeGroups: groupsByStatus.active.length,
      pendingInvitations: groupsByStatus.pending.length,
      primaryRole: groupsByStatus.active[0]?.role || null,
      primaryGroup: groupsByStatus.active[0]?.group_id || null,
    },
  };
};

/**
 * Set user's active group
 * @param {ObjectId} userId
 * @param {ObjectId} groupId
 * @returns {Promise<User>}
 */
const setActiveGroup = async (userId, groupId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Verify the group exists and user is a member
  const membership = await Membership.findOne({
    user_id: userId,
    group_id: groupId,
    status: 'active',
  });

  if (!membership) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a member of this group');
  }

  user.activeGroupId = groupId;
  await user.save();

  return user;
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  getUserMemberships,
  getUserGroups,
  setActiveGroup,
};
