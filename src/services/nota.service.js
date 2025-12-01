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
    groupId: user.activeGroupId, // Include the user's active group ID
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
  // Default to sorting by purchaseDate descending (newest first)
  const parsedSort = 'sort' in options ? JSON.parse(options.sort) : '[{"orderBy": "purchaseDate", "order": "desc"}]';
  
  // Add group filtering if groupId is provided
  if (parsedFilter.groupId) {
    parsedFilter.groupId = parsedFilter.groupId;
  }
  
  const adjustedOptions = {
    limit: parseInt(options.limit, 10),
    page: parseInt(options.page, 10) || 1,
    sortBy:
      parsedSort && parsedSort[0] && parsedSort[0].orderBy
        ? `${parsedSort[0].orderBy}:${parsedSort[0].order || 'desc'}`
        : 'purchaseDate:desc',
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

/**
 * Get spending statistics for a user
 * @param {Object} filter - Filter object with userId and optionally groupId
 * @returns {Promise<Object>} Spending statistics
 */
const getSpendingStatistics = async (filter) => {
  const now = new Date();
  const userId = filter.userId;
  const groupId = filter.groupId;

  // Build base filter - ensure purchaseDate exists and is not null
  // Only count notas with status 'read' that have a purchaseDate and total > 0
  const baseFilter = {
    user: userId,
    status: 'read',
    total: { $exists: true, $gt: 0 },
    purchaseDate: { $exists: true, $ne: null },
  };

  if (groupId) {
    const mongoose = require('mongoose');
    baseFilter.groupId = mongoose.Types.ObjectId.isValid(groupId) 
      ? mongoose.Types.ObjectId(groupId) 
      : groupId;
  }

  // Current week (Monday to Sunday)
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  currentWeekStart.setHours(0, 0, 0, 0);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sunday
  currentWeekEnd.setHours(23, 59, 59, 999);

  // Last 7 days
  const last7DaysStart = new Date(now);
  last7DaysStart.setDate(now.getDate() - 7);
  last7DaysStart.setHours(0, 0, 0, 0);

  // Last 30 days
  const last30DaysStart = new Date(now);
  last30DaysStart.setDate(now.getDate() - 30);
  last30DaysStart.setHours(0, 0, 0, 0);

  // Current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  currentMonthStart.setHours(0, 0, 0, 0);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  currentMonthEnd.setHours(23, 59, 59, 999);

  // Previous month
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  previousMonthStart.setHours(0, 0, 0, 0);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  previousMonthEnd.setHours(23, 59, 59, 999);

  // Debug: Log the filter and date ranges (for troubleshooting)
  // console.log('Spending statistics filter:', JSON.stringify(baseFilter, null, 2));
  // console.log('Date ranges:', {
  //   currentWeek: { start: currentWeekStart, end: currentWeekEnd },
  //   last7Days: { start: last7DaysStart, end: now },
  //   last30Days: { start: last30DaysStart, end: now },
  //   currentMonth: { start: currentMonthStart, end: currentMonthEnd },
  //   previousMonth: { start: previousMonthStart, end: previousMonthEnd },
  // });

  // Aggregate queries - all based on purchaseDate
  const [
    currentWeekTotal,
    last7DaysTotal,
    last30DaysTotal,
    currentMonthTotal,
    previousMonthTotal,
  ] = await Promise.all([
    Nota.aggregate([
      {
        $match: {
          ...baseFilter,
          purchaseDate: {
            $gte: currentWeekStart,
            $lte: currentWeekEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]),
    Nota.aggregate([
      {
        $match: {
          ...baseFilter,
          purchaseDate: {
            $gte: last7DaysStart,
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]),
    Nota.aggregate([
      {
        $match: {
          ...baseFilter,
          purchaseDate: {
            $gte: last30DaysStart,
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]),
    Nota.aggregate([
      {
        $match: {
          ...baseFilter,
          purchaseDate: {
            $gte: currentMonthStart,
            $lte: currentMonthEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]),
    Nota.aggregate([
      {
        $match: {
          ...baseFilter,
          purchaseDate: {
            $gte: previousMonthStart,
            $lte: previousMonthEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]),
  ]);

  const result = {
    currentWeek: currentWeekTotal[0]?.total || 0,
    last7Days: last7DaysTotal[0]?.total || 0,
    last30Days: last30DaysTotal[0]?.total || 0,
    currentMonth: currentMonthTotal[0]?.total || 0,
    previousMonth: previousMonthTotal[0]?.total || 0,
  };

  // Debug logging (uncomment to troubleshoot)
  // console.log('Spending statistics results:', result);
  // console.log('Aggregation results:', {
  //   currentWeekTotal,
  //   last7DaysTotal,
  //   last30DaysTotal,
  //   currentMonthTotal,
  //   previousMonthTotal,
  // });

  return result;
};

/**
 * Get basic nota details from last 30 days
 * @param {Object} filter - Filter object with userId and optionally groupId
 * @returns {Promise<Array>} Array of basic nota details
 */
const getLast30DaysNotas = async (filter) => {
  const now = new Date();
  const userId = filter.userId;
  const groupId = filter.groupId;

  const last30DaysStart = new Date(now);
  last30DaysStart.setDate(now.getDate() - 30);
  last30DaysStart.setHours(0, 0, 0, 0);

  const baseFilter = {
    user: userId,
    status: 'read',
    purchaseDate: { $gte: last30DaysStart, $lte: now },
  };

  if (groupId) {
    baseFilter.groupId = groupId;
  }

  const notas = await Nota.find(baseFilter)
    .select('purchaseDate total vendorName vendor')
    .populate('vendor', 'name')
    .sort({ purchaseDate: -1 })
    .lean();

  return notas.map((nota) => ({
    date: nota.purchaseDate,
    total: nota.total || 0,
    vendor: nota.vendorName || (nota.vendor && nota.vendor.name) || 'Unknown',
  }));
};

module.exports = {
  checkNota,
  queryNotas,
  loadNota,
  getNotaById,
  getSpendingStatistics,
  getLast30DaysNotas,
};
