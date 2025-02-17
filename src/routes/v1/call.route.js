const express = require('express');
// const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const callValidation = require('../../validations/call.validation');
const callController = require('../../controllers/call.controller');

const router = express.Router();

router.get('/incoming', validate(callValidation.incomingCall), callController.incomingCall);

/*
router
  .route('/')
  .post(auth('manageskus'), validate(skuValidation.createsku), skuController.createsku)
  .get(auth('getskus'), validate(skuValidation.getskus), skuController.getskus);

router
  .route('/:skuId')
  .get(auth('getskus'), validate(skuValidation.getsku), skuController.getsku)
  .patch(auth('manageskus'), validate(skuValidation.updatesku), skuController.updatesku)
  .delete(auth('manageskus'), validate(skuValidation.deletesku), skuController.deletesku); */

module.exports = router;
