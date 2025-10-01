// api/has-responded.js
import crypto from 'crypto';
/* se usar node-redis */
import { redis } from '../lib/upstash.js';

export default async function handler(req, res) {
  const { email, eventoID } = req.method === 'GET' ? req.query : req.body;
  if (!email || !eventoID) return res.status(400).json({ error: 'email e eventoID obrigatórios' });

  const emailHash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  const key = `event:${eventoID}_responded:${emailHash}`;

  try {
    
    const v = await redis.get(key);
    return res.status(200).json({ responded: !!v });
  } catch (err) {
    console.error('has-responded error', err);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
}
