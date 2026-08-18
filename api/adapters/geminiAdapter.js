const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run(task, std) {
    const { keys, override_model } = std;
    if (!keys?.gemini) throw new Error('Gemini API key is missing. Please enter your API key in Settings.');
    if (!override_model) throw new Error('Gemini requires a model ID in the Override settings.');

    const genAI   = new GoogleGenerativeAI(keys.gemini);
    const model   = genAI.getGenerativeModel({ model: override_model });
    const startMs = Date.now();

    // Build parts array based on what's available
    const parts = [];
    if (std.prompt) {
        parts.push({ text: std.prompt });
    }

    const addImagePart = (dataUri) => {
        if (!dataUri) return;
        const base64Data = dataUri.split(',')[1];
        const mimeType   = dataUri.split(';')[0].replace('data:', '');
        parts.push({ inlineData: { mimeType, data: base64Data } });
    };

    switch (task) {
        case 'text-to-image':
            // Gemini image generation (requires gemini-2.0-flash-preview-image-generation model)
            if (std.image_input?.length) addImagePart(std.image_input[0]);
            break;
        case 'image-to-prompt':
        case 'inpaint':
        case 'remove-bg':
        case 'upscale':
            addImagePart(std.image);
            if (std.mask) addImagePart(std.mask);
            break;
        default:
            throw new Error(`geminiAdapter: unknown task "${task}"`);
    }

    if (parts.length === 0) throw new Error('Gemini: no content to send.');

    const result    = await model.generateContent({
        contents:           [{ role: 'user', parts }],
        generationConfig:   { responseModalities: ['Text', 'Image'] },
    });
    const elapsedMs = Date.now() - startMs;

    // Check for image output first, then fall back to text
    const candidate = result?.response?.candidates?.[0];
    const imgPart   = candidate?.content?.parts?.find(p => p.inlineData);
    let output;

    if (imgPart) {
        output = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
    } else {
        output = result?.response?.text?.() || '';
    }

    return {
        output,
        metrics: {
            predict_time:       Math.round(elapsedMs / 10) / 100,
            elapsed_ms:         elapsedMs,
            estimated_cost_usd: null,
            model:              override_model,
            platform:           'gemini',
        },
    };
}

module.exports = { run };
