// api/formsLink.js
//import fetch from "node-fetch";

/**
 * Busca e extrai os IDs (entries) de um formulário Google.
 * @param {string} formId - O ID do Google Form (ex: "1FAIpQLS...")
 * @returns {Promise<Array<{entry: string, label: string}>>} - Uma lista de campos.
 */
async function getEntries(formId) {
  if (!formId || formId === "www") {
    throw new Error("ID do formulário inválido");
  }

  const FORM_URL = `https://docs.google.com/forms/d/e/${formId}/viewform`;
  const html = await fetch(FORM_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  }).then(res => res.text());
  
  // A variável que contém o JSON com todos os campos
  const match = html.match(/FB_PUBLIC_LOAD_DATA_ = (.*?);<\/script>/);

  if (!match) {
    console.warn("Não foi possível extrair o JSON do formulário:", formId);
    return []; // Retorna array vazio se falhar
  }

  const json = JSON.parse(match[1]);
  const fields = json[1][1]; // Estrutura do Google Forms
  let entries = [];

  fields.forEach(field => {
    try {
      const id = field[4][0][0]; // entry ID
      const label = field[1].trim();    // Nome da pergunta (ex: "Nome", "Email")
      entries.push({ entry: `entry.${id}`, label });
    } catch (e) {
      // Ignora campos que não são perguntas (ex: seções, imagens)
    }
  });

  //console.log(`[api/formsLink] Entries encontrados para ${formId}:`, entries);
  return entries;
}


export default async function handler(req, res) {
  // 1. Apenas POST é permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Espera um body no formato { forms: "ID_DO_FORM" }
    const { forms } = req.body;
    
    if (!forms) {
      return res.status(400).json({ error: 'ID do formulário (forms) não fornecido no body' });
    }
    
    // 3. Chama a função e ESPERA (await) o resultado
    const entries = await getEntries(forms);

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Não foi possível encontrar campos no formulário. Verifique o ID.' });
    }

    // 4. Retorna os entries como JSON para quem chamou (o api/submit)
    return res.status(200).json({ entries });

  } catch (err) {
    console.error("Erro em /api/formsLink:", err.message);
    return res.status(500).json({ error: "Erro ao processar formulário", details: err.message });
  }
}