/**
 * Pure PDF layout calculation functions extracted from index.html.
 * All functions operate on numbers only — no pdf-lib or DOM dependencies.
 */

/**
 * Calculates the diagonal watermark font size as 15% of the shorter page dimension.
 * Mirrors addPDFWatermark() (index.html:1074).
 */
export function calcWatermarkFontSize(pageWidth, pageHeight) {
  return Math.min(pageWidth, pageHeight) * 0.15;
}

/**
 * Returns the (x, y, rotation) for a watermark stamp on a PDF page.
 * Mirrors the position logic in addPDFWatermark() (index.html:1075–1079).
 *
 * Note: pdf-lib uses bottom-left origin, so y=50 is near the bottom and
 * y=height-50 is near the top.
 *
 * @returns {{ x: number, y: number, rotation: number }} rotation in degrees
 */
export function calcPDFWatermarkPosition(position, pageWidth, pageHeight) {
  if (position === 'diagonal') return { x: pageWidth / 2, y: pageHeight / 2, rotation: -45 };
  if (position === 'top') return { x: pageWidth / 2, y: pageHeight - 50, rotation: 0 };
  return { x: pageWidth / 2, y: 50, rotation: 0 }; // 'bottom' (default)
}

/**
 * Calculates the (x, y) position for embedding a signature image on a PDF page.
 * pdf-lib origin is bottom-left, so y=30 is near the bottom edge.
 * Mirrors embedSigInPDF() (index.html:742–745).
 *
 * @param {string} position - 'bottom-right' | 'bottom-left' | 'bottom-center' | 'custom'
 * @param {number} pageWidth
 * @param {number} pageHeight  - unused in current impl but kept for future use
 * @param {number} sigWidth
 * @returns {{ x: number, y: number }}
 */
export function calcSignaturePosition(position, pageWidth, pageHeight, sigWidth) {
  if (position === 'bottom-left') return { x: 30, y: 30 };
  if (position === 'bottom-center') return { x: (pageWidth - sigWidth) / 2, y: 30 };
  return { x: pageWidth - sigWidth - 30, y: 30 }; // 'bottom-right' and 'custom' fallback
}

/**
 * Calculates the signature height from its aspect ratio and the fixed embed width.
 * Mirrors the sH calculation in embedSigInPDF() (index.html:740).
 *
 * @param {number} canvasWidth  - signature canvas width in px
 * @param {number} canvasHeight - signature canvas height in px
 * @param {number} embedWidth   - target width in PDF points (default 150)
 */
export function calcSignatureEmbedHeight(canvasWidth, canvasHeight, embedWidth = 150) {
  return embedWidth * (canvasHeight / canvasWidth);
}

/**
 * Calculates the canvas-space x position for a text watermark on an image.
 * Mirrors addTextWatermark() (index.html:1394–1397).
 *
 * @param {string} position
 * @param {number} imgWidth
 * @param {number} imgHeight
 * @param {number} textWidth  - result of ctx.measureText(text).width
 * @returns {{ x: number, y: number }}
 */
export function calcImageWatermarkPosition(position, imgWidth, imgHeight, textWidth) {
  if (position === 'bottom-right') return { x: imgWidth - textWidth - 30, y: imgHeight - 30 };
  if (position === 'bottom-left') return { x: 30, y: imgHeight - 30 };
  if (position === 'top-right') return { x: imgWidth - textWidth - 30, y: 50 };
  return { x: (imgWidth - textWidth) / 2, y: imgHeight / 2 }; // 'center'
}

/**
 * Calculates the font size for image watermarks as 3% of image width.
 * Mirrors addTextWatermark() (index.html:1392).
 */
export function calcImageWatermarkFontSize(imgWidth) {
  return imgWidth * 0.03;
}

/**
 * Calculates the contain-fit layout when placing an image on a fixed-size PDF page.
 * Mirrors the scaling in imagesToPDF() (index.html:1365).
 *
 * @returns {{ x: number, y: number, scaledW: number, scaledH: number }}
 */
export function calcImageOnPageLayout(imgWidth, imgHeight, pageWidth, pageHeight) {
  const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
  const scaledW = imgWidth * scale;
  const scaledH = imgHeight * scale;
  return {
    x: (pageWidth - scaledW) / 2,
    y: (pageHeight - scaledH) / 2,
    scaledW,
    scaledH,
  };
}
