const { twiml } = require('twilio');

/**
 * Redirect an incoming call to Twilio number
 * @param {string} source
 * @returns {twiml}
 */
const redirect = async (phoneNumber) => {
  const { VoiceResponse } = twiml;
  const response = new VoiceResponse();
  response.dial(phoneNumber);
  return response.toString();
};
module.exports = {
  redirect,
};
