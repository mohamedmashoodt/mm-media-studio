/**
 * QR data string formatters extracted from generateQR() (index.html:1488–1492).
 * Pure string functions — no DOM or library dependencies.
 */

/**
 * Formats WiFi credentials into the standard QR WiFi URI string.
 * Spec: https://github.com/zxing/zxing/wiki/Barcode-Contents#wi-fi-network-config-android
 *
 * @param {string} ssid
 * @param {string} password
 * @param {string} security - 'WPA' | 'WEP' | 'nopass'
 */
export function formatWifiQR(ssid, password, security = 'WPA') {
  return `WIFI:T:${security};S:${ssid};P:${password};;`;
}

/**
 * Formats contact data into a vCard 3.0 string for QR encoding.
 * Mirrors the contact branch in generateQR() (index.html:1492).
 */
export function formatVCardQR(name, phone, email) {
  return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
}

/**
 * Strips the file extension from a filename and appends a new suffix.
 * Mirrors the pattern used throughout index.html, e.g.:
 *   file.name.replace(/\.[^/.]+$/, '_compressed.jpg')   (index.html:1274)
 *
 * Edge cases this function makes explicit and testable:
 *   - Files with no extension      ("photo"     → "photo" + suffix)
 *   - Hidden files / dotfiles      (".hidden"   → "" + suffix, losing the name)
 *   - Double extensions            ("file.tar.gz" → "file.tar" + suffix)
 */
export function replaceExtension(filename, suffix) {
  return filename.replace(/\.[^/.]+$/, suffix);
}
