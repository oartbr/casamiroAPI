// src/services/twilioService.js
const twilio = require('twilio');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const { Garantia } = require('../models');
const { CheckPhoneNumber } = require('../models');

const messagingClient = new twilio(config.twilio.accountSid, config.twilio.authToken);

const confirmWhatsCode = async (phoneNumber, code, garantiaId) => {
  const checkConfirmed = await CheckPhoneNumber.checkExists({ garantiaId: garantiaId, confirmed: true });
  if(checkConfirmed){
    throw new ApiError(httpStatus.ACCEPTED, `Phone number was already confirmed.`);
  }
  const confirmPhoneNumberCode = await CheckPhoneNumber.confirmCode(phoneNumber, code, garantiaId);

  if (!confirmPhoneNumberCode) {
    const countFails = await CheckPhoneNumber.findOne({ garantiaId: garantiaId }).select('count');
    if(countFails === null){
      throw new ApiError(httpStatus.NOT_FOUND, `Code doesn't match, please request a new one.`);
    } else if (countFails.count > 3) {
      await CheckPhoneNumber.deleteOne({ garantiaId: garantiaId });
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, `Code doesn't match, please request a new one.`);
    }
    throw new ApiError(httpStatus.PRECONDITION_REQUIRED, `Code doesn't match. ${countFails.count} failed attempts.`);
  } else {
    const countFails = await CheckPhoneNumber.findOne({ phoneNumber: phoneNumber, garantiaId: garantiaId }, { $set: { confirmed: true } }, { upsert: true });
  }

  return true;
};

const sendMessage = async (phoneNumber, message, garantiaId) => {
  const toPhoneNumber = `whatsapp:${phoneNumber}`;
  const garantiaExists = await Garantia.isGarantiaTaken({ garantiaId });
  const checkExists = await CheckPhoneNumber.checkExists({ garantiaId });

  if (!checkExists) {
    const checkPhone = await CheckPhoneNumber.create({
      garantiaId,
      code: message,
      phoneNumber,
      count: 0,
    });
  } else {
    const checkPhoneMess = await CheckPhoneNumber.updateOne({ garantiaId: garantiaId }, { $set: { code: message } }, { upsert: true });
  }

  if (!garantiaExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Garantia doesn't exist.`);
  }

  try {
    const response = await messagingClient.messages
      .create({
        body: message,
        from: config.twilio.phoneNumber,
        to: toPhoneNumber,
      })
      .then((mess) => {
        
      });
    return response;
  } catch (error) {
    throw new Error(`Failed to send Message: ${error.message}`);
  }
  return true;
};

module.exports = {
  sendMessage,
  confirmWhatsCode,
};
