const crypto = require('crypto');

/**
 * Generate a simple hashicon SVG based on a string input
 * @param {string} input - The input string to generate hashicon from
 * @param {number} size - Size of the icon (default: 100)
 * @param {Object} options - Additional options for hashicon generation
 * @param {number} options.patternType - Pattern type (0: symmetric, 1: asymmetric, 2: circular, 3: rotated, 4: triangular)
 * @param {number} options.bgOpacity - Background opacity (0-1, default: 0.1)
 * @param {number} options.cellBorderRadius - Cell border radius (default: 2)
 * @param {number} options.cellRotation - Rotation angle in degrees for all cells (default: 0)
 * @returns {string} SVG string
 */
const generateHashicon = (input, size = 100, options = {}) => {
  const { patternType = 0, bgOpacity = 1, cellBorderRadius = 2, cellRotation = 0 } = options;
  // Create a hash from the input
  const hash = crypto.createHash('md5').update(input).digest('hex');

  // Convert HSL to RGB
  const hslToRgb = (h, s, l) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return { r, g, b };
  };

  // Convert RGB to hex (for background gradient)
  const rgbToHex = (r, g, b) => {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Generate a unique color with alpha channel for each cell based on its position and hash
  const getCellColor = (row, col, index = null) => {
    // Use different parts of hash based on cell position
    const positionHash =
      index !== null
        ? parseInt(hash.substring((index * 2) % 32, ((index * 2) % 32) + 2), 16)
        : parseInt(hash.substring(((row * 5 + col) * 2) % 32, (((row * 5 + col) * 2) % 32) + 2), 16);

    // Generate hue, saturation, and lightness for this specific cell
    const hue = (parseInt(hash.substring(0, 2), 16) + positionHash + row * 17 + col * 23) % 360;
    const saturation = 50 + ((parseInt(hash.substring(2, 4), 16) + positionHash) % 50); // 50-100%
    const lightness = 40 + ((parseInt(hash.substring(4, 6), 16) + positionHash) % 20); // 40-60%

    // Generate alpha channel (opacity) for this cell - vary between 0.6 and 1.0 for good visibility
    const alphaHash =
      index !== null
        ? parseInt(hash.substring((index * 2 + 1) % 32, ((index * 2 + 1) % 32) + 2), 16)
        : parseInt(hash.substring(((row * 5 + col) * 2 + 1) % 32, (((row * 5 + col) * 2 + 1) % 32) + 2), 16);
    const alpha = 0.6 + (alphaHash / 255) * 0.4; // 0.6 to 1.0

    const rgb = hslToRgb(hue, saturation, lightness);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`;
  };

  // Base color for background (using first part of hash)
  const baseHue = parseInt(hash.substring(0, 2), 16) % 360;
  const baseSaturation = 50 + (parseInt(hash.substring(2, 4), 16) % 50);
  const baseLightness = 40 + (parseInt(hash.substring(4, 6), 16) % 20);
  const baseRgb = hslToRgb(baseHue, baseSaturation, baseLightness);
  const baseColor = rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b);

  // Create a lighter version for gradient end
  const lighterLightness = Math.min(95, baseLightness + 30);
  const lighterRgb = hslToRgb(baseHue, baseSaturation * 0.7, lighterLightness);
  const lighterColor = rgbToHex(lighterRgb.r, lighterRgb.g, lighterRgb.b);

  // Generate SVG
  const cellSize = size / 5;
  // Create unique but deterministic gradient ID
  const gradientId = `bg-${hash.substring(0, 12)}`;
  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;

  // Background with gradient - using different colors for actual gradient effect
  const bgOpacityStart = 1;
  const bgOpacityEnd = 0.1;
  svg += `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">`;
  svg += `<stop offset="0%" stop-color="${baseColor}" stop-opacity="${bgOpacityStart}" />`;
  svg += `<stop offset="100%" stop-color="${lighterColor}" stop-opacity="${bgOpacityEnd}" />`;
  svg += `</linearGradient></defs>`;
  svg += `<rect width="${size}" height="${size}" fill="url(#${gradientId})"/>`;

  // Helper function to render a cell with optional rotation
  const renderCell = (x, y, color, rotation = 0) => {
    if (rotation !== 0 && rotation % 360 !== 0) {
      const centerX = x + cellSize / 2;
      const centerY = y + cellSize / 2;
      return `<g transform="translate(${centerX}, ${centerY}) rotate(${rotation}) translate(${-cellSize / 2}, ${
        -cellSize / 2
      })"><rect x="0" y="0" width="${cellSize}" height="${cellSize}" fill="${color}" rx="${cellBorderRadius}"/></g>`;
    }
    return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="${cellBorderRadius}"/>`;
  };

  // Helper function to render a triangle with optional rotation
  // direction: 0=up, 1=down, 2=left, 3=right
  const renderTriangle = (x, y, color, direction = 0, rotation = 0) => {
    const centerX = x + cellSize / 2;
    const centerY = y + cellSize / 2;

    // Define triangle points based on direction (relative to center)
    let points;
    const halfSize = cellSize / 2;
    switch (direction % 4) {
      case 0: // Up
        points = `0,-${halfSize} -${halfSize},${halfSize} ${halfSize},${halfSize}`;
        break;
      case 1: // Down
        points = `0,${halfSize} -${halfSize},-${halfSize} ${halfSize},-${halfSize}`;
        break;
      case 2: // Left
        points = `-${halfSize},0 ${halfSize},-${halfSize} ${halfSize},${halfSize}`;
        break;
      case 3: // Right
        points = `${halfSize},0 -${halfSize},-${halfSize} -${halfSize},${halfSize}`;
        break;
    }

    // Apply rotation if specified
    if (rotation !== 0 && rotation % 360 !== 0) {
      return `<g transform="translate(${centerX}, ${centerY}) rotate(${rotation})"><polygon points="${points}" fill="${color}"/></g>`;
    }
    return `<g transform="translate(${centerX}, ${centerY})"><polygon points="${points}" fill="${color}"/></g>`;
  };

  function renderDiamond(index, lat, lon, angle) {
    let svg = '';
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const hashIndex = (row * 5 + col) * index;
        const byte = parseInt(hash.substring(hashIndex, hashIndex + 2), 16);
        const shouldFill = 1;
        const offsetBorder = col % 2 == 0 && row % 2 == 0 && col < 2 ? cellSize : 0;
        const limit = col < 2 ? 1 : 0;
        const offsetMiddle = row == 1 && col > 0 ? cellSize : 0;
        if (!offsetBorder && limit) {
          const x = col * cellSize;
          const y = row * (cellSize / 2);
          const cellColor = getCellColor(row * index, col * index);
          // Pattern type 3 uses 45 degrees by default, but can be overridden by cellRotation
          const rotation = cellRotation !== 0 ? cellRotation : 45;
          svg += renderTriangle(x + offsetBorder + offsetMiddle, y, cellColor, 0, 270);
          svg += renderTriangle(x + cellSize + offsetBorder + offsetMiddle, y, cellColor, 0, 90);
        }
      }
    }
    return `<g transform="rotate(${angle}) translate(${lat}, ${lon})">${svg}</g>`;
  }

  function renderHasher(index, lat, lon, angle) {
    let svg = '';
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const hashIndex = (row * 5 + col) * index;
        const byte = parseInt(hash.substring(hashIndex, hashIndex + 2), 16);
        const shouldFill = 1;
        const offsetBorder = col % 2 == 0 && row % 2 == 0 && col < 3 ? cellSize : 0;
        const limit = col < 4 ? 1 : 0;

        if (!offsetBorder && limit) {
          const x = col * cellSize;
          const y = row * (cellSize / 2);
          const cellColor = getCellColor(row * index, col * index);
          // Pattern type 3 uses 45 degrees by default, but can be overridden by cellRotation
          const rotation = cellRotation !== 0 ? cellRotation : 45;
          svg += renderTriangle(x + offsetBorder, y, cellColor, 0, 270);
          svg += renderTriangle(x + cellSize + offsetBorder, y, cellColor, 0, 90);
        }
      }
    }
    return `<g transform="rotate(${angle}) translate(${lat}, ${lon})">${svg}</g>`;
  }

  // Generate pattern based on patternType
  if (patternType === 0) {
    // Symmetric pattern (5x5 grid, mirrored horizontally)
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const hashIndex = (row * 3 + col) * 2;
        const byte1 = parseInt(hash.substring(hashIndex, hashIndex + 2), 16);
        const byte2 = parseInt(hash.substring(hashIndex + 2, hashIndex + 4), 16);
        const shouldFill = (byte1 + byte2) % 3 !== 0;

        if (shouldFill) {
          const x = col * cellSize;
          const y = row * cellSize;
          const mirrorX = (4 - col) * cellSize;

          // Get unique colors for left and right cells
          const leftColor = getCellColor(row, col);
          const rightColor = getCellColor(row, 4 - col);

          svg += renderCell(x, y, leftColor, cellRotation);
          svg += renderCell(mirrorX, y, rightColor, cellRotation);
        }
      }
      const centerHashIndex = (row * 3 + 2) * 2;
      const centerByte = parseInt(hash.substring(centerHashIndex, centerHashIndex + 2), 16);
      if (centerByte % 2 === 0) {
        const x = 2 * cellSize;
        const y = row * cellSize;
        const centerColor = getCellColor(row, 2);
        svg += renderCell(x, y, centerColor, cellRotation);
      }
    }
  } else if (patternType === 1) {
    // Asymmetric pattern (full 5x5 grid)
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const hashIndex = (row * 5 + col) * 2;
        const byte = parseInt(hash.substring(hashIndex, hashIndex + 2), 16);
        const shouldFill = byte % 2 === 0;

        if (shouldFill) {
          const x = col * cellSize;
          const y = row * cellSize;
          const cellColor = getCellColor(row, col);
          svg += renderCell(x, y, cellColor, cellRotation);
        }
      }
    }
  } else if (patternType === 2) {
    // Circular pattern
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - cellSize;

    for (let i = 0; i < 8; i += 1) {
      const hashIndex = i * 4;
      const byte1 = parseInt(hash.substring(hashIndex, hashIndex + 2), 16);
      const byte2 = parseInt(hash.substring(hashIndex + 2, hashIndex + 4), 16);
      const angle = (i / 8) * Math.PI * 2;
      const radius = (byte1 / 255) * maxRadius;

      if (byte2 % 2 === 0) {
        const circleColor = getCellColor(0, 0, i);
        const circleX = centerX + Math.cos(angle) * radius;
        const circleY = centerY + Math.sin(angle) * radius;
        if (cellRotation !== 0 && cellRotation % 360 !== 0) {
          // For circles, apply rotation by converting to square and rotating
          svg += `<g transform="translate(${circleX}, ${circleY}) rotate(${cellRotation}) translate(${-cellSize / 2}, ${
            -cellSize / 2
          })"><rect x="0" y="0" width="${cellSize}" height="${cellSize}" fill="${circleColor}" rx="${cellBorderRadius}"/></g>`;
        } else {
          svg += `<circle cx="${circleX}" cy="${circleY}" r="${cellSize / 2}" fill="${circleColor}"/>`;
        }
      }
    }
    // Center circle
    const centerByte = parseInt(hash.substring(0, 2), 16);
    if (centerByte % 2 === 0) {
      const centerColor = getCellColor(0, 0, 8);
      if (cellRotation !== 0 && cellRotation % 360 !== 0) {
        svg += `<g transform="translate(${centerX}, ${centerY}) rotate(${cellRotation}) translate(${-cellSize / 2}, ${
          -cellSize / 2
        })"><rect x="0" y="0" width="${cellSize}" height="${cellSize}" fill="${centerColor}" rx="${cellBorderRadius}"/></g>`;
      } else {
        svg += `<circle cx="${centerX}" cy="${centerY}" r="${cellSize / 2}" fill="${centerColor}"/>`;
      }
    }
  } else if (patternType === 3) {
    svg += renderHasher(1, 0, -40, 90);
    svg += renderHasher(2, 0, -50, 90);
    svg += renderHasher(3, 0, -60, 90);
  } else if (patternType === 4) {
    // Symmetric pattern (5x5 grid, mirrored horizontally)
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const hashIndex = (row * 3 + col) * 2;
        const byte1 = parseInt(hash.substring(hashIndex, hashIndex + 2), 16);
        const byte2 = parseInt(hash.substring(hashIndex + 2, hashIndex + 4), 16);
        const shouldFill = (byte1 + byte2) % 3 !== 0;

        if (shouldFill) {
          const x = col * cellSize;
          const y = row * cellSize;
          const mirrorX = (4 - col) * cellSize;

          // Get unique colors for left and right cells
          const leftColor = getCellColor(row, col);
          const rightColor = getCellColor(row, 4 - col);

          svg += renderTriangle(x, y, leftColor, 0, 270);
          svg += renderTriangle(x + cellSize, y, leftColor, 0, 90);
          svg += renderTriangle(mirrorX, y, rightColor, 0, cellRotation);
        }
      }
      const centerHashIndex = (row * 3 + 2) * 2;
      const centerByte = parseInt(hash.substring(centerHashIndex, centerHashIndex + 2), 16);
      if (centerByte % 2 === 0) {
        const x = 2 * cellSize;
        const y = row * cellSize;
        const centerColor = getCellColor(row, 2);
        svg += renderTriangle(x, y, centerColor, 90, cellRotation);
      }
    }
  }

  svg += '</svg>';
  return svg;
};

/**
 * Generate hashicon and upload to Vercel Blob
 * @param {string} groupId - The group ID to generate hashicon for
 * @returns {Promise<string>} URL of the uploaded hashicon
 */
const generateAndUploadHashicon = async (groupId) => {
  const { put } = require('@vercel/blob');

  // Generate SVG with patternType=3 and size=100
  const svg = generateHashicon(groupId.toString(), 100, {
    patternType: 3,
  });
  const svgBuffer = Buffer.from(svg, 'utf-8');

  // Check if BLOB_READ_WRITE_TOKEN is available
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Return a mock URL for development
    return `https://example.com/hashicons/${groupId}.svg`;
  }

  // Upload to Vercel Blob
  const filename = `hashicons/${groupId}.svg`;
  const blob = await put(filename, svgBuffer, {
    access: 'public',
    contentType: 'image/svg+xml',
  });

  return blob.url;
};

module.exports = {
  generateHashicon,
  generateAndUploadHashicon,
};
