const express = require('express');
// const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
// const cronValidation = require('../../validations/cron.validation');
// const cronController = require('../../controllers/cron.controller');
const notaValidation = require('../../validations/nota.validation');
const notaController = require('../../controllers/nota.controller');

const router = express.Router();

router.get('/load', validate(notaValidation.loadNota), notaController.loadNota);

module.exports = router;
