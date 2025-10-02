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
          return;
        }

        const { file } = files;

        if (!file[0]) {
          reject(NextResponse.json({ error: 'No file uploaded' }, { status: 400 }));
          return;
        }

        try {
          // Check if BLOB_READ_WRITE_TOKEN is available
          if (!process.env.BLOB_READ_WRITE_TOKEN) {
            // Return a mock response for development
            const mockUrl = `https://example.com/${folder}/${file[0].newFilename}`;
            resolve({ url: mockUrl });
            return;
          }

          const fileContent = await fs.readFile(file[0].filepath);
          const blob = await put(`${folder}/${file[0].newFilename}`, fileContent, {
            access: 'public',
            contentType: file[0].mimetype,
          });
          
          // Ensure consistent response format
          resolve({ url: blob.url });
        } catch (uploadError) {
          reject(NextResponse.json({ error: uploadError }, { status: 500 }));
        }
      });
    });
  } catch (urlError) {
    res.status(500).json({ error: urlError });
    return NextResponse.json({ error: urlError }, { status: 400 });
  }
};

/**
 * Post file
 * @returns {Promise<Files>}
 */
const postQRcode = async (file, filename, folder) => {
  const blob = put(`${folder}/${filename}.svg`, file, {
    access: 'public',
    contentType: file.mimetype,
  });

  if (!blob) {
    throw new ApiError(httpStatus.UNAUTHORIZED, { error: 'Error uploading file' });
  }

  return blob;
};

module.exports = {
  postFile,
  postQRcode,
};
