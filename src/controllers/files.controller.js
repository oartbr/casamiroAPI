// const { put } = require('@vercel/blob');

const httpStatus = require('http-status');
// const formidable = require('formidable');
// const IncomingMessage = require('http');
const catchAsync = require('../utils/catchAsync');
const { filesService } = require('../services');

const postFile = catchAsync(async (req, res) => {
  const fileUpload = await filesService.postFile(req);
  // console.log("beta");
  if (fileUpload !== null) {
    return res.status(httpStatus.CREATED).send(fileUpload);
  }
  return res.status(httpStatus.BAD_REQUEST).send('File not uploaded');
});

module.exports = {
  postFile,
};
