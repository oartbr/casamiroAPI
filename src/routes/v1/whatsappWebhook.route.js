const express = require('express');
const validate = require('../../middlewares/validate');
const whatsappWebhookValidation = require('../../validations/whatsappWebhook.validation');
const whatsappWebhookController = require('../../controllers/whatsappWebhook.controller');

const router = express.Router();

// Twilio webhook endpoint for incoming WhatsApp messages
// Note: Twilio sends form-encoded data, so we use express.urlencoded() middleware
router.post(
  '/webhook',
  express.urlencoded({ extended: true }), // Parse Twilio form-encoded data
  validate(whatsappWebhookValidation.handleWebhook),
  whatsappWebhookController.handleWebhook
);

module.exports = router;



