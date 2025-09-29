// api/submit.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nome, email, curso, periodo, lat, lng } = req.body || {};

    if (!nome || !email) return res.status(400).json({ error: 'Campos obrigatórios faltando' });

    // PARAMS DO GOOGLE FORM — pegue estes entry.* e FORM_ID e coloque nas env vars
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

    // DEBUG: log (apenas local/dev)
    console.log('Enviando para Google Forms:', url, params.toString());

    const r = await fetch(url, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('Google status:', r.status);

    // Google normalmente responde 200 ou 302 redirect; consideramos sucesso se não for 4xx/5xx
    if (r.status >= 200 && r.status < 400) {
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
}
