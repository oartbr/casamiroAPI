const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const { put } = require('@vercel/blob');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Print } = require('../models');

/**
 * Create Print file
 * @returns {Print}
 */
const createPrint = async (printId) => {
  // create a new print entry in the database
  const newPrint = await Print.create({
    status: 'pending', // Update this status when the PDF is ready for download
    printId,
  });
  return newPrint;
};

/**
 * Get pdfs by status
 * @param {ObjectId} status
 * @returns {Promise<Print>}
 */
const getPdfsByStatus = async (status) => {
  return Print.find({ status }).sort({ createdAt: -1 });
};

/**
 * Post file
 * @returns {Promise<Files>}
 */
const createPdf = async (print, res) => {
  try {
    // Convert 10cm to points
    const pageSize = { width: 187.875 * 2, height: 136.175 * 2 }; // ~10cm in points
    // const start = Date.now(); // Start time for performance measurement
    // console.log({ files });

    // Setup the PDF with a custom page size
    const doc = new PDFDocument({ size: [pageSize.width, pageSize.height] });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);
      const filename = `pdf/${print.printId}.pdf`;

      // Store PDF in Vercel Blob
      const { url } = await put(filename, pdfBuffer, {
        access: 'public', // Adjust based on your needs
      });

      const updatedPrint = await Print.findById(print._id);

      await updatedPrint.update({
        url, // Save the URL in the database for future reference
      });
      // console.log(`after end time: ${Date.now() - start} ms`);
      return url; // Return the URL for the caller (e.g., API response)
    });

    // Fetch SVG data as strings (SVGtoPDF needs text, not buffers)
    const svgDataArray = await Promise.all(
      print.items.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new ApiError(httpStatus.BAD_REQUEST, `Failed to fetch SVG: ${url}`);
        return response.text(); // SVGtoPDF expects SVG as a string
      })
    );

    // Add each SVG to the PDF using svg-to-pdfkit
    svgDataArray.forEach((svgData, index) => {
      SVGtoPDF(doc, svgData, 0, 0, {
        width: pageSize.width,
        height: pageSize.height,
        preserveAspectRatio: 'none', // Use 'none' to fill the page, or another value if needed
      });
      // Add a new page for all SVGs except the last one
      if (index < svgDataArray.length - 1) {
        doc.addPage();
      }
    });
    doc.end();
  } catch (error) {
    // console.error('Error generating PDF:', error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to generate PDF' });
    }
  }
};

/**
 * Get pdfs by printId
 * @param {ObjectId} status
 * @returns {Promise<Print>}
 */
const getPdfById = async (printId, res) => {
  const print = await Print.findOne({ printId });
  let updatedPrint;
  if (!print) {
    return false; // Print not found
  }

  if (!print.url && print.status === 'pending') {
    await createPdf(print, res);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    updatedPrint = await Print.findOne({ printId });
    await updatedPrint.update({
      status: 'created', // Update status
    });
  } else if (!print.url && print.status === 'created') {
    await print.update({
      status: 'processing', // Update status
    });
    return print; // Print found and set to processing
  } else if (print.url && (print.status === 'created' || print.status === 'processing' || print.status === 'pending')) {
    await print.update({
      status: 'completed', // Update status
    });
    return print; // Print found amd set to complated
  } else if (print.status === 'completed' || print.status === 'printed' || print.status === 'error') {
    return print; // Print found
  }

  // console.log('Updated print:', updatedPrint);
  return updatedPrint; // Return the updated print object
};

module.exports = {
  createPrint,
  getPdfsByStatus,
  getPdfById,
  createPdf,
};
