/**
 * Pure image geometry calculation functions extracted from index.html.
 * No DOM or canvas dependencies — fully unit-testable.
 */

/**
 * Calculates the output canvas dimensions after perspective correction.
 * The width is the longer of the two horizontal edges; height the longer
 * of the two vertical edges. Mirrors applyPerspective() (index.html:562–563).
 *
 * @param {{ x: number, y: number }[]} src - 4 corner points [TL, TR, BR, BL]
 * @returns {{ w: number, h: number }}
 */
export function calcPerspectiveDimensions(src) {
  const w = Math.max(
    Math.hypot(src[1].x - src[0].x, src[1].y - src[0].y),
    Math.hypot(src[2].x - src[3].x, src[2].y - src[3].y),
  );
  const h = Math.max(
    Math.hypot(src[3].x - src[0].x, src[3].y - src[0].y),
    Math.hypot(src[2].x - src[1].x, src[2].y - src[1].y),
  );
  return { w: Math.round(w), h: Math.round(h) };
}

/**
 * Converts canvas-space crop coordinates back to image-space, handling
 * both left-to-right and right-to-left drag directions.
 * Mirrors applyCrop() (index.html:1216–1218).
 *
 * @param {number} startX - drag start X in canvas pixels
 * @param {number} startY - drag start Y in canvas pixels
 * @param {number} endX   - drag end X in canvas pixels
 * @param {number} endY   - drag end Y in canvas pixels
 * @param {number} scale  - canvas-to-image scale factor (canvas / image)
 * @returns {{ x: number, y: number, w: number, h: number }} in image pixels
 */
export function calcCropRegion(startX, startY, endX, endY, scale) {
  return {
    x: Math.min(startX, endX) / scale,
    y: Math.min(startY, endY) / scale,
    w: Math.abs(endX - startX) / scale,
    h: Math.abs(endY - startY) / scale,
  };
}

/**
 * Calculates the constrained end-Y when an aspect ratio is active during cropping.
 * Mirrors the mousemove handler in setupCropDrag() (index.html:1201).
 *
 * @param {number} startY
 * @param {number} rawEndX
 * @param {number} startX
 * @param {number} rawEndY  - used only to determine drag direction (up or down)
 * @param {number} aspectRatio - width / height (null means free)
 * @returns {number} constrained endY
 */
export function calcAspectConstrainedEndY(startY, rawEndX, startX, rawEndY, aspectRatio) {
  if (!aspectRatio) return rawEndY;
  const w = Math.abs(rawEndX - startX);
  return startY + (rawEndY > startY ? w / aspectRatio : -w / aspectRatio);
}

/**
 * Maps an aspect ratio select value to a numeric ratio (or null for free).
 * Mirrors updateCropAR() (index.html:1184).
 */
export function calcAspectRatio(key) {
  const map = {
    'free': null,
    '1:1': 1,
    '4:3': 4 / 3,
    '16:9': 16 / 9,
    'passport-india': 35 / 45,
  };
  return Object.hasOwn(map, key) ? map[key] : null;
}

/**
 * "Contain" scale: the largest factor that fits imgW×imgH inside boxW×boxH.
 * Used by social resize (index.html:887) and images-to-PDF (index.html:1365).
 */
export function calcFitScale(imgW, imgH, boxW, boxH) {
  return Math.min(boxW / imgW, boxH / imgH);
}

/**
 * "Cover" scale: the smallest factor that fills boxW×boxH with imgW×imgH.
 * Used by passport photo (index.html:1465).
 */
export function calcCoverScale(imgW, imgH, boxW, boxH) {
  return Math.max(boxW / imgW, boxH / imgH);
}

/**
 * Calculates the centered drawing offset and scaled dimensions for "contain" fit.
 * Used in processSocialResize() (index.html:886–889) and imagesToPDF() (index.html:1365).
 */
export function calcContainLayout(imgW, imgH, boxW, boxH) {
  const scale = calcFitScale(imgW, imgH, boxW, boxH);
  const scaledW = imgW * scale;
  const scaledH = imgH * scale;
  return {
    scale,
    scaledW,
    scaledH,
    offsetX: (boxW - scaledW) / 2,
    offsetY: (boxH - scaledH) / 2,
  };
}

/**
 * Calculates the new canvas dimensions when scaling to a target DPI.
 * Mirrors setImageDPI() (index.html:1109). baseDPI is the assumed screen DPI (96).
 */
export function calcDPIScale(imgW, imgH, targetDPI, baseDPI = 96) {
  const s = targetDPI / baseDPI;
  return { w: Math.round(imgW * s), h: Math.round(imgH * s) };
}

/**
 * Parses a "WxH" preset string into { w, h } integers.
 * Mirrors applyResizePreset() (index.html:1302).
 */
export function parseResizePreset(preset) {
  const [w, h] = preset.split('x').map(Number);
  return { w, h };
}
