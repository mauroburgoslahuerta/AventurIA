import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Handling
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { prompt, width = 1024, height = 600, model, seed } = req.query;

    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.POLLINATIONS_API_KEY;

    // Construct Pollinations URL
    const encodedPrompt = encodeURIComponent(String(prompt));
    let targetUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;

    if (model) targetUrl += `&model=${model}`;
    if (seed) targetUrl += `&seed=${seed}`;
    // INJECT SECRET KEY HERE (Server-side only)
    if (apiKey) targetUrl += `&key=${apiKey}`;

    try {
        const response = await fetch(targetUrl);

        if (!response.ok) {
            throw new Error(`Pollinations API Error: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.send(buffer);

    } catch (error) {
        console.error("Pollinations Proxy Error:", error);
        res.status(500).json({ error: 'Failed to fetch image from Pollinations' });
    }
}
