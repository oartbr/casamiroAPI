const express = require('express');
// const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const filesValidation = require('../../validations/files.validation');
const filesController = require('../../controllers/files.controller');

const router = express.Router();

router.post('/upload/:filename', validate(filesValidation.postFile), filesController.postFile);

module.exports = router;
