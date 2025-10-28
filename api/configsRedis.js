import { redis } from '../lib/upstash.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // 📥 Busca o JSON salvo no Redis
      const data = await redis.json.get('configs', '$');

      if (data && data.length > 0) {
        res.status(200).json(data[0]); // Retorna o objeto JSON completo
      } else {
        res.status(404).json({ error: 'Chave de configuração não encontrada.' });
      }

    } else if (req.method === 'POST' || req.method === 'PUT') {
      // 📤 Atualiza ou cria o JSON no Redis
      const newConfig = req.body;

      if (!newConfig || typeof newConfig !== 'object') {
        return res.status(400).json({ error: 'O corpo da requisição deve ser um objeto JSON válido.' });
      }

      // Salva o JSON inteiro na chave "configs"
      await redis.json.set('configs', '$', newConfig);
      const data = await redis.json.get('configs', '$');

      res.status(200).json(data[0]);
    }

    else {
      // ❌ Método não permitido
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).end(`Método ${req.method} não permitido`);
    }

  } catch (error) {
    console.error('Erro ao acessar o Redis:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
