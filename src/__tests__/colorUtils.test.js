import { describe, it, expect } from 'vitest';
import {
  rgbToHex,
  quantizeChannel,
  extractDominantColors,
  getSignatureThreshold,
  isBackgroundPixel,
  applyContrast,
  rgbToGrayscale,
} from '../utils/colorUtils.js';

// ─── rgbToHex ────────────────────────────────────────────────────────────────

describe('rgbToHex', () => {
  it('converts black to #000000', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts white to #FFFFFF', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
  });

  it('converts the brand red used in the app', () => {
    expect(rgbToHex(195, 7, 63)).toBe('#C3073F');
  });

  it('pads single-hex-digit channels with a leading zero', () => {
    // green=8 → "08", not "8"
    expect(rgbToHex(0, 8, 0)).toBe('#000800');
  });

  it('produces uppercase letters', () => {
    expect(rgbToHex(171, 205, 239)).toBe('#ABCDEF');
  });

  it('handles a pure green channel', () => {
    expect(rgbToHex(0, 128, 0)).toBe('#008000');
  });
});

// ─── quantizeChannel ─────────────────────────────────────────────────────────

describe('quantizeChannel', () => {
  it('maps 0 to 0', () => {
    expect(quantizeChannel(0)).toBe(0);
  });

  it('maps 255 to 256 (callers must clamp)', () => {
    // Math.round(255/32)*32 = Math.round(7.97)*32 = 8*32 = 256
    // This is a known quirk — the caller clamps with Math.min(255, v).
    expect(quantizeChannel(255)).toBe(256);
  });

  it('maps 128 to 128 (exact midpoint of a bucket)', () => {
    // 128/32 = 4.0 → round(4.0)*32 = 128
    expect(quantizeChannel(128)).toBe(128);
  });

  it('maps 140 to 128 (rounds down to nearest 32)', () => {
    // 140/32 = 4.375 → round → 4 → 128
    expect(quantizeChannel(140)).toBe(128);
  });

  it('maps 150 to 160 (rounds up to nearest 32)', () => {
    // 150/32 = 4.6875 → round → 5 → 160
    expect(quantizeChannel(150)).toBe(160);
  });

  it('maps 32 to 32', () => {
    expect(quantizeChannel(32)).toBe(32);
  });
});

// ─── extractDominantColors ───────────────────────────────────────────────────

describe('extractDominantColors', () => {
  function solidPixels(r, g, b, count = 10) {
    // Each pixel = 4 bytes: R, G, B, A
    const data = [];
    for (let i = 0; i < count; i++) data.push(r, g, b, 255);
    return data;
  }

  it('returns a single color for a solid-red image', () => {
    const pixels = solidPixels(200, 0, 0, 20);
    const colors = extractDominantColors(pixels, 1, 8);
    expect(colors).toHaveLength(1);
    expect(colors[0].r).toBe(192); // nearest 32-multiple below 200
    expect(colors[0].g).toBe(0);
    expect(colors[0].b).toBe(0);
  });

  it('clamps quantized 255 channels to 255 in the output', () => {
    const pixels = solidPixels(255, 255, 255, 10);
    const colors = extractDominantColors(pixels, 1, 8);
    expect(colors[0].r).toBe(255);
    expect(colors[0].g).toBe(255);
    expect(colors[0].b).toBe(255);
  });

  it('returns colors sorted by frequency, most frequent first', () => {
    // 15 red pixels then 5 blue pixels
    const pixels = [...solidPixels(200, 0, 0, 15), ...solidPixels(0, 0, 200, 5)];
    const colors = extractDominantColors(pixels, 1, 8);
    expect(colors[0].r).toBeGreaterThan(colors[0].b); // red is first
    expect(colors[1].b).toBeGreaterThan(colors[1].r); // blue is second
  });

  it('returns at most topN colors', () => {
    const pixels = [
      ...solidPixels(200, 0, 0, 5),
      ...solidPixels(0, 200, 0, 5),
      ...solidPixels(0, 0, 200, 5),
    ];
    const colors = extractDominantColors(pixels, 1, 2);
    expect(colors.length).toBeLessThanOrEqual(2);
  });

  it('attaches a hex string to each result', () => {
    const pixels = solidPixels(0, 0, 0, 10);
    const colors = extractDominantColors(pixels, 1, 8);
    expect(colors[0].hex).toBe('#000000');
  });

  it('returns an empty array for empty pixel data', () => {
    expect(extractDominantColors([], 1, 8)).toHaveLength(0);
  });
});

// ─── getSignatureThreshold ───────────────────────────────────────────────────

describe('getSignatureThreshold', () => {
  it('returns 180 for low sensitivity', () => {
    expect(getSignatureThreshold('low')).toBe(180);
  });

  it('returns 200 for medium sensitivity', () => {
    expect(getSignatureThreshold('medium')).toBe(200);
  });

  it('returns 220 for high sensitivity', () => {
    expect(getSignatureThreshold('high')).toBe(220);
  });

  it('defaults to medium (200) for unknown values', () => {
    expect(getSignatureThreshold('unknown')).toBe(200);
    expect(getSignatureThreshold(undefined)).toBe(200);
  });

  it('thresholds increase from low to high (more aggressive removal)', () => {
    expect(getSignatureThreshold('low'))
      .toBeLessThan(getSignatureThreshold('medium'));
    expect(getSignatureThreshold('medium'))
      .toBeLessThan(getSignatureThreshold('high'));
  });
});

// ─── isBackgroundPixel ───────────────────────────────────────────────────────

describe('isBackgroundPixel', () => {
  it('flags a near-white pixel as background', () => {
    expect(isBackgroundPixel(240, 240, 240, 200)).toBe(true);
  });

  it('keeps a dark ink pixel (brightness 100) at all thresholds', () => {
    expect(isBackgroundPixel(100, 100, 100, 180)).toBe(false);
    expect(isBackgroundPixel(100, 100, 100, 220)).toBe(false);
  });

  it('correctly straddles the threshold boundary', () => {
    // brightness = (210+210+210)/3 = 210
    expect(isBackgroundPixel(210, 210, 210, 200)).toBe(true);  // > 200 → background
    expect(isBackgroundPixel(200, 200, 200, 200)).toBe(false); // = 200 → keep (not strictly >)
    expect(isBackgroundPixel(199, 199, 199, 200)).toBe(false); // < 200 → keep
  });

  it('a pixel with brightness exactly at high threshold (220) is kept', () => {
    expect(isBackgroundPixel(220, 220, 220, 220)).toBe(false);
  });

  it('handles mixed channels — uses average brightness', () => {
    // (0 + 0 + 255) / 3 = 85 → below any threshold → keep
    expect(isBackgroundPixel(0, 0, 255, 180)).toBe(false);
  });
});

// ─── applyContrast ───────────────────────────────────────────────────────────

describe('applyContrast', () => {
  it('is a no-op at contrast=1.0', () => {
    // ((v/255 - 0.5)*1 + 0.5)*255 = v
    expect(applyContrast(0, 1)).toBeCloseTo(0);
    expect(applyContrast(128, 1)).toBeCloseTo(128);
    expect(applyContrast(255, 1)).toBeCloseTo(255);
  });

  it('clips bright pixels to 255 at high contrast', () => {
    // A value near 255 with contrast=2 should clip to 255
    expect(applyContrast(240, 2)).toBe(255);
  });

  it('clips dark pixels to 0 at high contrast', () => {
    // A value near 0 with contrast=2 should clip to 0
    expect(applyContrast(10, 2)).toBe(0);
  });

  it('keeps the true midpoint (127.5) stable at any contrast', () => {
    // The formula's fixed point is 255/2 = 127.5, not 128.
    // ((127.5/255 - 0.5)*c + 0.5)*255 = 0.5*255 = 127.5 exactly.
    expect(applyContrast(127.5, 2)).toBeCloseTo(127.5);
    expect(applyContrast(127.5, 1.5)).toBeCloseTo(127.5);
  });

  it('input 128 shifts slightly above 127.5 at higher contrast (float precision)', () => {
    // 128/255 ≈ 0.5020, not 0.5, so it drifts slightly toward 255 with contrast > 1.
    // At contrast=2: ((128/255 - 0.5)*2 + 0.5)*255 ≈ 128.5
    expect(applyContrast(128, 2)).toBeCloseTo(128.5, 0);
  });

  it('at contrast=0 everything collapses to the midpoint (128)', () => {
    // ((v/255 - 0.5)*0 + 0.5)*255 = 127.5
    expect(applyContrast(0, 0)).toBeCloseTo(127.5);
    expect(applyContrast(255, 0)).toBeCloseTo(127.5);
  });

  it('never returns a value below 0 or above 255', () => {
    for (const v of [0, 64, 128, 192, 255]) {
      const result = applyContrast(v, 5);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(255);
    }
  });
});

// ─── rgbToGrayscale ──────────────────────────────────────────────────────────

describe('rgbToGrayscale', () => {
  it('converts pure red to its luminance contribution', () => {
    expect(rgbToGrayscale(255, 0, 0)).toBeCloseTo(76.245);
  });

  it('converts pure green to its luminance contribution', () => {
    expect(rgbToGrayscale(0, 255, 0)).toBeCloseTo(149.685);
  });

  it('converts pure blue to its luminance contribution', () => {
    expect(rgbToGrayscale(0, 0, 255)).toBeCloseTo(29.07);
  });

  it('converts white to 255', () => {
    expect(rgbToGrayscale(255, 255, 255)).toBeCloseTo(255);
  });

  it('converts black to 0', () => {
    expect(rgbToGrayscale(0, 0, 0)).toBe(0);
  });

  it('green contributes more than red, red more than blue (BT.601)', () => {
    const red = rgbToGrayscale(255, 0, 0);
    const green = rgbToGrayscale(0, 255, 0);
    const blue = rgbToGrayscale(0, 0, 255);
    expect(green).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
  });
});
