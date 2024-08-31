// Add the following line to import the '@vercel/blob' package
const { put } = require('@vercel/blob');
const { NextResponse } = require('next/server');
const formidable = require('formidable');
// const fs = require('fs');

/*
const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
*/

/**
 * Post file
 * @returns {Promise<Files>}
 */
const postFile = async (request) => {
  try {
    // const { searchParams } = new URL(`http://localhost:3007/v1/files${request.url}`);
    // const filename = searchParams.get('filename');

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
          const blob = await put(file[0].newFilename, file[0].filepath, {
            access: 'public',
            contentType: file[0].mimetype,
          });
          resolve(NextResponse.json(blob));
          return blob;
        } catch (uploadError) {
          reject(NextResponse.json({ error: 'Error uploading file' }, { status: 500 }));
        }
      });
    });
  } catch (urlError) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
};

module.exports = {
  postFile,
};
