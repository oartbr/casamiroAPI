const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { groupService } = require('../services');
const ApiError = require('../utils/ApiError');

const getGroup = catchAsync(async (req, res) => {
  const group = await groupService.getGroupByIdWithMemberships(req.params.groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }
  res.status(httpStatus.OK).json(group);
});

const createGroup = catchAsync(async (req, res) => {
  const group = await groupService.createGroup({
    ...req.body,
    createdBy: req.user.id,
    ownerId: req.user.id, // Set ownerId to the same as createdBy
  });
  res.status(httpStatus.CREATED).json(group);
});

const updateGroup = catchAsync(async (req, res) => {
  const group = await groupService.updateGroupById(req.params.groupId, req.body);
  res.status(httpStatus.OK).json(group);
});

const deleteGroup = catchAsync(async (req, res) => {
  await groupService.deleteGroupById(req.params.groupId);
  res.status(httpStatus.NO_CONTENT).send();
});

const updateGroupSettings = catchAsync(async (req, res) => {
  const group = await groupService.updateGroupSettings(req.params.groupId, req.body);
  res.status(httpStatus.OK).json(group);
});

module.exports = {
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  updateGroupSettings,
};
