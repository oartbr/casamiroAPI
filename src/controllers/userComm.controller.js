const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { userCommService } = require('../services');

/**
 * Get user context (groups and lists) by phone number
 * @route GET /v1/userComm/context
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserContext = catchAsync(async (req, res) => {
  const { phoneNumber } = req.query;

  if (!phoneNumber) {
    return res.status(httpStatus.BAD_REQUEST).send({
      success: false,
      message: 'Phone number is required',
    });
  }

  try {
    const context = await userCommService.getUserContext(phoneNumber);
    res.status(httpStatus.OK).send({
      success: true,
      data: context,
    });
  } catch (error) {
    // Handle specific error cases
    if (error.statusCode === httpStatus.NOT_FOUND || error.statusCode === httpStatus.FORBIDDEN) {
      res.status(error.statusCode).send({
        success: false,
        message: error.message,
      });
    } else {
      throw error;
    }
  }
});

/**
 * Add items to a list
 * @route POST /v1/userComm/lists/:listId/items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addItemsToList = catchAsync(async (req, res) => {
  const { listId } = req.params;
  const { phoneNumber, items } = req.body;

  if (!phoneNumber) {
    return res.status(httpStatus.BAD_REQUEST).send({
      success: false,
      message: 'Phone number is required',
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).send({
      success: false,
      message: 'Items array is required and must not be empty',
    });
  }

  const list = await userCommService.addItemsToList(listId, phoneNumber, items);
  res.status(httpStatus.OK).send({
    success: true,
    message: `Added ${items.length} item(s) to the list`,
    data: {
      listId: list._id.toString(),
      listName: list.name,
      itemsAdded: items.length,
    },
  });
});

/**
 * Remove items from a list
 * @route DELETE /v1/userComm/lists/:listId/items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeItemsFromList = catchAsync(async (req, res) => {
  const { listId } = req.params;
  const { phoneNumber, items } = req.body;

  if (!phoneNumber) {
    return res.status(httpStatus.BAD_REQUEST).send({
      success: false,
      message: 'Phone number is required',
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).send({
      success: false,
      message: 'Items array is required and must not be empty',
    });
  }

  const result = await userCommService.removeItemsFromList(listId, phoneNumber, items);
  res.status(httpStatus.OK).send({
    success: true,
    message: result.message,
    data: {
      listId: result.list._id.toString(),
      listName: result.list.name,
      itemsRemoved: result.removedCount,
    },
  });
});

/**
 * Get complete list by ID
 * @route GET /v1/userComm/lists/:listId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getListById = catchAsync(async (req, res) => {
  const { listId } = req.params;
  const { phoneNumber } = req.query;

  if (!phoneNumber) {
    return res.status(httpStatus.BAD_REQUEST).send({
      success: false,
      message: 'Phone number is required',
    });
  }

  const list = await userCommService.getListById(listId, phoneNumber);
  res.status(httpStatus.OK).send({
    success: true,
    data: list,
  });
});

module.exports = {
  getUserContext,
  addItemsToList,
  removeItemsFromList,
  getListById,
};
