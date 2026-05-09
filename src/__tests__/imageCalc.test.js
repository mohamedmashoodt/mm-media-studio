import { describe, it, expect } from 'vitest';
import {
  calcPerspectiveDimensions,
  calcCropRegion,
  calcAspectConstrainedEndY,
  calcAspectRatio,
  calcFitScale,
  calcCoverScale,
  calcContainLayout,
  calcDPIScale,
  parseResizePreset,
} from '../utils/imageCalc.js';

// ─── calcPerspectiveDimensions ───────────────────────────────────────────────

describe('calcPerspectiveDimensions', () => {
  it('returns correct dimensions for a perfect axis-aligned rectangle', () => {
    const src = [
      { x: 0, y: 0 },    // TL
      { x: 800, y: 0 },  // TR
      { x: 800, y: 600 }, // BR
      { x: 0, y: 600 },  // BL
    ];
    expect(calcPerspectiveDimensions(src)).toEqual({ w: 800, h: 600 });
  });

  it('returns correct dimensions for a perfect square', () => {
    const src = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 500 },
      { x: 0, y: 500 },
    ];
    expect(calcPerspectiveDimensions(src)).toEqual({ w: 500, h: 500 });
  });

  it('uses the longer edge when the quad is slightly trapezoidal (top wider than bottom)', () => {
    // top edge = 800, bottom edge = 700 → w should be 800
    const src = [
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 750, y: 600 },
      { x: 50, y: 600 },
    ];
    const { w } = calcPerspectiveDimensions(src);
    expect(w).toBe(800);
  });

  it('uses the longer edge when the quad is slightly trapezoidal (left taller than right)', () => {
    // left edge = 600, right edge = 500 → h should be 600
    const src = [
      { x: 0, y: 0 },
      { x: 800, y: 50 },
      { x: 800, y: 550 },
      { x: 0, y: 600 },
    ];
    const { h } = calcPerspectiveDimensions(src);
    expect(h).toBe(600);
  });

  it('rounds fractional pixel dimensions to whole numbers', () => {
    // A diagonal edge will produce a non-integer hypot result
    const src = [
      { x: 0, y: 0 },
      { x: 100, y: 1 },  // top edge ≈ 100.005
      { x: 100, y: 101 },
      { x: 0, y: 100 },
    ];
    const { w, h } = calcPerspectiveDimensions(src);
    expect(Number.isInteger(w)).toBe(true);
    expect(Number.isInteger(h)).toBe(true);
  });
});

// ─── calcCropRegion ──────────────────────────────────────────────────────────

describe('calcCropRegion', () => {
  it('converts canvas coordinates to image coordinates using scale', () => {
    // scale=0.5 means canvas is half the image size
    const region = calcCropRegion(50, 50, 150, 150, 0.5);
    expect(region).toEqual({ x: 100, y: 100, w: 200, h: 200 });
  });

  it('produces the same region when dragging right-to-left vs left-to-right', () => {
    const ltr = calcCropRegion(10, 10, 100, 100, 1);
    const rtl = calcCropRegion(100, 100, 10, 10, 1);
    expect(ltr).toEqual(rtl);
  });

  it('returns zero width and height for a zero-size selection', () => {
    const region = calcCropRegion(50, 50, 50, 50, 1);
    expect(region.w).toBe(0);
    expect(region.h).toBe(0);
  });

  it('returns correct region at scale=1 (no scaling)', () => {
    const region = calcCropRegion(20, 30, 120, 180, 1);
    expect(region).toEqual({ x: 20, y: 30, w: 100, h: 150 });
  });
});

// ─── calcAspectConstrainedEndY ───────────────────────────────────────────────

describe('calcAspectConstrainedEndY', () => {
  it('is a passthrough when aspectRatio is null (free crop)', () => {
    expect(calcAspectConstrainedEndY(0, 100, 0, 75, null)).toBe(75);
  });

  it('constrains a 1:1 drag correctly', () => {
    // width = |endX - startX| = |100 - 0| = 100; constrained h = 100/1 = 100
    expect(calcAspectConstrainedEndY(0, 100, 0, 80, 1)).toBe(100);
  });

  it('constrains a 16:9 drag correctly', () => {
    // width = 160; h = 160 / (16/9) = 90
    expect(calcAspectConstrainedEndY(0, 160, 0, 80, 16 / 9)).toBeCloseTo(90);
  });

  it('handles upward drags (endY < startY) by negating the height', () => {
    // dragging up: rawEndY=0 < startY=100 → constrained endY = 100 + (-100/1) = 0
    expect(calcAspectConstrainedEndY(100, 100, 0, 0, 1)).toBe(0);
  });
});

// ─── calcAspectRatio ─────────────────────────────────────────────────────────

describe('calcAspectRatio', () => {
  it('returns null for "free"', () => {
    expect(calcAspectRatio('free')).toBeNull();
  });

  it('returns 1 for "1:1"', () => {
    expect(calcAspectRatio('1:1')).toBe(1);
  });

  it('returns 4/3 for "4:3"', () => {
    expect(calcAspectRatio('4:3')).toBeCloseTo(1.333);
  });

  it('returns 16/9 for "16:9"', () => {
    expect(calcAspectRatio('16:9')).toBeCloseTo(1.778);
  });

  it('returns 35/45 for "passport-india"', () => {
    expect(calcAspectRatio('passport-india')).toBeCloseTo(0.778);
  });

  it('returns null for unknown keys', () => {
    expect(calcAspectRatio('3:2')).toBeNull();
    expect(calcAspectRatio('')).toBeNull();
  });
});

// ─── calcFitScale (contain) ──────────────────────────────────────────────────

describe('calcFitScale', () => {
  it('is limited by width when the image is wider than the box', () => {
    // 2000×1000 into 500×500 → width-limited: scale = 500/2000 = 0.25
    expect(calcFitScale(2000, 1000, 500, 500)).toBe(0.25);
  });

  it('is limited by height when the image is taller than the box', () => {
    // 1000×2000 into 500×500 → height-limited: scale = 500/2000 = 0.25
    expect(calcFitScale(1000, 2000, 500, 500)).toBe(0.25);
  });

  it('returns 1 when the image fits exactly in the box', () => {
    expect(calcFitScale(500, 500, 500, 500)).toBe(1);
  });

  it('can return >1 when box is larger than image (upscale)', () => {
    expect(calcFitScale(100, 100, 200, 200)).toBe(2);
  });

  it('a 1920×1080 image fits into 1280×720 scaled to 720/1080', () => {
    // height is the limiting dimension: 720/1080 ≈ 0.667
    expect(calcFitScale(1920, 1080, 1280, 720)).toBeCloseTo(720 / 1080);
  });
});

// ─── calcCoverScale ──────────────────────────────────────────────────────────

describe('calcCoverScale', () => {
  it('is driven by the larger dimension to fill the box', () => {
    // 2000×1000 into 500×500 → must cover → limited by height: 500/1000 = 0.5
    expect(calcCoverScale(2000, 1000, 500, 500)).toBe(0.5);
  });

  it('returns 1 for equal dimensions', () => {
    expect(calcCoverScale(500, 500, 500, 500)).toBe(1);
  });

  it('always produces a larger scale than calcFitScale for non-square images', () => {
    const fit = calcFitScale(1920, 1080, 413, 531);
    const cover = calcCoverScale(1920, 1080, 413, 531);
    expect(cover).toBeGreaterThanOrEqual(fit);
  });

  it('fills the passport box (413×531) for a landscape photo', () => {
    // landscape 1920×1080 → cover scale is max(413/1920, 531/1080) ≈ 0.492
    const scale = calcCoverScale(1920, 1080, 413, 531);
    expect(1920 * scale).toBeGreaterThanOrEqual(413);
    expect(1080 * scale).toBeGreaterThanOrEqual(531);
  });
});

// ─── calcContainLayout ───────────────────────────────────────────────────────

describe('calcContainLayout', () => {
  it('centers a portrait image in a square box', () => {
    // 100×200 image into 200×200 box → scale=1, offsetX=50, offsetY=0
    const layout = calcContainLayout(100, 200, 200, 200);
    expect(layout.scale).toBe(1);
    expect(layout.offsetX).toBe(50);
    expect(layout.offsetY).toBe(0);
  });

  it('centers a landscape image in a square box', () => {
    // 200×100 into 200×200 → scale=1, offsetX=0, offsetY=50
    const layout = calcContainLayout(200, 100, 200, 200);
    expect(layout.scale).toBe(1);
    expect(layout.offsetX).toBe(0);
    expect(layout.offsetY).toBe(50);
  });

  it('scales down a large image', () => {
    // 1080×1080 into 500×500 → scale≈0.463
    const layout = calcContainLayout(1080, 1080, 500, 500);
    expect(layout.scaledW).toBeCloseTo(500);
    expect(layout.scaledH).toBeCloseTo(500);
  });
});

// ─── calcDPIScale ────────────────────────────────────────────────────────────

describe('calcDPIScale', () => {
  it('triples the canvas for 288 DPI (3× screen DPI)', () => {
    const { w, h } = calcDPIScale(100, 100, 288);
    expect(w).toBe(300);
    expect(h).toBe(300);
  });

  it('returns the original size at 96 DPI (screen DPI)', () => {
    expect(calcDPIScale(200, 150, 96)).toEqual({ w: 200, h: 150 });
  });

  it('rounds to whole pixels', () => {
    // 100 * (300/96) = 312.5 → rounds to 313
    const { w } = calcDPIScale(100, 100, 300);
    expect(Number.isInteger(w)).toBe(true);
    expect(w).toBe(313);
  });

  it('scales a 96px image to ~3.125× at 300 DPI', () => {
    const { w } = calcDPIScale(96, 96, 300);
    expect(w).toBe(300);
  });
});

// ─── parseResizePreset ───────────────────────────────────────────────────────

describe('parseResizePreset', () => {
  it('parses "1920x1080" correctly', () => {
    expect(parseResizePreset('1920x1080')).toEqual({ w: 1920, h: 1080 });
  });

  it('parses "3840x2160" correctly', () => {
    expect(parseResizePreset('3840x2160')).toEqual({ w: 3840, h: 2160 });
  });

  it('parses "1280x720" correctly', () => {
    expect(parseResizePreset('1280x720')).toEqual({ w: 1280, h: 720 });
  });

  it('parses a square preset', () => {
    expect(parseResizePreset('500x500')).toEqual({ w: 500, h: 500 });
  });
});
