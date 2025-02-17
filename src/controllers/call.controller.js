const httpStatus = require('http-status');
// const pick = require('../utils/pick');
// const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { callService } = require('../services');

const redirectNumber = process.env.TWILIO_REDIRECT_CALLS;

const incomingCall = catchAsync(async (req, res) => {
  const redirect = await callService.redirect(redirectNumber);
  res.status(httpStatus.OK).type('text/xml').send(redirect);
});

module.exports = {
  incomingCall,
};
