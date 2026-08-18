const OpenAI = require('openai');

async function run(task, std) {
    const { keys, override_model } = std;
    if (!keys?.openai) throw new Error('OpenAI API key is missing. Please enter your API key in Settings.');
    if (!override_model) throw new Error('OpenAI requires a model ID in the Override settings.');

    const openai  = new OpenAI({ apiKey: keys.openai });
    const startMs = Date.now();
    let output;

    switch (task) {
        case 'text-to-image': {
            // gpt-image-1, dall-e-3, dall-e-2
            const response = await openai.images.generate({
                model:  override_model,
                prompt: std.prompt,
                n:      1,
                size:   '1024x1024',
            });
            output = response.data?.[0]?.url || response.data?.[0]?.b64_json
                ? `data:image/png;base64,${response.data[0].b64_json}`
                : '';
            break;
        }
        case 'image-to-prompt': {
            if (!std.image) throw new Error('Image is required for image-to-prompt.');
            const response = await openai.chat.completions.create({
                model: override_model,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text',      text: std.prompt || 'Describe this image in detail.' },
                        { type: 'image_url', image_url: { url: std.image } },
                    ],
                }],
                max_tokens: parseInt(std.max_tokens) || 1024,
            });
            output = response.choices?.[0]?.message?.content || '';
            break;
        }
        case 'inpaint': {
            // gpt-image-1 supports image editing
            const imageBase64 = std.image.split(',')[1];
            const maskBase64  = std.mask?.split(',')[1];
            const response    = await openai.images.edit({
                model:  override_model,
                image:  Buffer.from(imageBase64, 'base64'),
                mask:   maskBase64 ? Buffer.from(maskBase64, 'base64') : undefined,
                prompt: std.prompt,
                n:      1,
                size:   '1024x1024',
            });
            output = response.data?.[0]?.url || `data:image/png;base64,${response.data?.[0]?.b64_json}`;
            break;
        }
        case 'remove-bg':
        case 'upscale': {
            // Use vision model to analyze, then instruct
            const response = await openai.chat.completions.create({
                model: override_model,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text',      text: task === 'remove-bg' ? 'Describe the main subject of this image.' : 'Describe this image in detail.' },
                        { type: 'image_url', image_url: { url: std.image } },
                    ],
                }],
                max_tokens: 512,
            });
            output = response.choices?.[0]?.message?.content || '';
            break;
        }
        default:
            throw new Error(`openaiAdapter: unknown task "${task}"`);
    }

    const elapsedMs = Date.now() - startMs;
    return {
        output,
        metrics: {
            predict_time:       Math.round(elapsedMs / 10) / 100,
            elapsed_ms:         elapsedMs,
            estimated_cost_usd: null,
            model:              override_model,
            platform:           'openai',
        },
    };
}

module.exports = { run };
