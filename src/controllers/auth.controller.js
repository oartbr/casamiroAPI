const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService, messagingService } = require('../services');
const CodeGenerator = require('../utils/generator');

const register = catchAsync(async (req, res) => {
  const { user, group } = await userService.createUser(req.body);
  
  // Send WhatsApp verification code instead of generating tokens
  // User will need to verify phone before they can login
  const oCode = new CodeGenerator(5, 'number');
  // Ensure phone number has + prefix for WhatsApp
  let phoneNumber = user.phoneNumber ? user.phoneNumber.toString() : null;
  if (phoneNumber && !phoneNumber.startsWith('+')) {
    phoneNumber = `+${phoneNumber}`;
  }
  
  if (phoneNumber) {
    await messagingService.sendMessageLogin(phoneNumber, oCode.code);
  }
  
  // Return user without tokens - tokens will be generated after phone verification
  res.status(httpStatus.CREATED).send({ 
    user: {
      ...user.toJSON(),
      // Don't include sensitive data
      password: undefined,
    },
    group,
    message: 'User created. Verification code sent to WhatsApp.',
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, token: tokens.token, refreshToken: tokens.refreshToken, tokenExpires: tokens.tokenExpires });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

const getMe = catchAsync(async (req, res) => {
  const getVerifiedToken = await tokenService.verifyToken(req.headers.authorization, 'access');
  const user = await userService.getUserById(getVerifiedToken.user);
  res.status(httpStatus.OK).send(user);
});

const patchMe = catchAsync(async (req, res) => {
  const getVerifiedToken = await tokenService.verifyToken(req.headers.authorization, 'access');
  const updatedUser = await userService.updateUserById(getVerifiedToken.user, req.body);
  res.status(httpStatus.OK).send(updatedUser);
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  getMe,
  patchMe,
};
