// Add the following line to import the '@vercel/blob' package
const AWS = require('aws-sdk');
const { put } = require('@vercel/blob');
const { NextResponse } = require('next/server');
const formidable = require('formidable');
const fs = require('fs').promises;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
/*
const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
*/

/**
 * Post file
 * @returns {Promise<Files>}
 */
const postFileS3 = async (request, res) => {
  try {
    // const { searchParams } = new URL(`http://localhost:3007/v1/files${request.url}`);
    // const filename = searchParams.get('filename');

    const form = new formidable.IncomingForm();

    return new Promise((resolve, reject) => {
      form.parse(request, async (err, fields, files) => {
        if (err) {
          reject(NextResponse.json({ error: 'Error parsing form data' }, { status: 500 }));
          console.log('first error');
          return;
        }

        const { file } = files;
        console.log({ file: file[0].filepath });
        if (!file[0]) {
          reject(NextResponse.json({ error: 'No file uploaded' }, { status: 400 }));
          console.log('second error');
          return;
        }

        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `uploads/${Date.now()}_${file[0].originalFilename}`,
          Body: Buffer.from(file[0].filepath, 'base64'),
          ContentType: file[0].mimetype,
        };

        try {
          const uploadResult = await s3.upload(params).promise();
          res.status(200).json({ url: uploadResult.Location });
        } catch (error) {
          console.log({ error: error.message });
          res.status(500).json({ error: error.message });
        }
      });
    });
  } catch (urlError) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
};

/**
 * Post file
 * @returns {Promise<Files>}
 */
const postFile = async (request, res) => {
  try {
    // const { searchParams } = new URL(`http://localhost:3007/v1/files${request.url}`);
    // const filename = searchParams.get('filename');

    const form = new formidable.IncomingForm();

    return new Promise((resolve, reject) => {
      form.parse(request, async (err, fields, files) => {
        if (err) {
          reject(NextResponse.json({ error: 'Error parsing form data' }, { status: 500 }));
          console.log('first error');
          return;
        }

        const { file } = files;

        if (!file[0]) {
          reject(NextResponse.json({ error: 'No file uploaded' }, { status: 400 }));
          console.log('no file error');
          return;
        }

        try {
          const fileContent = await fs.readFile(file[0].filepath);
          const blob = put(file[0].newFilename, fileContent, {
            access: 'public',
            contentType: file[0].mimetype,
          });
          resolve(NextResponse.json(blob));
          return blob;
        } catch (uploadError) {
          reject(NextResponse.json({ error: uploadError }, { status: 500 }));
          console.log('upload error', uploadError);
        }
      });
    });
  } catch (urlError) {
    console.log('fourth error');
    res.status(500).json({ error: 'deu merda' });
    return NextResponse.json({ error: urlError }, { status: 400 });
  }
};

/**
 * Post file
 * @returns {Promise<Files>}
 */
const postFileS3OLD = async (req, res) => {
  const { file } = req.body; // Assuming you're sending the file as a base64 string

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `uploads/${Date.now()}_${file.name}`,
    Body: Buffer.from(file.data, 'base64'),
    ContentType: file.type,
  };

  try {
    const uploadResult = await s3.upload(params).promise();
    res.status(200).json({ url: uploadResult.Location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  postFile,
  postFileS3,
  postFileS3OLD,
};
