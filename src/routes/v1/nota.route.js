const express = require('express');
// const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const notaValidation = require('../../validations/nota.validation');
const notaController = require('../../controllers/nota.controller');

const router = express.Router();

router.post('/check', validate(notaValidation.checkNota), notaController.checkNota);
router.get('/getAll', validate(notaValidation.getAll), notaController.getAll);
router.get('/load', validate(notaValidation.loadNota), notaController.loadNota);
router.get('/get/:id', validate(notaValidation.getNota), notaController.getNota);
/*
router.get('/getAll', validate(notaValidation.getnotas), notaController.getnotas);
router.get('/:id', validate(notaValidation.getnota), notaController.getnota);
router.get('/', validate(notaValidation.getnotas), notaController.getnotas);
router.patch('/:id', validate(notaValidation.updatenota), notaController.updatenota);
router.delete('/:notaId', validate(notaValidation.deletenota), notaController.deletenota);
*/
module.exports = router;
