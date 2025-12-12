const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const { tokenService } = require('../services');

/**
 * Get user's referral statistics
 */
const getMyReferralStats = catchAsync(async (req, res) => {
  const getVerifiedToken = await tokenService.verifyToken(req.headers.authorization, 'access');
  const stats = await userService.getUserReferralStats(getVerifiedToken.user);
  res.status(httpStatus.OK).send(stats);
});

/**
 * Get referral rankings
 */
const getReferralRankings = catchAsync(async (req, res) => {
  const { period = 'all', limit = 10 } = req.query;
  const rankings = await userService.getReferralRankings(period, parseInt(limit, 10));
  res.status(httpStatus.OK).send({ rankings, period, limit: parseInt(limit, 10) });
});

module.exports = {
  getMyReferralStats,
  getReferralRankings,
};

