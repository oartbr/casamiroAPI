const express = require('express');
const validate = require('../../middlewares/validate');
const onboardingValidation = require('../../validations/onboarding.validation');
const onboardingController = require('../../controllers/onboarding.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/:userId/status', auth(), validate(onboardingValidation.getOnboardingStatus), onboardingController.getOnboardingStatus);
router.patch('/:userId/context', auth(), validate(onboardingValidation.updateOnboardingContext), onboardingController.updateOnboardingContext);
router.patch('/:userId/complete', auth(), validate(onboardingValidation.completeOnboarding), onboardingController.completeOnboarding);
router.get('/:userId/activation', auth(), validate(onboardingValidation.checkUserActivation), onboardingController.checkUserActivation);

module.exports = router;

