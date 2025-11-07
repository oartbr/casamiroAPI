const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { generateHashicon } = require('../utils/hashicon');

/**
 * Test hashicon generation with different options
 * GET /v1/hashicon/test?input=test123&size=200&patternType=0&bgOpacity=0.1&cellBorderRadius=2&cellRotation=45
 */
const testHashicon = catchAsync(async (req, res) => {
  const {
    input = 'test',
    size = 200,
    patternType = 0,
    bgOpacity = 0.1,
    cellBorderRadius = 2,
    cellRotation = 0,
  } = req.query;

  // Parse numeric parameters
  const parsedSize = parseInt(size, 10) || 200;
  const parsedPatternType = parseInt(patternType, 10) || 0;
  const parsedBgOpacity = parseFloat(bgOpacity) || 0.1;
  const parsedCellBorderRadius = parseFloat(cellBorderRadius) || 2;
  const parsedCellRotation = parseFloat(cellRotation) || 0;

  // Validate parameters
  if (parsedSize < 50 || parsedSize > 1000) {
    return res.status(httpStatus.BAD_REQUEST).json({
      error: 'Size must be between 50 and 1000',
    });
  }

  if (parsedPatternType < 0 || parsedPatternType > 4) {
    return res.status(httpStatus.BAD_REQUEST).json({
      error: 'Pattern type must be 0 (symmetric), 1 (asymmetric), 2 (circular), 3 (rotated), or 4 (triangular)',
    });
  }

  if (parsedBgOpacity < 0 || parsedBgOpacity > 1) {
    return res.status(httpStatus.BAD_REQUEST).json({
      error: 'Background opacity must be between 0 and 1',
    });
  }

  // Generate hashicon
  const svg = generateHashicon(input, parsedSize, {
    patternType: parsedPatternType,
    bgOpacity: parsedBgOpacity,
    cellBorderRadius: parsedCellBorderRadius,
    cellRotation: parsedCellRotation,
  });

  // Return SVG with proper content type
  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(httpStatus.OK).send(svg);
});

/**
 * Get multiple hashicon variations for comparison in a single SVG grid
 * GET /v1/hashicon/test-variations?input=test123&size=200
 */
const testHashiconVariations = catchAsync(async (req, res) => {
  const { input = 'test', size = 200 } = req.query;
  const parsedSize = parseInt(size, 10) || 200;

  if (parsedSize < 50 || parsedSize > 1000) {
    return res.status(httpStatus.BAD_REQUEST).json({
      error: 'Size must be between 50 and 1000',
    });
  }

  // Generate variations
  const variations = [
    {
      name: 'Symmetric (Default)',
      patternType: 0,
      bgOpacity: 0.1,
      cellBorderRadius: 2,
    },
    {
      name: 'Symmetric (High Opacity)',
      patternType: 0,
      bgOpacity: 0.3,
      cellBorderRadius: 2,
    },
    {
      name: 'Symmetric (Rounded)',
      patternType: 0,
      bgOpacity: 0.1,
      cellBorderRadius: 8,
    },
    {
      name: 'Asymmetric',
      patternType: 1,
      bgOpacity: 0.1,
      cellBorderRadius: 2,
    },
    {
      name: 'Circular',
      patternType: 2,
      bgOpacity: 0.1,
      cellBorderRadius: 2,
    },
    {
      name: 'Rotated',
      patternType: 3,
      bgOpacity: 0.1,
      cellBorderRadius: 2,
    },
    {
      name: 'Triangular',
      patternType: 4,
      bgOpacity: 0.1,
      cellBorderRadius: 2,
    },
  ];

  // Calculate grid dimensions (2 columns)
  const cols = 2;
  const rows = Math.ceil(variations.length / cols);
  const padding = 20;
  const labelHeight = 30;
  const iconSize = parsedSize;
  const cellWidth = iconSize + padding * 2;
  const cellHeight = iconSize + labelHeight + padding * 2;
  const svgWidth = cols * cellWidth;
  const svgHeight = rows * cellHeight;

  // Start SVG
  let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${svgWidth}" height="${svgHeight}" fill="#f5f5f5"/>`;

  // Generate each variation and place in grid
  variations.forEach((variation, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * cellWidth + padding;
    const y = row * cellHeight + padding;

    // Generate hashicon SVG
    const hashiconSvg = generateHashicon(input, iconSize, {
      patternType: variation.patternType,
      bgOpacity: variation.bgOpacity,
      cellBorderRadius: variation.cellBorderRadius,
    });

    // Extract the inner content (remove outer svg tags)
    const hashiconContent = hashiconSvg
      .replace(/<svg[^>]*>/, '')
      .replace('</svg>', '');

    // Add group for this variation
    svg += `<g transform="translate(${x}, ${y})">`;
    
    // Add label background
    svg += `<rect x="0" y="0" width="${iconSize}" height="${labelHeight}" fill="white" opacity="0.8"/>`;
    
    // Add label text
    svg += `<text x="${iconSize / 2}" y="${labelHeight / 2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#333">${variation.name}</text>`;
    
    // Add hashicon
    svg += `<g transform="translate(0, ${labelHeight})">${hashiconContent}</g>`;
    
    svg += `</g>`;
  });

  svg += '</svg>';

  // Return SVG with proper content type
  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(httpStatus.OK).send(svg);
});

module.exports = {
  testHashicon,
  testHashiconVariations,
};

