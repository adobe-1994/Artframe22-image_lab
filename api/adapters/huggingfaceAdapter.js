const { HfInference } = require('@huggingface/inference');

// ─── Map StandardInput → HuggingFace params for each task ──────────────────
async function run(task, std) {
    const { keys, override_model } = std;
    if (!keys?.huggingface) throw new Error('Hugging Face API key is missing. Please enter your API key in Settings.');
    if (!override_model) throw new Error('Hugging Face requires a model ID in the Override settings.');

    const hf       = new HfInference(keys.huggingface);
    const startMs  = Date.now();
    let output;

    switch (task) {
        case 'text-to-image': {
            const blob     = await hf.textToImage({ model: override_model, inputs: std.prompt });
            const arrayBuf = await blob.arrayBuffer();
            const b64      = Buffer.from(arrayBuf).toString('base64');
            output         = `data:image/png;base64,${b64}`;
            break;
        }
        case 'image-to-prompt': {
            if (!std.image) throw new Error('Image is required for image-to-prompt.');
            const base64Data = std.image.split(',')[1];
            const imgBuffer  = Buffer.from(base64Data, 'base64');
            const result     = await hf.imageToText({ model: override_model, data: imgBuffer });
            output           = result?.generated_text || '';
            break;
        }
        case 'inpaint': {
            // HF inpainting via pipeline if model supports it
            const base64Data = std.image.split(',')[1];
            const imgBuffer  = Buffer.from(base64Data, 'base64');
            const blob       = await hf.imageToImage({ model: override_model, inputs: imgBuffer, parameters: { prompt: std.prompt } });
            const arrayBuf   = await blob.arrayBuffer();
            const b64        = Buffer.from(arrayBuf).toString('base64');
            output           = `data:image/png;base64,${b64}`;
            break;
        }
        case 'remove-bg':
        case 'upscale': {
            const base64Data = std.image.split(',')[1];
            const imgBuffer  = Buffer.from(base64Data, 'base64');
            const blob       = await hf.imageToImage({ model: override_model, inputs: imgBuffer });
            const arrayBuf   = await blob.arrayBuffer();
            const b64        = Buffer.from(arrayBuf).toString('base64');
            output           = `data:image/png;base64,${b64}`;
            break;
        }
        default:
            throw new Error(`huggingfaceAdapter: unknown task "${task}"`);
    }

    const elapsedMs = Date.now() - startMs;
    return {
        output,
        metrics: {
            predict_time:       Math.round(elapsedMs / 10) / 100,
            elapsed_ms:         elapsedMs,
            estimated_cost_usd: null,
            model:              override_model,
            platform:           'huggingface',
        },
    };
}

module.exports = { run };
