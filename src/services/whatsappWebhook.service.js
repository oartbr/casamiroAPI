const { runWorkflow } = require('./whatsappAgent.service');
const { sendWhatsAppMessage } = require('./messaging.service');
const logger = require('../config/logger');

/**
 * Process incoming WhatsApp message from Twilio
 * @param {Object} messageData - Twilio webhook data
 * @param {string} messageData.Body - Message body text
 * @param {string} messageData.From - Sender phone number (e.g., "whatsapp:+5511999999999")
 * @returns {Promise<Object>} Response to send back to user
 */
const processIncomingMessage = async (messageData) => {
  console.log({ messageData });
  try {
    const messageBody = messageData.Body || messageData.body || '';
    const fromNumber = messageData.From || messageData.from || '';

    // Extract phone number from Twilio format (whatsapp:+5511999999999 -> +5511999999999)
    const phoneNumber = fromNumber.replace(/^whatsapp:/, '').trim();

    // Remove + prefix and any non-numeric characters for database lookup
    // The userComm service expects phone numbers as strings or numbers
    // We'll pass it as-is and let the service handle conversion

    if (!messageBody || !phoneNumber) {
      logger.warn('Missing message body or phone number', { messageData });
      return {
        success: false,
        message: 'Missing required information',
      };
    }

    logger.info('Processing WhatsApp message', {
      phoneNumber,
      messageLength: messageBody.length,
    });

    // Run the agent workflow
    const workflowResult = await runWorkflow({
      input_as_text: messageBody,
      phone_number: phoneNumber,
    });

    // Extract response text
    let responseText = '';

    if (workflowResult.success === false) {
      // User not found or inactive
      responseText =
        workflowResult.message || 'Sorry, your phone number is not linked to an active account. Please contact support.';
    } else if (workflowResult.response) {
      // Agent provided a response
      responseText = workflowResult.response;
    } else if (workflowResult.safe_text) {
      // Guardrails passed, use safe text
      responseText = workflowResult.safe_text;
    } else {
      // Fallback response
      responseText = 'I received your message. How can I help you with your lists today?';
    }

    return {
      success: true,
      responseText,
      workflowResult,
    };
  } catch (error) {
    logger.error('Error processing WhatsApp message:', error);
    return {
      success: false,
      responseText: 'Sorry, I encountered an error processing your message. Please try again later.',
      error: error.message,
    };
  }
};

/**
 * Send response message via WhatsApp
 * @param {string} phoneNumber - Recipient phone number (without whatsapp: prefix)
 * @param {string} message - Message to send
 * @returns {Promise<void>}
 */
const sendWhatsAppResponse = async (phoneNumber, message) => {
  try {
    // sendWhatsAppMessage already adds whatsapp: prefix, so just pass the clean number
    await sendWhatsAppMessage(phoneNumber, message);
    logger.info('WhatsApp response sent', { phoneNumber });
  } catch (error) {
    logger.error('Error sending WhatsApp response:', error);
    throw error;
  }
};

module.exports = {
  processIncomingMessage,
  sendWhatsAppResponse,
};
