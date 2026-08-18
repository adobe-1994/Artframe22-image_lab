/**
 * Adapter Dispatcher (index.js)
 * 
 * Nhận vào: (platform, task, standardInput)
 * Trả ra:   { output, metrics }
 * 
 * Để thêm nền tảng mới: tạo file adapter mới và thêm vào ADAPTERS bên dưới.
 */

const ADAPTERS = {
    replicate:   require('./replicateAdapter'),
    fal:         require('./falAdapter'),
    huggingface: require('./huggingfaceAdapter'),
    gemini:      require('./geminiAdapter'),
    openai:      require('./openaiAdapter'),
};

/**
 * @param {string} platform  - e.g. 'replicate', 'fal', 'gemini'
 * @param {string} task      - e.g. 'text-to-image', 'remove-bg'
 * @param {object} std       - Standard Input (prompt, image, keys, ...)
 */
async function runAdapter(platform, task, std) {
    const plt = (platform || 'replicate').toLowerCase();
    const adapter = ADAPTERS[plt];

    if (!adapter) {
        throw new Error(`Unsupported platform: "${platform}". Available: ${Object.keys(ADAPTERS).join(', ')}`);
    }

    return adapter.run(task, std);
}

module.exports = { runAdapter };
