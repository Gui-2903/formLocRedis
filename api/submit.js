// api/submit.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nome, email, curso, periodo, lat, lng } = req.body || {};

    if (!nome || !email) return res.status(400).json({ error: 'Campos obrigatórios faltando' });

    // VALIDAÇÃO DE LOCAL (opcional, depende se você quer exigir coords)
    const targetLat = Number(process.env.TARGET_LAT);
    const targetLng = Number(process.env.TARGET_LNG);
    const allowedRadius = Number(process.env.ALLOWED_RADIUS_METERS || '150');

    function toRad(d){ return d * Math.PI / 180; }
    function haversine(aLat,aLon,bLat,bLon){
      const R = 6371000;
      const dLat = toRad(bLat - aLat);
      const dLon = toRad(bLon - aLon);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(targetLat) ) {
      const dist = haversine(lat, lng, targetLat, targetLng);
      if (dist > allowedRadius) {
        return res.status(403).json({ error: 'Fora do local permitido', distance: Math.round(dist) });
      }
    }

    // PARAMS DO GOOGLE FORM — pegue estes entry.* e FORM_ID e coloque nas env vars
    const FORM_ID = process.env.FORM_ID;
    const ENTRY_NOME = process.env.ENTRY_NOME;
    const ENTRY_EMAIL = process.env.ENTRY_EMAIL;
    const ENTRY_CURSO = process.env.ENTRY_CURSO;
    const ENTRY_PERIODO = process.env.ENTRY_PERIODO;
    const ENTRY_LAT = process.env.ENTRY_LAT; // opcional
    const ENTRY_LNG = process.env.ENTRY_LNG; // opcional

    if (!FORM_ID || !ENTRY_NOME || !ENTRY_EMAIL) {
      return res.status(500).json({ error: 'Configuração do formulário faltando no servidor' });
    }

    const params = new URLSearchParams();
    params.append(ENTRY_NOME, nome);
    params.append(ENTRY_EMAIL, email);
    if (ENTRY_CURSO) params.append(ENTRY_CURSO, curso || '');
    if (ENTRY_PERIODO) params.append(ENTRY_PERIODO, periodo || '');
    if (ENTRY_LAT && typeof lat === 'number') params.append(ENTRY_LAT, String(lat));
    if (ENTRY_LNG && typeof lng === 'number') params.append(ENTRY_LNG, String(lng));

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
