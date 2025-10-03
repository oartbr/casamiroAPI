const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createList = {
  body: Joi.object().keys({
    name: Joi.string().required().trim().max(100),
    description: Joi.string().optional().trim().max(500),
    groupId: Joi.string().custom(objectId).required(),
    isDefault: Joi.boolean().optional().default(false),
    settings: Joi.object().keys({
      allowItemDeletion: Joi.boolean().optional().default(true),
      requireApprovalForItems: Joi.boolean().optional().default(false),
    }).optional(),
  }),
};

const getLists = {
  query: Joi.object().keys({
    groupId: Joi.string().custom(objectId).optional(),
    name: Joi.string().optional(),
    isDefault: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional().default(10),
    page: Joi.number().integer().min(1).optional().default(1),
  }),
};

const getList = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
};

const getListsByGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional().default(10),
    page: Joi.number().integer().min(1).optional().default(1),
  }),
};

const getDefaultListByGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
};

const updateList = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().optional().trim().max(100),
    description: Joi.string().optional().trim().max(500),
    isDefault: Joi.boolean().optional(),
    settings: Joi.object().keys({
      allowItemDeletion: Joi.boolean().optional(),
      requireApprovalForItems: Joi.boolean().optional(),
    }).optional(),
  }).min(1),
};

const deleteList = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
};

const createListItem = {
  body: Joi.object().keys({
    text: Joi.string().required().trim().max(500),
    listId: Joi.string().custom(objectId).required(),
    isCompleted: Joi.boolean().optional().default(false),
    order: Joi.number().integer().min(0).optional(),
  }),
};

const getListItems = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    isCompleted: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional().default(50),
    page: Joi.number().integer().min(1).optional().default(1),
  }),
};

const updateListItem = {
  params: Joi.object().keys({
    itemId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    text: Joi.string().optional().trim().max(500),
    isCompleted: Joi.boolean().optional(),
    order: Joi.number().integer().min(0).optional(),
  }).min(1),
};

const deleteListItem = {
  params: Joi.object().keys({
    itemId: Joi.string().custom(objectId).required(),
  }),
};

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


