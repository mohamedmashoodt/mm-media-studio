import { describe, it, expect } from 'vitest';
import {
  calcWatermarkFontSize,
  calcPDFWatermarkPosition,
  calcSignaturePosition,
  calcSignatureEmbedHeight,
  calcImageWatermarkPosition,
  calcImageWatermarkFontSize,
  calcImageOnPageLayout,
} from '../utils/pdfCalc.js';

// ─── calcWatermarkFontSize ────────────────────────────────────────────────────

describe('calcWatermarkFontSize', () => {
  it('uses the shorter page dimension (portrait A4: 595×842)', () => {
    // min(595, 842) * 0.15 = 89.25
    expect(calcWatermarkFontSize(595, 842)).toBeCloseTo(89.25);
  });

  it('uses the shorter page dimension (landscape A4: 842×595)', () => {
    expect(calcWatermarkFontSize(842, 595)).toBeCloseTo(89.25);
  });

  it('uses the same value for a square page', () => {
    expect(calcWatermarkFontSize(500, 500)).toBeCloseTo(75);
  });

  it('scales proportionally with page size', () => {
    const half = calcWatermarkFontSize(300, 400);
    const full = calcWatermarkFontSize(600, 800);
    expect(full).toBeCloseTo(half * 2);
  });
});

// ─── calcPDFWatermarkPosition ─────────────────────────────────────────────────

describe('calcPDFWatermarkPosition', () => {
  const W = 595, H = 842; // portrait A4

  it('centers the diagonal stamp on the page', () => {
    const { x, y, rotation } = calcPDFWatermarkPosition('diagonal', W, H);
    expect(x).toBe(W / 2);
    expect(y).toBe(H / 2);
    expect(rotation).toBe(-45);
  });

  it('places the top stamp near the top edge (y = H - 50)', () => {
    const { x, y, rotation } = calcPDFWatermarkPosition('top', W, H);
    expect(x).toBe(W / 2);
    expect(y).toBe(H - 50);
    expect(rotation).toBe(0);
  });

  it('places the bottom stamp near the bottom edge (y = 50)', () => {
    const { x, y, rotation } = calcPDFWatermarkPosition('bottom', W, H);
    expect(x).toBe(W / 2);
    expect(y).toBe(50);
    expect(rotation).toBe(0);
  });

  it('falls back to bottom for unrecognised position strings', () => {
    const { y } = calcPDFWatermarkPosition('center', W, H);
    expect(y).toBe(50);
  });

  it('horizontal center is always pageWidth / 2 regardless of position', () => {
    for (const pos of ['diagonal', 'top', 'bottom']) {
      expect(calcPDFWatermarkPosition(pos, W, H).x).toBe(W / 2);
    }
  });
});

// ─── calcSignaturePosition ────────────────────────────────────────────────────

describe('calcSignaturePosition', () => {
  const W = 595, H = 842, sigW = 150;

  it('places bottom-right 30pt from the right and bottom edges', () => {
    const { x, y } = calcSignaturePosition('bottom-right', W, H, sigW);
    expect(x).toBe(W - sigW - 30); // 415
    expect(y).toBe(30);
  });

  it('places bottom-left 30pt from the left and bottom edges', () => {
    const { x, y } = calcSignaturePosition('bottom-left', W, H, sigW);
    expect(x).toBe(30);
    expect(y).toBe(30);
  });

  it('centers bottom-center horizontally', () => {
    const { x, y } = calcSignaturePosition('bottom-center', W, H, sigW);
    expect(x).toBe((W - sigW) / 2); // 222.5
    expect(y).toBe(30);
  });

  it('falls back to bottom-right for "custom" position', () => {
    const { x } = calcSignaturePosition('custom', W, H, sigW);
    expect(x).toBe(W - sigW - 30);
  });

  it('produces a negative x when sigWidth exceeds pageWidth − 30 (known edge case)', () => {
    // sigW=600 > W-30=565 → x is negative; the caller should validate
    const { x } = calcSignaturePosition('bottom-right', W, H, 600);
    expect(x).toBeLessThan(0);
  });
});

// ─── calcSignatureEmbedHeight ─────────────────────────────────────────────────

describe('calcSignatureEmbedHeight', () => {
  it('calculates the correct height for a 700×220 canvas embedded at 150pt wide', () => {
    // 150 * (220 / 700) ≈ 47.14
    expect(calcSignatureEmbedHeight(700, 220, 150)).toBeCloseTo(47.14, 1);
  });

  it('returns the same height as the canvas for a square canvas at embedWidth=canvasWidth', () => {
    expect(calcSignatureEmbedHeight(200, 200, 200)).toBe(200);
  });

  it('uses 150 as the default embed width', () => {
    const withDefault = calcSignatureEmbedHeight(700, 220);
    const explicit = calcSignatureEmbedHeight(700, 220, 150);
    expect(withDefault).toBeCloseTo(explicit);
  });

  it('scales proportionally — doubling embedWidth doubles the height', () => {
    const h1 = calcSignatureEmbedHeight(700, 220, 100);
    const h2 = calcSignatureEmbedHeight(700, 220, 200);
    expect(h2).toBeCloseTo(h1 * 2);
  });
});

// ─── calcImageWatermarkPosition ───────────────────────────────────────────────

describe('calcImageWatermarkPosition', () => {
  const W = 1000, H = 800, TW = 200; // image 1000×800, text width 200

  it('places bottom-right 30px from each edge', () => {
    const { x, y } = calcImageWatermarkPosition('bottom-right', W, H, TW);
    expect(x).toBe(W - TW - 30); // 770
    expect(y).toBe(H - 30);      // 770
  });

  it('places bottom-left at x=30', () => {
    const { x, y } = calcImageWatermarkPosition('bottom-left', W, H, TW);
    expect(x).toBe(30);
    expect(y).toBe(H - 30);
  });

  it('places top-right correctly', () => {
    const { x, y } = calcImageWatermarkPosition('top-right', W, H, TW);
    expect(x).toBe(W - TW - 30);
    expect(y).toBe(50);
  });

  it('centers text horizontally and vertically', () => {
    const { x, y } = calcImageWatermarkPosition('center', W, H, TW);
    expect(x).toBe((W - TW) / 2); // 400
    expect(y).toBe(H / 2);         // 400
  });

  it('produces a negative x for bottom-right when text is wider than image − 30 (edge case)', () => {
    const { x } = calcImageWatermarkPosition('bottom-right', 100, H, 200);
    expect(x).toBeLessThan(0);
  });
});

// ─── calcImageWatermarkFontSize ───────────────────────────────────────────────

describe('calcImageWatermarkFontSize', () => {
  it('returns 3% of image width', () => {
    expect(calcImageWatermarkFontSize(1000)).toBeCloseTo(30);
    expect(calcImageWatermarkFontSize(500)).toBeCloseTo(15);
  });

  it('scales proportionally with image width', () => {
    const small = calcImageWatermarkFontSize(400);
    const large = calcImageWatermarkFontSize(800);
    expect(large).toBeCloseTo(small * 2);
  });
});

// ─── calcImageOnPageLayout ────────────────────────────────────────────────────

describe('calcImageOnPageLayout', () => {
  it('centers a landscape image on an A4 portrait page', () => {
    // 1920×1080 image on 595×842 page → height-limited: scale = 595/1920 ≈ 0.31
    const layout = calcImageOnPageLayout(1920, 1080, 595, 842);
    // Scaled dimensions
    expect(layout.scaledW).toBeCloseTo(595, 0);
    expect(layout.scaledH).toBeCloseTo(595 * (1080 / 1920), 0);
    // Should be centered (x near 0 for width-filling)
    expect(layout.x).toBeCloseTo(0, 0);
    expect(layout.y).toBeGreaterThan(0); // vertical centering
  });

  it('centers a portrait image on a landscape page', () => {
    // 595×842 image on 842×595 page → width-limited
    const layout = calcImageOnPageLayout(595, 842, 842, 595);
    expect(layout.y).toBeCloseTo(0, 0);
    expect(layout.x).toBeGreaterThan(0);
  });

  it('returns zero offsets when image matches page exactly', () => {
    const layout = calcImageOnPageLayout(595, 842, 595, 842);
    expect(layout.x).toBeCloseTo(0);
    expect(layout.y).toBeCloseTo(0);
    expect(layout.scaledW).toBeCloseTo(595);
    expect(layout.scaledH).toBeCloseTo(842);
  });
});
