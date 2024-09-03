const express = require('express');
// const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const qrcodeValidation = require('../../validations/qrcode.validation');
const qrcodeController = require('../../controllers/qrcode.controller');

const router = express.Router();

router.get('/create/:url', validate(qrcodeValidation.getQRcode), qrcodeController.getQRcode);

module.exports = router;
