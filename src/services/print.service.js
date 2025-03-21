const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const { put } = require('@vercel/blob');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Print } = require('../models');

/**
 * Post file
 * @returns {Promise<Files>}
 */
const createPrint = async (files, res) => {
  try {
    // Convert 10cm to points
    const pageSize = 283.5; // ~10cm in points

    // Setup the PDF with a custom page size
    const doc = new PDFDocument({ size: [pageSize, pageSize] });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);
      const filename = `qr-codes-${Date.now()}.pdf`;

      // Store PDF in Vercel Blob
      const { url } = await put(filename, pdfBuffer, {
        access: 'public', // Adjust based on your needs
      });
      // Return the URL for the caller (e.g., API response)
      return Print.create({
        url, // Save the URL in the database for future reference
        createdAt: new Date(),
      });
    });

    // Fetch SVG data as strings (SVGtoPDF needs text, not buffers)
    const svgDataArray = await Promise.all(
      files.map(async (file) => {
        const response = await fetch(file.url);
        if (!response.ok) throw new ApiError(httpStatus.BAD_REQUEST, `Failed to fetch SVG: ${file.url}`);
        return response.text(); // SVGtoPDF expects SVG as a string
      })
    );

    // Add each SVG to the PDF using svg-to-pdfkit
    svgDataArray.forEach((svgData, index) => {
      SVGtoPDF(doc, svgData, 0, 0, {
        width: pageSize,
        height: pageSize,
        preserveAspectRatio: 'none', // Use 'none' to fill the page, or another value if needed
      });
      // Add a new page for all SVGs except the last one
      if (index < svgDataArray.length - 1) {
        doc.addPage();
      }
    });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to generate PDF' });
    }
  }
};

module.exports = {
  createPrint,
};
