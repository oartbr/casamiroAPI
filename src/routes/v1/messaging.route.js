const express = require('express');
// const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const messagingValidation = require('../../validations/messaging.validation');
const messagingController = require('../../controllers/messaging.controller');

const router = express.Router();

router.post('/sendCode', validate(messagingValidation.sendCodeWhatsApp), messagingController.sendCodeWhatsApp);
router.post('/confirmCode', validate(messagingValidation.confirmCode), messagingController.confirmCode);

module.exports = router;
