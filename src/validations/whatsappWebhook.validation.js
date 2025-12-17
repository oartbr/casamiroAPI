const Joi = require('joi');

// Twilio webhook validation (Twilio sends form-encoded data)
const handleWebhook = {
  body: Joi.object()
    .keys({
      Body: Joi.string().allow('').optional(), // Message body (can be empty for media/location messages)
      From: Joi.string().optional(), // Sender phone number
      from: Joi.string().optional(), // Alternative field name
      body: Joi.string().allow('').optional(), // Alternative field name (can be empty)
      MessageSid: Joi.string().optional(),
      AccountSid: Joi.string().optional(),
      NumMedia: Joi.string().optional(), // Number of media attachments
      MediaUrl0: Joi.string().uri().optional(), // URL of first media file
      MediaContentType0: Joi.string().optional(), // Content type of first media file
      // Allow other Twilio fields
    })
    .unknown(true), // Allow unknown fields from Twilio
};
const handleCallback = {
  body: Joi.object()
    .keys({
      MessageSid: Joi.string().optional(),
      AccountSid: Joi.string().optional(),
    })
    .unknown(true), // Allow unknown fields from Twilio
};
module.exports = {
  handleWebhook,
  handleCallback,
};
