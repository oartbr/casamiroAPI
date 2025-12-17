const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { whatsappWebhookService } = require('../services');
const logger = require('../config/logger');

/**
 * Handle incoming WhatsApp webhook from Twilio
 * @route POST /v1/whatsapp/webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleWebhook = catchAsync(async (req, res) => {
  try {
    // Twilio sends data as form-encoded, so it's in req.body
    const messageData = req.body;

    const numMedia = parseInt(messageData.NumMedia || '0', 10);

    logger.info('Received WhatsApp webhook', {
      from: messageData.From,
      body: messageData.Body ? messageData.Body.substring(0, 100) : 'No body',
      numMedia,
      hasMedia: numMedia > 0,
    });

    // Process the message (service will handle media transcription if needed)
    const result = await whatsappWebhookService.processIncomingMessage(messageData);

    // Send response back to user
    if (result.success && result.responseText) {
      const fromNumber = messageData.From || messageData.from || '';
      // Extract phone number from Twilio format
      const phoneNumber = fromNumber.replace(/^whatsapp:/, '').trim();

      try {
        await whatsappWebhookService.sendWhatsAppResponse(phoneNumber, result.responseText);
      } catch (sendError) {
        logger.error('Failed to send WhatsApp response:', sendError);
        // Continue anyway - we'll return 200 to Twilio
      }
    }

    // Return TwiML response (Twilio expects XML or 200 OK)
    // For async processing, we can return 200 immediately
    res.status(httpStatus.OK).send('OK');
  } catch (error) {
    logger.error('Error in WhatsApp webhook handler:', error);
    // Return 200 to Twilio even on error to prevent retries
    res.status(httpStatus.OK).send('OK');
  }
});

const handleCallback = catchAsync(async (req, res) => {
  try {
    // TODO: Implement WhatsApp callback handler
  } catch (error) {
    logger.error('Error in WhatsApp callback handler:', error);
    // Return 200 to Twilio even on error to prevent retries
    res.status(httpStatus.OK).send('OK');
  }
});

module.exports = {
  handleWebhook,
  handleCallback,
};
