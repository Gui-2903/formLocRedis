import { redis } from '../lib/upstash.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { forms, entries } = req.body;

    if (!forms || !Array.isArray(entries)) {
      return res.status(400).json({
        error: 'Envie { forms: string, entries: [{ entry, label }] }'
      });
    }

    const key = `forms:${forms}`;

    await redis.set(key, JSON.stringify(entries));

    return res.status(200).json({
      ok: true,
      saved: entries.length,
      key
    });

  } catch (err) {
    console.error('formsSetup error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
