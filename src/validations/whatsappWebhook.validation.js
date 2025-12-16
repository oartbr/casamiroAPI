const Joi = require('joi');

// Twilio webhook validation (Twilio sends form-encoded data)
const handleWebhook = {
  body: Joi.object()
    .keys({
      From: Joi.string().optional(), // Sender phone number
      from: Joi.string().optional(), // Alternative field name
      Body: Joi.string().optional(), // Message body
      body: Joi.string().optional(), // Alternative field name
      MessageSid: Joi.string().optional(),
      AccountSid: Joi.string().optional(),
      // Allow other Twilio fields
    })
    .unknown(true), // Allow unknown fields from Twilio
};

module.exports = {
  handleWebhook,
};



