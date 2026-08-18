const { runAdapter } = require('./adapters');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { keys, override_platform, override_model, ...rest } = req.body;
        if (!keys) return res.status(400).json({ error: 'Keys object is missing. Please enter your API key in Settings.' });

        const platform = override_platform || 'replicate';
        const std      = { keys, override_model, ...rest };
        const result   = await runAdapter(platform, 'text-to-image', std);

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error in /api/text-to-image:', error);
        return res.status(500).json({ error: error.message });
    }
};
