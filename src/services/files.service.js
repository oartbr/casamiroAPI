const { put } = require('@vercel/blob');
const { NextResponse } = require('next/server');
const formidable = require('formidable');
const fs = require('fs').promises;
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Post file
 * @returns {Promise<Files>}
 */
const postFile = async (request, res, folder) => {
  try {
    const form = new formidable.IncomingForm();

    return new Promise((resolve, reject) => {
      form.parse(request, async (err, fields, files) => {
        if (err) {
          reject(NextResponse.json({ error: 'Error parsing form data' }, { status: 500 }));
          // console.log('first error');
          return;
        }

        const { file } = files;

        if (!file[0]) {
          reject(NextResponse.json({ error: 'No file uploaded' }, { status: 400 }));
          // console.log('no file error');
          return;
        }

        try {
          const fileContent = await fs.readFile(file[0].filepath);
          const blob = put(`${folder}/${file[0].newFilename}`, fileContent, {
            access: 'public',
            contentType: file[0].mimetype,
          });
          resolve(blob);
        } catch (uploadError) {
          reject(NextResponse.json({ error: uploadError }, { status: 500 }));
          // console.log('upload error', uploadError);
        }
      });
    });
  } catch (urlError) {
    // console.log('fourth error');
    res.status(500).json({ error: urlError });
    return NextResponse.json({ error: urlError }, { status: 400 });
  }
};

/**
 * Post file
 * @returns {Promise<Files>}
 */
const postQRcode = async (file, filename, folder) => {
  try {
    const blob = put(`${folder}/${filename}.svg`, file, {
      access: 'public',
      contentType: file.mimetype,
    });
    return blob;
  } catch (uploadError) {
    throw new ApiError(httpStatus.UNAUTHORIZED, { error: uploadError });
  }
};

module.exports = {
  postFile,
  postQRcode,
};
