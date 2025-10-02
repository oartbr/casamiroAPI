const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');

const createUser = catchAsync(async (req, res) => {
  // console.log({body: req.body});
  const user = await userService.createUser(req.body);

  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  // const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sort', 'limit', 'page']);
  const filter = pick(req.query, ['filters']);
  // console.log({req: req.query, filter, options});
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const result = await userService.getUserById(req.params.userId);
  res.send(result);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getUserMemberships = catchAsync(async (req, res) => {
  const { page, limit, status } = req.query;
  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    status,
  };
  
  const result = await userService.getUserMemberships(req.params.userId, options);
  res.send(result);
});

const getUserGroups = catchAsync(async (req, res) => {
  const result = await userService.getUserGroups(req.params.userId);
  res.send(result);
});

const setActiveGroup = catchAsync(async (req, res) => {
  const { groupId } = req.body;
  const user = await userService.setActiveGroup(req.params.userId, groupId);
  res.send(user);
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserMemberships,
  getUserGroups,
  setActiveGroup,
};
