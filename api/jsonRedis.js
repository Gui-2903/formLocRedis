import { redis } from '../lib/upstash.js';

export default async function handler(req, res) {

try
{

    const json = await redis.get("configs");
    console.log('Chave de configuração obtida do Redis:', json);
    if (json) {
      const data = JSON.parse(json);
      console.log('Configuração obtida do Redis2:', data);
      return res.status(200).json(data);
    } else {
      return res.status(404).json({ error: 'Chave de configuração nao encontrada.' });
    }


}catch(err){
  console.error('Erro ao acessar Redis:', err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}


}