const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { notaService } = require('../services');

const checkNota = catchAsync(async (req, res) => {
  // console.log({body: req.body});
  const nota = await notaService.checkNota(req.body);

  res.status(httpStatus.CREATED).send({ nota });
});

const getAll = catchAsync(async (req, res) => {
  // const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sort', 'limit', 'page']);
  const filter = pick(req.query, ['filters']);
  // console.log({req: req.query, filter, options});
  const result = await notaService.queryNotas(filter, options);
  res.status(httpStatus.OK).send(result);
});

const loadNota = catchAsync(async (req, res) => {
  const filter = { status: 'pending' };
  const options = { sort: { createdAt: 1 }, limit: 1 };
  const result = await notaService.loadNota(filter, options);
  res.send(result);
});

const getNotas = catchAsync(async (req, res) => {
  // const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sort', 'limit', 'page']);
  const filter = pick(req.query, ['filters']);
  // console.log({req: req.query, filter, options});
  const result = await notaService.queryNotas(filter, options);
  res.send(result);
});

const getNota = catchAsync(async (req, res) => {
  const nota = await notaService.getNotaById(req.params.id);
  if (!nota) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Nota not found');
  }
  res.send({ nota });
});

const updateNota = catchAsync(async (req, res) => {
  const nota = await notaService.updateNotaById(req.params.id, req.body);
  res.send(nota);
});

const deleteNota = catchAsync(async (req, res) => {
  const nota = await notaService.deleteNotaById(req.params.notaId);
  res.status(httpStatus.OK).send({ message: `Nota ${nota.notaId} successfully deleted` });
});

module.exports = {
  checkNota,
  getAll,
  getNotas,
  getNota,
  loadNota,
  updateNota,
  deleteNota,
};
