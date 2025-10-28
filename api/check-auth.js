// api/check-auth.js
const crypto = require('crypto');

function base64urlDecode(str) {
  // transforma base64url para base64 e decodifica
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

function verifyHS256(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  if (signature !== expected) return null;

  try {
    const payloadJson = base64urlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export default function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('session='));
  const token = match ? match.split('=')[1] : undefined;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return res.status(500).json({ error: 'Configuração do servidor.' });

  const payload = verifyHS256(token, secret);
  if (!payload) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // OK - retorna info mínima do usuário
  return res.status(200).json({ ok: true, user: payload.sub });
}
