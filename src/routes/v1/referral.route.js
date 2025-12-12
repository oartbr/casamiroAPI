const express = require('express');
const validate = require('../../middlewares/validate');
const referralController = require('../../controllers/referral.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/stats', auth(), referralController.getMyReferralStats);
router.get('/rankings', referralController.getReferralRankings);

module.exports = router;

