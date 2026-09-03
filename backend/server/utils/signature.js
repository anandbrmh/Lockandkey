import crypto from "crypto";

/**
 * Generate HMAC-SHA256 hex signature for a payload.
 * Accepts object (JSON.stringify) or raw string/Buffer.
 * @param {object|string|Buffer} payload
 * @param {string} secret
 * @returns {string} hex digest
 */
export function generateSignature(payload, secret) {
  const data = typeof payload === "string" || Buffer.isBuffer(payload)
    ? payload
    : JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Verify signature using timing-safe comparison.
 * Handles hex string signatures and guards against length mismatch throws.
 * @param {object|string|Buffer} payload
 * @param {string} signature - hex string from X-Signature header
 * @param {string} secret
 * @returns {boolean}
 */
export function verifySignature(payload, signature, secret) {
  if (!secret || !signature) return false;
  try {
    const expected = generateSignature(payload, secret);
    // Normalize to buffers - handle hex encoding explicitly
    const expectedBuf = Buffer.from(expected, "utf8");
    const sigBuf = Buffer.from(String(signature).trim(), "utf8");
    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

/**
 * Verify raw body Buffer/string against signature.
 * Use this for incoming webhooks where you have raw request body.
 * @param {string|Buffer} rawBody
 * @param {string} signature
 * @param {string} secret
 */
export function verifyRawSignature(rawBody, signature, secret) {
  return verifySignature(rawBody, signature, secret);
}

