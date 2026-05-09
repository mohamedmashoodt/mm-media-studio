import { describe, it, expect } from 'vitest';
import { formatWifiQR, formatVCardQR, replaceExtension } from '../utils/qrFormat.js';

// ─── formatWifiQR ─────────────────────────────────────────────────────────────

describe('formatWifiQR', () => {
  it('produces the correct WiFi QR spec string', () => {
    expect(formatWifiQR('MyNetwork', 'secret123')).toBe(
      'WIFI:T:WPA;S:MyNetwork;P:secret123;;',
    );
  });

  it('defaults to WPA security', () => {
    expect(formatWifiQR('Net', 'pass')).toContain('T:WPA');
  });

  it('supports WEP security type', () => {
    expect(formatWifiQR('OldNet', 'pass', 'WEP')).toBe(
      'WIFI:T:WEP;S:OldNet;P:pass;;',
    );
  });

  it('supports open networks (nopass)', () => {
    expect(formatWifiQR('OpenNet', '', 'nopass')).toBe(
      'WIFI:T:nopass;S:OpenNet;P:;;',
    );
  });

  it('handles an empty password (produces P:;;)', () => {
    // Callers pass an empty string when no password is entered; result should
    // still be parseable by QR scanners as an open/no-password network entry.
    const result = formatWifiQR('FreeWifi', '');
    expect(result).toContain('P:;');
  });

  it('handles SSIDs with special characters', () => {
    const result = formatWifiQR('Café & Co.', 'pass');
    expect(result).toContain('S:Café & Co.');
  });

  it('ends with the required double-semicolon terminator', () => {
    expect(formatWifiQR('Net', 'pass')).toMatch(/;;$/);
  });
});

// ─── formatVCardQR ───────────────────────────────────────────────────────────

describe('formatVCardQR', () => {
  it('produces a valid vCard 3.0 string', () => {
    const result = formatVCardQR('Alice Smith', '+1234567890', 'alice@example.com');
    expect(result).toBe(
      'BEGIN:VCARD\nVERSION:3.0\nFN:Alice Smith\nTEL:+1234567890\nEMAIL:alice@example.com\nEND:VCARD',
    );
  });

  it('starts with BEGIN:VCARD and ends with END:VCARD', () => {
    const result = formatVCardQR('Bob', '555', 'bob@test.com');
    expect(result.startsWith('BEGIN:VCARD')).toBe(true);
    expect(result.endsWith('END:VCARD')).toBe(true);
  });

  it('includes VERSION:3.0', () => {
    expect(formatVCardQR('Carol', '123', 'c@test.com')).toContain('VERSION:3.0');
  });

  it('handles empty fields (no crash, fields still present)', () => {
    const result = formatVCardQR('', '', '');
    expect(result).toContain('FN:');
    expect(result).toContain('TEL:');
    expect(result).toContain('EMAIL:');
  });

  it('preserves spaces and unicode in the name', () => {
    const result = formatVCardQR('José García', '+34600000000', 'jose@example.es');
    expect(result).toContain('FN:José García');
  });
});

// ─── replaceExtension ─────────────────────────────────────────────────────────

describe('replaceExtension', () => {
  it('replaces a simple .jpg extension', () => {
    expect(replaceExtension('photo.jpg', '_compressed.jpg')).toBe('photo_compressed.jpg');
  });

  it('replaces a .png extension', () => {
    expect(replaceExtension('image.png', '_clean.jpg')).toBe('image_clean.jpg');
  });

  it('replaces only the last extension in double-extension filenames', () => {
    // "file.tar.gz" → strips ".gz", appends suffix
    expect(replaceExtension('file.tar.gz', '_processed.gz')).toBe('file.tar_processed.gz');
  });

  it('returns the filename unchanged when there is no extension (known limitation)', () => {
    // The regex /\.[^/.]+$/ requires a dot, so "README" matches nothing.
    // The suffix is silently dropped — callers should validate the filename first.
    expect(replaceExtension('README', '_clean.jpg')).toBe('README');
  });

  it('handles hidden dotfiles (leading dot, no other extension)', () => {
    // ".hidden" → the regex matches ".hidden" as the extension, leaving an empty base
    // This is the known edge case — verify actual behaviour rather than ideal behaviour
    expect(replaceExtension('.hidden', '_clean.jpg')).toBe('_clean.jpg');
  });

  it('handles uppercase extensions', () => {
    expect(replaceExtension('PHOTO.JPG', '_watermarked.jpg')).toBe('PHOTO_watermarked.jpg');
  });

  it('preserves spaces in filenames', () => {
    expect(replaceExtension('my photo.jpg', '_resized.jpg')).toBe('my photo_resized.jpg');
  });

  it('converts a PDF extension to a signed PDF name', () => {
    expect(replaceExtension('contract.pdf', '_signed.pdf')).toBe('contract_signed.pdf');
  });
});
