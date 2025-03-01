// const httpStatus = require('http-status');
const { Nota, User } = require('../models');
// const ApiError = require('../utils/ApiError');

/**
 * check a nota
 * @param {Object} notaBody
 * @returns {Promise<Nota>}
 */
const checkNota = async (notaBody) => {
  const exists = await Nota.findOne({ notaUrl: notaBody.notaUrl });

  // Find the user by userId
  const user = await User.findById(notaBody.userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (exists) {
    return exists; // if it already exists, return it (or should it be an error?)
  }

  const newNota = await Nota.create({
    url: notaBody.notaUrl,
    user: user._id,
    status: 'pending',
    registeredAt: new Date(),
  });
  return newNota;
};

/**
 * Query for notas
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryNotas = async (filter, options) => {
  /* const newOptions = { ...options, sortBy: options.sortBy };
  const users = await User.paginate(filter, newOptions);
  return users; */

  const parsedFilter = filter.filters ? JSON.parse(filter.filters) : { status: [] };
  const parsedSort = 'sort' in options ? JSON.parse(options.sort) : '[{"orderBy": "updatedAt", "order": "desc"}]';
  const adjustedOptions = {
    limit: parseInt(options.limit, 10),
    offset: (parseInt(options.page, 10) - 1) * parseInt(options.limit, 10),
    sortBy:
      parsedSort && parsedSort[0].order === 'desc' ? `{ -${parsedSort[0].orderBy}: -1 }` : `{ ${parsedSort[0].orderBy}: 1 }`,
  };
  // console.log({ filterResults, adjustedOptions });
  const notas = await Nota.paginate(parsedFilter, adjustedOptions);
  notas.hasNextPage = notas.page < notas.totalPages;
  return notas;
};

module.exports = {
  checkNota,
  queryNotas,
};
