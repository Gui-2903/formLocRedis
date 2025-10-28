// api/login.js
const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `${data}.${signature}`;
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { usuario, senha } = req.body || {};
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  if (!usuario || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios.' });
  }

  if (usuario !== adminUser || senha !== adminPass) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // usuário autenticado -> cria JWT
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('SESSION_SECRET não definido');
    return res.status(500).json({ error: 'Configuração do servidor.' });
  }

  const expiresIn = parseInt(process.env.JWT_EXPIRATION_SECONDS || '3600', 10);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: usuario,
    iat: now,
    exp: now + expiresIn
  };

  const token = signHS256(payload, secret);

  // Define cookie: HttpOnly, Secure, SameSite=Lax, Path=/
  // Em desenvolvimento local sem HTTPS, Secure pode bloquear o cookie — testar no Vercel/HTTPS.
  const cookieParts = [
    `session=${token}`,
    `HttpOnly`,
    `Path=/`,
    `Max-Age=${expiresIn}`,
    `SameSite=Lax`
  ];
  // Somente adicione Secure quando rodar em produção via HTTPS
  if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');

  res.setHeader('Set-Cookie', cookieParts.join('; '));
  res.status(200).json({ success: true });
}
