const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { User, Group, Membership } = require('../models');
const ApiError = require('../utils/ApiError');

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

    // Create a default group
    const defaultGroupName = `${user[0].firstName} [Personal]`;
    const group = await Group.create(
      [
        {
          name: defaultGroupName,
        },
      ],
      { session }
    );

    // Create a membership linking the user to the group
    await Membership.create(
      [
        {
          user_id: user[0]._id,
          group_id: group[0]._id,
          invited_by: user[0]._id, // User is their own inviter for default group
          status: 'active',
          role: 'admin', // Default to admin for their own group
          accepted_at: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return { user: user[0], group: group[0] };
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
  /* const newOptions = { ...options, sortBy: options.sortBy };
  const users = await User.paginate(filter, newOptions);
  return users; */

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
  // console.log({ filterResults, adjustedOptions });
  const users = await User.paginate(filterResults, adjustedOptions);
  users.hasNextPage = users.page < users.totalPages;
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id);
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
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
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

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};
