/**
 * utils.js – Shared utilities for Vercel Serverless Functions
 * 
 * Chỉ giữ lại runWithMetrics (dành cho Replicate mặc định) và PRICE_TABLE.
 * Logic routing theo platform đã được chuyển sang api/adapters/
 */

// ─── PRICE TABLE (USD per second of GPU time) ─────────────────────────────
const PRICE_TABLE = {
    'google/nano-banana-2':                     0.00115,  // A100 (80GB)
    'anthropic/claude-4.5-haiku':               0.00023,  // CPU
    'stability-ai/stable-diffusion-inpainting': 0.00115,  // A100 (80GB)
    'fottoai/remove-bg-2':                      0.00115,  // A100 (80GB)
    'philz1337x/clarity-pro-upscaler':          0.00115,  // A100 (80GB)
};

const normalizeOutput = (out) => {
    if (Array.isArray(out)) return out.map(String);
    if (out === null || out === undefined) return '';
    return String(out);
};

module.exports = { PRICE_TABLE, normalizeOutput };
