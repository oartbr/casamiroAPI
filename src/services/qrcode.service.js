const QRCode = require('qrcode');
const { JSDOM } = require('jsdom');
const axios = require('axios');

/**
 * Generates a QR code for the given content.
 * @param {string} content - The content to be encoded in the QR code.
 * @returns {Promise<string>} - A promise that resolves to the generated QR code as a string.
 */
const getQRcode = async (content) => {
  return QRCode.toString(`${content}`, [{ data: content, mode: 'byte' }], {
    type: 'svg',
    scale: 1,
    error: 'H',
  });
};

/**
 * Include a logo in the QRcode.
 * @param {string} logoUrl - The logo to be encoded into the QR code.
 * @param {string} QRcode - The QR code.
 * @returns {Promise<string>} - A promise that resolves to the generated QR code as a string.
 */
const insertLogo = async (QRcode, logoUrl) => {
  // Load the QR code SVG into JSDOM
  const dom = new JSDOM(QRcode);
  const { document } = dom.window;

  // Fetch the SVG logo from the URL
  const response = await axios.get(logoUrl);
  const logoData = response.data;

  // Load the logo SVG into JSDOM
  const logoDom = new JSDOM(logoData);
  const logoSvg = logoDom.window.document.querySelector('svg');

  // Adjust the logo size and position
  logoSvg.setAttribute('x', '40%');
  logoSvg.setAttribute('y', '40%');
  logoSvg.setAttribute('width', '20%');
  logoSvg.setAttribute('height', '20%');
  logoSvg.setAttribute('fill', '#ffffffff');

  // Append the logo to the QR code SVG
  document.querySelector('svg').appendChild(logoSvg);

  // Return the modified SVG as a string
  return document.querySelector('svg').outerHTML;
};

module.exports = {
  getQRcode,
  insertLogo,
};
