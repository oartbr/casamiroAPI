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
    scale: 4,
    error: 'H',
  });
};

/**
 * Include a logo in the QR code.
 * @param {string} QRcode - The QR code.
 * @param {string} logoUrl - The URL of the logo to embed.
 * @returns {Promise<string>} - A promise that resolves to the generated QR code with logo as a string.
 */
const insertLogo = async (QRcode, logoBG) => {
  // Load the QR code SVG into JSDOM
  const dom = new JSDOM(QRcode);
  const { document } = dom.window;
  const qrElem = document.querySelector('svg');
  // qrElem.querySelectorAll('*').forEach((el) => el.classList.add('originalQR'));

  // Fetch the logo SVG.
  const logoDom = new JSDOM(logoBG);
  const logoSvg = logoDom.window.document.querySelector('svg');

  // Use logo dimensions for setting up the area.
  const svgWidth = 187.875;
  const svgHeight = 136.175;
  // If no explicit width/height, implement viewBox to default.

  // Update the original QR code SVG dimensions and viewBox.
  qrElem.setAttribute('x', '0%');
  qrElem.setAttribute('y', '0%');
  qrElem.setAttribute('width', svgWidth);
  qrElem.setAttribute('height', svgHeight);
  qrElem.setAttribute('viewBox', `2 -3 ${svgWidth * 0.39} ${svgHeight * 0.39}`);
  qrElem.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  // console.log(`New dimensions: width=${svgWidth}, height=${svgHeight}`);

  // Adjust the logo size and its placement.
  logoSvg.setAttribute('x', '0%');
  logoSvg.setAttribute('y', '0%');
  logoSvg.setAttribute('width', '100%');
  logoSvg.setAttribute('height', '100%');
  logoSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  logoSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

  // Append the modified QR clone and the logo to the original SVG.
  logoSvg.prepend(qrElem);

  return logoSvg.outerHTML;
};

/**
 * Inserts text on top of a white area into the given QR code SVG.
 * The text appears at the bottom right. The font is configurable.
 *
 * @param {string} svgString - The SVG content as a string.
 * @param {string} textContent - The text to insert.
 * @param {string} font - The font to use (e.g., 'Arial').
 * @returns {string} - The modified SVG as a string.
 */
const insertText = (svgString, textContent) => {
  const dom = new JSDOM(svgString);
  const { document } = dom.window;
  const qrElem = document.querySelector('svg');
  const monospacedFont = 'Consolas, "Courier New", monospace';

  // Determine the SVG dimensions.
  let svgWidth = qrElem.getAttribute('width');
  let svgHeight = qrElem.getAttribute('height');
  if (!svgWidth || !svgHeight) {
    // If no explicit width/height, try viewBox or default to 200.
    const viewBox = qrElem.getAttribute('viewBox');
    if (viewBox) {
      const [, , width, height] = viewBox.split(' '); // we are getting the 2nd and 3rd values of the viewBox
      svgWidth = width;
      svgHeight = height;
    } else {
      svgWidth = '200';
      svgHeight = '200';
    }
  }
  svgWidth = parseFloat(svgWidth);
  svgHeight = parseFloat(svgHeight);

  // Define the white background rectangle's size.
  const rectWidth = 12; // Change as needed
  const rectHeight = 2; // Change as needed
  const margin = 4; // Margin from the bottom and right edges
  const rectX = svgWidth - rectWidth - margin;
  const rectY = svgHeight - rectHeight - margin;

  // Create a white rectangle as background.
  const rectElem = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rectElem.setAttribute('x', rectX.toString());
  rectElem.setAttribute('y', rectY.toString());
  rectElem.setAttribute('width', rectWidth.toString());
  rectElem.setAttribute('height', rectHeight.toString());
  rectElem.setAttribute('fill', '#fff');

  // Append the rectangle to the SVG.
  qrElem.appendChild(rectElem);

  // Create the text element.
  const textElem = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textElem.textContent = textContent;
  // Position text in the center of the rectangle.
  textElem.setAttribute('x', rectX.toString());
  // Adjust y value to better center the text (baseline adjustment)
  textElem.setAttribute('y', (rectY + 1.5).toString());
  textElem.setAttribute('text-anchor', 'right');
  textElem.setAttribute('fill', '#000');
  textElem.setAttribute('font-family', monospacedFont);
  textElem.setAttribute('font-size', '2'); // Adjust font size as needed

  // Append text on top of the rectangle.
  qrElem.appendChild(textElem);

  return qrElem.outerHTML;
};

/**
 * get logo BG from file system.
 * @param {string} logoUrl - The URL of the logo to embed.
 * @returns {Promise<string>} - A promise that resolves to the generated QR code with logo as a string.
 */
const loadImage = async (logoUrl) => {
  const { data: logoData } = await axios.get(logoUrl);
  return logoData;
};

module.exports = {
  getQRcode,
  insertLogo,
  insertText,
  loadImage,
};
