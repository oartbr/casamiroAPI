// src/services/twilioService.js
const Twilio = require('twilio');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
// const { Garantia } = require('../models');
const { CheckPhoneNumber } = require('../models');
const { User } = require('../models');
const { Whats } = require('../models');

const messagingClient = new Twilio(config.twilio.accountSid, config.twilio.authToken);

const confirmWhatsCode = async (code, garantiaId) => {
  const confirmPhoneNumberCode = await CheckPhoneNumber.confirmCode(code, garantiaId);

  if (!confirmPhoneNumberCode) {
    const countFails = await CheckPhoneNumber.findOne({ garantiaId });
    if (countFails === null) {
      throw new ApiError(httpStatus.NOT_FOUND, `Code doesn't match, please request a new one.`);
    } else if (countFails.confirmed === true) {
      throw new ApiError(httpStatus.ALREADY_REPORTED, `This code was already confirmed, please request a new one.`);
    } else if (countFails.count > 3) {
      await CheckPhoneNumber.deleteOne({ garantiaId });
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, `Code doesn't match, please request a new one.`);
    } else {
      throw new ApiError(httpStatus.PRECONDITION_REQUIRED, `Code doesn't match. ${countFails.count} failed attempts.`);
    }
  } else {
    await CheckPhoneNumber.findOneAndUpdate({ code, garantiaId }, { $set: { confirmed: true } }, { upsert: true });
  }

  return true;
};

const confirmWhatsCodeLogin = async (code, phoneNumber) => {
  const confirmPhoneNumberCode = await CheckPhoneNumber.confirmCodeLogin(code, phoneNumber);

  if (!confirmPhoneNumberCode) {
    const countFails = await CheckPhoneNumber.findOne({ phoneNumber });
    if (countFails === null) {
      throw new ApiError(httpStatus.NOT_FOUND, `Code doesn't match, please request a new one.`);
    } else if (countFails.confirmed === true) {
      throw new ApiError(httpStatus.ALREADY_REPORTED, `This code was already confirmed, please request a new one.`);
    } else if (countFails.count > 3) {
      await CheckPhoneNumber.deleteOne({ phoneNumber });
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, `Code doesn't match, please request a new one.`);
    } else {
      throw new ApiError(httpStatus.PRECONDITION_REQUIRED, `Code doesn't match. ${countFails.count} failed attempts.`);
    }
  } else {
    await CheckPhoneNumber.findOneAndUpdate({ code, phoneNumber }, { $set: { confirmed: true } }, { upsert: true });
  }
  const user = await User.findOne({ phoneNumber });

  return { user, phoneNumber, confirmed: true };
};

const sendMessage = async (phoneNumber, message) => {
  const toPhoneNumber = `whatsapp:${phoneNumber}`;

  const checkExists = await CheckPhoneNumber.checkExists({ phoneNumber });

  if (!checkExists) {
    await CheckPhoneNumber.create({
      code: message,
      phoneNumber,
      count: 0,
    });
  } else {
    await CheckPhoneNumber.updateOne(
      { phoneNumber },
      { $set: { code: message, confirmed: false, count: 0, phoneNumber } },
      { upsert: true }
    );
  }

  try {
    const response = await messagingClient.messages
      .create({
        body: message,
        from: config.twilio.phoneNumber,
        to: toPhoneNumber,
      })
      .then(() => {
        // console.log(mess);
      });
    return response;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Failed to send Message: ${error.message}`);
  }
  // return true;
};

// this function sends an authentication to the user's phone number
const sendMessageLogin = async (phoneNumber, message) => {
  const toPhoneNumber = `whatsapp:${phoneNumber}`;

  const checkExists = await CheckPhoneNumber.checkExists({ phoneNumber }); // is the number on the db already?

  if (!checkExists) {
    // if not, create a new entry
    await CheckPhoneNumber.create({
      code: message,
      phoneNumber,
      count: 0,
    });
  } else {
    // if it is, update the entry with the new code
    await CheckPhoneNumber.updateOne(
      { phoneNumber },
      { $set: { code: message, confirmed: false, count: 0 } },
      { upsert: true }
    );
  }

  try {
    // send the code via whatsapp.
    // The message is a template that will be replaced by the code
    // The trick here is that we don't send a message, but a contentVariable with the code inside a template {{1:code}}
    // t still needs to receive the body of the message, but it will be replaced by the code
    const response = await messagingClient.messages
      .create({
        body: `{{${message}}}`,
        from: config.twilio.phoneNumber,
        contentSid: config.WA.authenticationId,
        to: toPhoneNumber,
        contentVariables: JSON.stringify({
          1: message,
        }),
      })
      .then(() => {});
    return response;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Failed to send Message: ${error.message}`);
  }
  // return true;
};

const replyMessage = async (phoneNumber, message) => {
  const toPhoneNumber = `${phoneNumber}`;

  try {
    const response = await messagingClient.messages
      .create({
        body: message,
        from: config.twilio.phoneNumber,
        to: toPhoneNumber,
      })
      .then(() => {
        // console.log(mess);
      });
    return response;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Failed to send Message: ${error.message}`);
  }
  return true;
};

const whatsIncoming = async (req, res, openAIKey) => {
  const whats = await Whats.create( req.body );
  // console.log({key: config.openAI.key});
  const resp = await getChat(whats.Body);
  await whats.update({resp});
  const reply = await replyMessage(whats.From, resp);
  return {resp, reply};
};

const getChat = async (prompt) => {
  const apiKey =  config.openAI.key; // to-do list... get the OpenAI API key
  const apiUrl = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(apiUrl, {
  method: "POST",
  headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: 'user', temperature: 0.9, content: prompt + ". Responda de forma corta y puntual, demostrando que sabe del asunto."}],
  }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

module.exports = {
  sendMessage,
  confirmWhatsCode,
  sendMessageLogin,
  confirmWhatsCodeLogin,
  whatsIncoming,
};
