// api/submit.js
import { redis } from '../lib/upstash.js'; // ou import { redis } from '../../lib/upstash' se usar upstash
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { primaryId, ID, fingerprint, uuid, nome, email, curso, periodo, evento, forms } = req.body || {};
    if (!ID || !primaryId) return res.status(400).json({ error: 'Campos obrigatórios faltando' });

    // Chave baseada em fingerprint e evento
    const key = `event:${ID}_pID:${primaryId}`;
    const evento_ID = evento+"_"+ID;

    // Checa se já existe
    const already = await redis.get(key);
    if (already) return res.status(409).json({ error: 'Já respondeu' });

    //const userData = await redis.get(uuid);
    console.log('Dados recebidos em /api/submit:', forms );

    // --- Envia pro Google Forms (seu código, adaptado pra manter eventID se precisar) ---

    // --- 2. CHAMAR A API /api/formsLink PARA OBTER OS ENTRIES ---
    let entries;
    try {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000'; // Ajuste a porta se for diferente

      const apiUrl = new URL('/api/formsLink', baseUrl);

      const resp = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // CORREÇÃO: Enviar um objeto JSON { forms: "..." }
        body: JSON.stringify({ forms: forms }) 
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Erro ao chamar /api/formsLink:', resp.status, errorText);
        return res.status(502).json({ error: 'Falha ao buscar entries do formulário', details: errorText });
      }
      
      const data = await resp.json();
      entries = data.entries; // Agora temos [{ entry: "entry.123", label: "Nome" }, ...]
      console.log('[api/submit] Entries recebidos de /api/formsLink:', entries);

    } catch (err) {
      console.error('Erro ao chamar /api/formsLink internamente:', err);
      return res.status(500).json({ error: 'Erro interno ao chamar API de forms', details: err.message });
    }

    

    // --- 3. MAPEAMENTO DINÂMICO DOS DADOS PARA OS ENTRIES ---
    // Mapeia os dados do usuário para os 'labels' (nomes das perguntas)
    // que esperamos do Google Forms.

    const params = new URLSearchParams();
    
   const normalize = s => s
    .toLowerCase()
    .replace(/[:?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

    const normalizedUserMap = {
      'nome completo': nome,
      'e-mail institucional ou pessoal': email,
      'curso': curso,
      'qual período': periodo,
      'evento': evento
    };
    
    entries.forEach(item => {
      const key = normalize(item.label);
      if (normalizedUserMap[key]) {
        params.append(item.entry, normalizedUserMap[key]);
        console.log(`[api/submit] Mapeando: ${item.label} (${item.entry}) = ${normalizedUserMap[key]}`);
      }
    });


    

    // ✅✅✅ ADICIONE ESTE NOVO LOG AQUI ✅✅✅
console.log('----------------------------------------------------');
//console.log('[api/submit] DEBUG: userDataMap:', userDataMap);
// ✅✅✅ FIM DO NOVO LOG ✅✅✅

// Seu log de debug existente
console.log('----------------------------------------------------');
console.log('[api/submit] DEBUG: Dados que serão enviados ao Google:');

    // ✅✅✅ ADICIONE ESTE DEBUG AQUI ✅✅✅
console.log('----------------------------------------------------');
console.log('[api/submit] DEBUG: Dados que serão enviados ao Google:');
console.log('Form ID (forms):', forms);
console.log('Entries (params):', params.toString());
console.log('----------------------------------------------------');
// ✅✅✅ FIM DO DEBUG ✅✅✅

    const url = `https://docs.google.com/forms/d/e/${forms}/formResponse`;
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
