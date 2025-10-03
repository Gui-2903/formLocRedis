// api/has-responded.js
import crypto from 'crypto';
/* se usar node-redis */
import { redis } from '../lib/upstash.js';

export default async function handler(req, res) {
  const { eventoID, fingerprint } = req.method === 'GET' ? req.query : req.body;
  if (!eventoID || !fingerprint) return res.status(400).json({ error: 'eventoID e fingerprint obrigatórios' });

  const key = `event:${eventoID}_fp:${fingerprint}`;

  try {
    const value = await redis.get(key);
    if (value) {
      const data = JSON.parse(value);
      return res.status(200).json({ responded: true, data });
    }
    return res.status(200).json({ responded: false });
  } catch (err) {
    console.error('has-responded error', err);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
}
