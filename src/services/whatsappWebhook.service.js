const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const { OpenAI } = require('openai');
const config = require('../config/config');
const logger = require('../config/logger');
const { fixPhoneNumber } = require('../utils/phoneNumbers');
const { runWorkflow } = require('./whatsappAgent.service');
const { sendWhatsAppMessage } = require('./messaging.service');
/**
 * Download media file from Twilio
 * @param {string} mediaUrl - Twilio media URL
 * @returns {Promise<Buffer>} Media file as buffer
 */
const downloadMediaFromTwilio = async (mediaUrl) => {
  try {
    // Twilio media URLs require authentication
    // Use Twilio account SID and auth token for basic auth
    const auth = Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64');

    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      headers: {
        Authorization: `Basic ${auth}`,
      },
      maxContentLength: 50 * 1024 * 1024, // 50MB max
      timeout: 30000, // 30 second timeout
    });

    return Buffer.from(response.data);
  } catch (error) {
    logger.error('Error downloading media from Twilio:', error);
    throw new Error(`Failed to download media: ${error.message}`);
  }
};

/**
 * Get file extension from content type
 * @param {string} contentType - MIME type
 * @returns {string} File extension
 */
const getFileExtension = (contentType) => {
  const extensions = {
    'audio/ogg': 'ogg',
    'audio/oga': 'oga',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/aac': 'aac',
    'audio/m4a': 'm4a',
  };
  return extensions[contentType && typeof contentType === 'string' ? contentType.toLowerCase() : ''] || 'ogg';
};

/**
 * Transcribe audio file using OpenAI Whisper API
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} contentType - MIME type of the audio file
 * @returns {Promise<string>} Transcribed text
 */
const transcribeAudio = async (audioBuffer, contentType) => {
  // Create a temporary file for the audio
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `audio_${Date.now()}.${getFileExtension(contentType)}`);

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Write buffer to temp file
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(tempFilePath, audioBuffer);

    // OpenAI SDK v4 for Node.js accepts file paths directly
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const transcription = await openai.audio.transcriptions.create({
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'pt', // Portuguese for Brazil
      response_format: 'text',
    });

    // Handle both string and object responses
    // When response_format is 'text', it returns a string directly
    const transcribedText = typeof transcription === 'string' ? transcription : transcription.text || String(transcription);

    return transcribedText;
  } catch (error) {
    logger.error('Error transcribing audio with Whisper:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  } finally {
    // Clean up temp file
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(tempFilePath)) {
      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.unlinkSync(tempFilePath);
      } catch (unlinkError) {
        logger.warn('Failed to delete temp file:', unlinkError);
      }
    }
  }
};

/**
 * Process incoming WhatsApp message from Twilio
 * @param {Object} messageData - Twilio webhook data
 * @param {string} messageData.Body - Message body text
 * @param {string} messageData.From - Sender phone number (e.g., "whatsapp:+5511999999999")
 * @param {number} messageData.NumMedia - Number of media attachments
 * @param {string} messageData.MediaUrl0 - URL of first media file
 * @param {string} messageData.MediaContentType0 - Content type of first media file
 * @returns {Promise<Object>} Response to send back to user
 */
const processIncomingMessage = async (messageData) => {
  try {
    const fromNumber = messageData.From || messageData.from || '';
    // Extract phone number from Twilio format (whatsapp:+5511999999999 -> +5511999999999)
    const phoneNumber = fixPhoneNumber(fromNumber.replace(/^whatsapp:/, '').trim());

    if (!phoneNumber) {
      logger.warn('Missing phone number', { messageData });
      return {
        success: false,
        message: 'Missing phone number',
      };
    }

    let messageBody = messageData.Body || messageData.body || '';
    const numMedia = parseInt(messageData.NumMedia || '0', 10);

    // Handle media messages (audio, voice notes, etc.)
    if (numMedia > 0) {
      const mediaUrl = messageData.MediaUrl0;
      const contentType = messageData.MediaContentType0;

      if (!mediaUrl || !contentType) {
        logger.warn('Media message missing URL or content type', { messageData });
        return {
          success: false,
          message: 'Media message is missing required information',
        };
      }

      // Check if it's an audio file that can be transcribed
      const isAudio = contentType.startsWith('audio/');

      if (isAudio) {
        try {
          logger.info('Processing audio media message', {
            mediaUrl,
            contentType,
            phoneNumber,
          });

          // Download the media file
          const audioBuffer = await downloadMediaFromTwilio(mediaUrl);

          // Transcribe audio using OpenAI Whisper API
          const transcription = await transcribeAudio(audioBuffer, contentType);

          // Use transcription as the message body
          messageBody = transcription.trim();

          logger.info('Audio transcribed successfully', {
            phoneNumber,
            transcriptionLength: messageBody.length,
          });
        } catch (error) {
          logger.error('Error processing audio media:', error);
          return {
            success: false,
            message: 'Sorry, I could not process the audio message. Please try sending a text message.',
            error: error.message,
          };
        }
      } else {
        // Non-audio media (images, videos, documents)
        logger.info('Received non-audio media message', {
          contentType,
          phoneNumber,
        });
        return {
          success: false,
          message: 'Sorry, I can only process text and audio messages. Please send a text or voice message.',
        };
      }
    }

    // If no message body after processing media, return error
    if (!messageBody || messageBody.trim().length === 0) {
      logger.warn('Missing message body after processing', { messageData });
      return {
        success: false,
        message: 'Message body is required',
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
    await sendWhatsAppMessage(fixPhoneNumber(phoneNumber), message);
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
