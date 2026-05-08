/**
 * Pure color utility functions extracted from index.html.
 * These functions contain no DOM dependencies and are fully unit-testable.
 */

/**
 * Converts r,g,b integers (0–255) to an uppercase hex string like "#C3073F".
 * Mirrors the inline expression in showPickedColor() (index.html:950).
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Quantizes a single 0–255 channel to the nearest multiple of 32.
 * Used by extractDominantColors() (index.html:960) to bucket pixel colors.
 * Note: the result can reach 256 (e.g. Math.round(255/32)*32 = 256),
 * so callers must clamp with Math.min(255, value).
 */
export function quantizeChannel(value) {
  return Math.round(value / 32) * 32;
}

/**
 * Extracts the top dominant colors from a flat RGBA pixel array (Uint8ClampedArray).
 * Mirrors extractDominantColors() logic (index.html:956–976).
 *
 * @param {Uint8ClampedArray|number[]} pixelData - raw RGBA bytes
 * @param {number} sampleStep - sample every N pixels (default 5 → every 20th byte)
 * @param {number} topN - number of colors to return
 * @returns {{ r: number, g: number, b: number, hex: string }[]}
 */
export function extractDominantColors(pixelData, sampleStep = 5, topN = 8) {
  const colorMap = {};
  for (let i = 0; i < pixelData.length; i += sampleStep * 4) {
    const r = quantizeChannel(pixelData[i]);
    const g = quantizeChannel(pixelData[i + 1]);
    const b = quantizeChannel(pixelData[i + 2]);
    const key = `${r},${g},${b}`;
    colorMap[key] = (colorMap[key] || 0) + 1;
  }
  return Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([rgb]) => {
      const [r, g, b] = rgb.split(',').map(Number);
      const rc = Math.min(255, r);
      const gc = Math.min(255, g);
      const bc = Math.min(255, b);
      return { r: rc, g: gc, b: bc, hex: rgbToHex(rc, gc, bc) };
    });
}

/**
 * Returns the brightness threshold for signature extraction.
 * Mirrors the thresholds object in extractSignature() (index.html:1026).
 */
export function getSignatureThreshold(sensitivity) {
  const thresholds = { low: 180, medium: 200, high: 220 };
  return thresholds[sensitivity] ?? thresholds.medium;
}

/**
 * Returns true if the pixel (r,g,b) is a background pixel (bright enough to remove).
 * Mirrors the brightness check in extractSignature() (index.html:1028–1030).
 */
export function isBackgroundPixel(r, g, b, threshold) {
  return (r + g + b) / 3 > threshold;
}

/**
 * Applies the contrast-stretch formula used in enhanceInvoiceImage() (index.html:1155).
 * Maps a 0–255 value through: ((v/255 - 0.5) * contrast + 0.5) * 255, clamped to [0,255].
 */
export function applyContrast(value, contrast) {
  return Math.max(0, Math.min(255, ((value / 255 - 0.5) * contrast + 0.5) * 255));
}

/**
 * Converts an RGB pixel to grayscale using the BT.601 luma coefficients.
 * Mirrors the grayscale conversion in enhanceInvoiceImage() (index.html:1154).
 */
export function rgbToGrayscale(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
