const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { garantiaService } = require('../services');
// const { checkPhoneNumberService } = require('../services');
const CodeGenerator = require('../utils/generator');
const { qrcodeService } = require('../services');
const { filesService } = require('../services');
const { printService } = require('../services');

const create = catchAsync(async (req, res) => {
  const aGarantias = new CodeGenerator(req.body.length, req.body.type, req.body.prefix);
  aGarantias.create(req.body.quantity);

  const newGarantias = [];

  // Get the QRcode logo and BG images
  const logoBG = await qrcodeService.loadImage(process.env.COMPANY_LOGO);

  await Promise.all(
    aGarantias.collection.map(async (code) => {
      const qrCode = await qrcodeService.getQRcode(`${process.env.CORS_ORIGIN}/${code}`);
      const withCode = await qrcodeService.insertText(qrCode, code);
      const finalQR = await qrcodeService.insertLogo(withCode, logoBG);
      const fileUpload = await filesService.postQRcode(finalQR, code, 'garantias');
      const newGarantia = await garantiaService.create({
        garantiaId: code,
        brand: '',
        description: '',
        sku: '',
        url: fileUpload.url,
      });

      newGarantias.push(newGarantia);

      if (newGarantia === false) {
        throw new ApiError(httpStatus.BAD_REQUEST, `An error occurred while creating the garantias: ${newGarantias.length}`);
      }
    })
  );

  const printId = new CodeGenerator().code;
  const printFile = printService.createPrint(newGarantias, res, printId);

  if (printFile === false) {
    // throw new ApiError(httpStatus.BAD_REQUEST, 'An error occurred while printing the garantias');
  }
  res
    .status(httpStatus.CREATED)
    .send({ newGarantias, quantity: newGarantias.length, garantias: aGarantias.collection, printId, print: printFile });
});

const getPdfFile = catchAsync(async (req, res) => {
  const pdf = await printService.getPdfById(req.params.printId);
  if (!pdf) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Pdf not found');
  }
  res.send(pdf);
});

const getAvailable = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['brand']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await garantiaService.queryGarantias(filter, options);
  res.send(result);
});

const getGarantias = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sort', 'limit', 'page']);
  const filter = pick(req.query, ['filters']);
  const result = await garantiaService.queryGarantias(filter, options);
  // console.log({page: result.page, totalPages: result.totalPages, totalResults: result.totalResults, hasNextPage: result.hasNextPage});
  res.send(result);
});

const getGarantia = catchAsync(async (req, res) => {
  const userId = typeof req.params.userId !== 'undefined' ? req.params.userId : false;
  const garantia = await garantiaService.getGarantiaById(req.params.garantiaId, userId);

  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantia not found');
  }
  res.send({ garantia });
});

const assign = catchAsync(async (req, res) => {
  const garantia = await garantiaService.getGarantiaById(req.params.garantiaId, req.body);
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantia not found');
  } else if (
    garantia.status === 'shipped' ||
    garantia.status === 'delivered' ||
    garantia.status === 'cancelled' ||
    garantia.status === 'sold' ||
    garantia.status === 'registered'
  ) {
    throw new ApiError(httpStatus.LOCKED, 'Garantia already assigned');
  }
  const assignAction = await garantiaService.assign(garantia, req.body);
  // console.log({ assign: assignAction });
  res.status(httpStatus.OK).send(assignAction);
});

const qualityCheck = catchAsync(async (req, res) => {
  const garantia = await garantiaService.getGarantiaById(req.params.garantiaId, req.body);
  if (!garantia) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Garantia not found');
  } else if (
    garantia.status === 'shipped' ||
    garantia.status === 'delivered' ||
    garantia.status === 'cancelled' ||
    garantia.status === 'sold' ||
    garantia.status === 'registered'
  ) {
    throw new ApiError(httpStatus.LOCKED, 'Garantia already passed');
  }
  const qualityCheckAction = await garantiaService.qualityCheck(garantia, req.body);
  res.status(httpStatus.OK).send(qualityCheckAction);
});

const getUser = catchAsync(async (req, res) => {
  const user = await garantiaService.getUserByGarantiaId(req.params.garantiaId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const getList = catchAsync(async (req, res) => {
  const user = await garantiaService.getUserByGarantiaId(req.params.garantiaId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const garantias = await garantiaService.getGarantiasByUserId(user._id);

  res.send(garantias);
});

const getListByUser = catchAsync(async (req, res) => {
  const garantias = await garantiaService.getGarantiasByUserId(req.params.userId);

  if (!garantias) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found'); // to-do: check if the user exists, or inform there are not garantias for this user
  }

  res.send(garantias);
});

const register = catchAsync(async (req, res) => {
  const garantia = await garantiaService.register(req.body);

  res.status(httpStatus.OK).send(garantia);
});

const updateGarantia = catchAsync(async (req, res) => {
  const garantia = await garantiaService.updateGarantiaById(req.params.garantiaId, req.body);
  res.send(garantia);
});

const deleteGarantia = catchAsync(async (req, res) => {
  await garantiaService.deleteGarantiaById(req.params.garantiaId);
  res.status(httpStatus.NO_CONTENT).send({ success: 'Garantia deleted' });
});

const getPdfs = catchAsync(async (req, res) => {
  const pdfs = await printService.getPdfsByStatus(req.params.status);

  if (!pdfs) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Pdfs not found');
  }
  res.send(pdfs);
});

module.exports = {
  create,
  assign,
  qualityCheck,
  getAvailable,
  getGarantia,
  getGarantias,
  updateGarantia,
  deleteGarantia,
  getUser,
  getList,
  getListByUser,
  register,
  getPdfs,
  getPdfFile,
};
