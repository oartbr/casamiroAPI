const express = require('express');
// const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const messagingValidation = require('../../validations/messaging.validation');
const messagingController = require('../../controllers/messaging.controller');

const router = express.Router();

router.post('/sendCode', validate(messagingValidation.sendCodeWhatsApp), messagingController.sendCodeWhatsApp);
router.post('/codeLogin', validate(messagingValidation.sendCodeWhatsApp), messagingController.sendWhats);
router.post('/confirmCode', validate(messagingValidation.confirmCode), messagingController.confirmCode);
router.post('/whatsIncoming', validate(messagingValidation.whatsIncoming), messagingController.whatsIncoming);

module.exports = router;
