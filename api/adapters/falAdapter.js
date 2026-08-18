const { fal } = require('@fal-ai/client');

// ─── Map StandardInput → Fal.ai input for each task ────────────────────────
function buildInput(task, std) {
    const base = {
        prompt: std.prompt || '',
    };

    if (std.negative_prompt) base.negative_prompt = std.negative_prompt;
    if (std.steps)           base.num_inference_steps = parseInt(std.steps);
    if (std.seed && std.seed !== -1) base.seed = parseInt(std.seed);

    switch (task) {
        case 'text-to-image':
            return {
                ...base,
                ...(std.image_input?.length ? { image_url: std.image_input[0] } : {}),
                ...(std.aspect_ratio ? { aspect_ratio: std.aspect_ratio } : {}),
            };
        case 'image-to-prompt':
            return {
                prompt:    std.prompt || 'Describe this image in detail.',
                image_url: std.image,
            };
        case 'inpaint':
            return {
                ...base,
                image_url: std.image,
                mask_url:  std.mask,
            };
        case 'remove-bg':
            return { image_url: std.image };
        case 'upscale':
            return {
                image_url:    std.image,
                scale_factor: parseInt(std.scale_factor) || 2,
            };
        default:
            throw new Error(`falAdapter: unknown task "${task}"`);
    }
}

function normalizeOutput(result, task) {
    const data = result?.data;
    if (!data) throw new Error('Fal.ai returned no data.');

    // Text output (image-to-prompt)
    if (typeof data === 'string') return data;
    if (data.text) return data.text;

    // Image output
    const images = data.images;
    if (images?.length > 0) return images.map(i => i.url || i);
    const single = data.image?.url || data.image;
    if (single) return single;

    throw new Error('Fal.ai did not return a valid image or text.');
}

async function run(task, std) {
    const { keys, override_model } = std;
    if (!keys?.fal) throw new Error('Fal.ai API key is missing. Please enter your API key in Settings.');

    fal.config({ credentials: keys.fal });

    const modelId   = override_model;
    if (!modelId) throw new Error('Fal.ai requires a model ID in the Override settings.');

    const input     = buildInput(task, std);
    const startMs   = Date.now();
    const result    = await fal.subscribe(modelId, { input });
    const elapsedMs = Date.now() - startMs;

    return {
        output: normalizeOutput(result, task),
        metrics: {
            predict_time:       Math.round(elapsedMs / 10) / 100,
            elapsed_ms:         elapsedMs,
            estimated_cost_usd: null,
            model:              modelId,
            platform:           'fal',
        },
    };
}

module.exports = { run };
