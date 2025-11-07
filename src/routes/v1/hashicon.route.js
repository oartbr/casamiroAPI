const express = require('express');
const hashiconController = require('../../controllers/hashicon.controller');

const router = express.Router();

// Test hashicon generation
router.get('/test', hashiconController.testHashicon);

// Test hashicon variations
router.get('/test-variations', hashiconController.testHashiconVariations);

module.exports = router;

