const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { onboardingService } = require('../services');

const getOnboardingStatus = catchAsync(async (req, res) => {
  const status = await onboardingService.getOnboardingStatus(req.params.userId);
  res.send(status);
});

const updateOnboardingContext = catchAsync(async (req, res) => {
  const user = await onboardingService.updateOnboardingContext(req.params.userId, req.body.context);
  res.send(user);
});

const completeOnboarding = catchAsync(async (req, res) => {
  const user = await onboardingService.completeOnboarding(req.params.userId);
  res.send(user);
});

const checkUserActivation = catchAsync(async (req, res) => {
  const activation = await onboardingService.checkUserActivation(req.params.userId);
  res.send(activation);
});

module.exports = {
  getOnboardingStatus,
  updateOnboardingContext,
  completeOnboarding,
  checkUserActivation,
};

