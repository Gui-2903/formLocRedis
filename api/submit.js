// api/submit.js
import crypto from 'crypto';
import { redis } from '../lib/upstash.js'; // ou import { redis } from '../../lib/upstash' se usar upstash
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { primaryId, ID, fingerprint, uuid, nome, email, curso, periodo, evento } = req.body || {};
    if (!ID || !primaryId) return res.status(400).json({ error: 'Campos obrigatórios faltando' });

    // Chave baseada em fingerprint e evento
    const key = `event:${ID}_pID:${primaryId}`;
    const evento_ID = evento+"_"+ID;

    // Checa se já existe
    const already = await redis.get(key);
    if (already) return res.status(409).json({ error: 'Já respondeu' });

    const userData = await redis.get(uuid);


    // --- Envia pro Google Forms (seu código, adaptado pra manter eventID se precisar) ---
    const FORM_ID = process.env.FORM_ID;
    const ENTRY_NOME = process.env.ENTRY_NOME;
    const ENTRY_EMAIL = process.env.ENTRY_EMAIL;
    const ENTRY_CURSO = process.env.ENTRY_CURSO;
    const ENTRY_PERIODO = process.env.ENTRY_PERIODO;

    if (!FORM_ID || !ENTRY_NOME || !ENTRY_EMAIL) {
      return res.status(500).json({ error: 'Configuração do formulário faltando no servidor' });
    }

    const params = new URLSearchParams();
    params.append(ENTRY_NOME, nome);
    params.append(ENTRY_EMAIL, email);
    if (ENTRY_CURSO) params.append(ENTRY_CURSO, curso || '');
    if (ENTRY_PERIODO) params.append(ENTRY_PERIODO, periodo || '');

    const url = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;
    const r = await fetch(url, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (r.status >= 200 && r.status < 400) {
      // Salva JSON no Redis ✅
      const data = {
        evento_ID,
        nome, 
        email,
        curso,
        periodo,
        fingerprint,
        uuid,
        timestamp: Date.now(),
      };
      await redis.set(key, JSON.stringify(data), {
        ex: 60 * 60 * 24 * 365, // expira em 1 ano
      });

      return res.status(200).json({ ok: true });
    } else {
      const text = await r.text().catch(()=>null);
      console.error('Google Forms response error', r.status, text && text.slice(0,200));
      return res.status(502).json({ error: 'Google Forms error', status: r.status });
    }

  } catch (err) {
    console.error('Erro em /api/submit:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  async function checkEnviou() {

      const already = await redis.get(key);
      if (already) return res.status(409).json({ error: 'Já respondeu' });
   
  }
}
