// const httpStatus = require('http-status');
const { Nota, User, Vendor } = require('../models');
// const ApiError = require('../utils/ApiError');
const CodeGenerator = require('../utils/generator');
const { SelectStateScraper } = require('../utils/scrapers/selectStateScraper');

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
    code: new CodeGenerator(9, 'string', 'm').code,
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

/**
 * load a nota:::: To-do from here
 * @param {Object} notaBody
 * @returns {Promise<Nota>}
 */
const loadNota = async (filter, options) => {
  const existing = await Nota.findOne(filter, {}, options);

  if (!existing) {
    throw new Error('Nota not found');
  }
  const selector = new SelectStateScraper(existing.url);
  const notaData = await selector.select();
  await notaData.readUrl();
  await notaData.readNota(existing);

  let existingVendor = await Vendor.findOne({ CNPJ: notaData.vendor.CNPJ });
  if (!existingVendor) {
    existingVendor = await Vendor.create({
      CNPJ: notaData.vendor.CNPJ,
      name: notaData.vendor.name,
      address: notaData.vendor.address,
    });
  }

  await existing.update({
    status: 'read',
    updatedAt: new Date(),
    vendor: existingVendor,
    purchaseDate: notaData.purchaseDate,
    items: notaData.items,
    total: notaData.total,
    vendorName: existingVendor.name,
  });

  return { existing };
};

/**
 * Get nota by id
 * @param {ObjectId} id
 * @returns {Promise<Nota>}
 */
const getNotaById = async (id) => {
  const nota = await Nota.findById(id);
  const vendor = await Vendor.findById(nota.vendor);
  nota.vendor = vendor;
  return nota;
};

module.exports = {
  checkNota,
  queryNotas,
  loadNota,
  getNotaById,
};
