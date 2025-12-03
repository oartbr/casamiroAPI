const express = require('express');
const validate = require('../../middlewares/validate');
const canonicalProductValidation = require('../../validations/canonicalProduct.validation');
const canonicalProductController = require('../../controllers/canonicalProduct.controller');

const router = express.Router();

router.post('/', validate(canonicalProductValidation.createCanonicalProduct), canonicalProductController.createCanonicalProduct);
router.get('/', validate(canonicalProductValidation.getAll), canonicalProductController.getAll);
router.get('/search', validate(canonicalProductValidation.search), canonicalProductController.search);
router.get('/:id', validate(canonicalProductValidation.getCanonicalProduct), canonicalProductController.getCanonicalProduct);
router.patch('/:id', validate(canonicalProductValidation.updateCanonicalProduct), canonicalProductController.updateCanonicalProduct);
router.delete('/:id', validate(canonicalProductValidation.deleteCanonicalProduct), canonicalProductController.deleteCanonicalProduct);
router.post('/from-nota-item', validate(canonicalProductValidation.createFromNotaItem), canonicalProductController.createFromNotaItem);

module.exports = router;

