const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { filesService } = require('../services');

const postFile = catchAsync(async (req, res) => {
  const fileUpload = await filesService.postFile(req, res, req.params.folder);
  if (fileUpload !== null) {
    return res.status(httpStatus.CREATED).send(fileUpload);
  }
  return res.status(httpStatus.BAD_REQUEST).send('File not uploaded');
});

module.exports = {
  postFile,
};
