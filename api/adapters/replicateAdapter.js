const Replicate = require('replicate');

const PRICE_TABLE = {
    'google/nano-banana-2':                     0.00115,
    'anthropic/claude-4.5-haiku':               0.00023,
    'stability-ai/stable-diffusion-inpainting': 0.00115,
    'fottoai/remove-bg-2':                      0.00115,
    'philz1337x/clarity-pro-upscaler':          0.00115,
};

const DEFAULT_MODELS = {
    'text-to-image':   'google/nano-banana-2',
    'image-to-prompt': 'anthropic/claude-4.5-haiku',
    'inpaint':         'stability-ai/stable-diffusion-inpainting',
    'remove-bg':       'fottoai/remove-bg-2',
    'upscale':         'philz1337x/clarity-pro-upscaler',
};

const VERSION_MAP = {
    'fottoai/remove-bg-2': 'd748bcc6882e5567ffe1468356323e6345736494dd9b827ff2871a68fca79be5',
};

// ─── Map StandardInput → Replicate input for each task ─────────────────────
function buildInput(task, std, modelId) {
    switch (task) {
        case 'text-to-image':
            const t2iInput = {
                prompt:              std.prompt,
                aspect_ratio:        std.aspect_ratio        || 'match_input_image',
                resolution:          std.resolution          || '2K',
                output_format:       std.output_format       || 'jpg',
                safety_filter_level: std.safety_filter_level || 'block_only_high',
            };
            if (std.image_input?.length) {
                if (modelId && modelId.toLowerCase().includes('flux')) {
                    t2iInput.image_prompt = std.image_input[0];
                } else {
                    t2iInput.image_input = std.image_input;
                }
            }
            return t2iInput;
        case 'image-to-prompt':
            return {
                prompt:               std.prompt               || 'Describe the image in detail.',
                max_tokens:           parseInt(std.max_tokens)  || 8192,
                system_prompt:        std.system_prompt         || '',
                max_image_resolution: parseFloat(std.max_image_resolution) || 0.5,
                ...(std.image ? { image: std.image } : {}),
            };
        case 'inpaint':
            return {
                image:                std.image,
                mask:                 std.mask,
                prompt:               std.prompt          || '',
                negative_prompt:      std.negative_prompt  || '',
                num_inference_steps:  parseInt(std.steps)  || 25,
            };
        case 'remove-bg':
            return { image_url: std.image };
        case 'upscale':
            return {
                image:         std.image,
                scale_factor:  parseInt(std.scale_factor)  || 2,
                creativity:    parseFloat(std.creativity)   || 0,
                output_format: std.output_format            || 'png',
            };
        default:
            throw new Error(`replicateAdapter: unknown task "${task}"`);
    }
}

const normalizeOutput = (out) => {
    if (Array.isArray(out)) return out.map(String);
    if (out === null || out === undefined) return '';
    return String(out);
};

async function run(task, std) {
    const { keys, override_model } = std;
    if (!keys?.replicate) throw new Error('Replicate API key is missing. Please enter your API key in Settings.');

    const replicate = new Replicate({ auth: keys.replicate });
    const modelId   = override_model || DEFAULT_MODELS[task];
    const versionId = VERSION_MAP[modelId];
    const input     = buildInput(task, std, modelId);

    const startMs   = Date.now();
    const createOpts = versionId ? { version: versionId, input } : { model: modelId, input };
    let prediction   = await replicate.predictions.create(createOpts);
    prediction       = await replicate.wait(prediction);
    const elapsedMs  = Date.now() - startMs;

    if (prediction.status === 'failed') throw new Error(prediction.error || 'Replicate prediction failed');

    const predictTime    = prediction.metrics?.predict_time || (elapsedMs / 1000);
    const pricePerSec    = PRICE_TABLE[modelId] || 0.00115;
    const estimatedCost  = predictTime * pricePerSec;

    return {
        output: normalizeOutput(prediction.output),
        metrics: {
            predict_time:       Math.round(predictTime * 100) / 100,
            elapsed_ms:         elapsedMs,
            estimated_cost_usd: Math.round(estimatedCost * 100000) / 100000,
            model:              modelId,
            platform:           'replicate',
        },
    };
}

module.exports = { run };
