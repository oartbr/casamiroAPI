const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { qrcodeService } = require('../services');

const getQRcode = catchAsync(async (req, res) => {
  const qrCode = await qrcodeService.getQRcode(req.params.url);

  if (qrCode !== null) {
    return res.status(httpStatus.CREATED).send(qrCode);
  }
  return res.status(httpStatus.BAD_REQUEST).send('Error when creating the QR code.');
});

module.exports = {
  getQRcode,
};
