
// --- Seleção de elementos DOM ---
const form = document.getElementById('myForm');
const statusEl = document.getElementById('status');
const sub = document.getElementById('sub');
const reiniciarBtn = document.getElementById('reiniciar');

// --- Variáveis globais ---
let evento;
let eventoID;
let targetLat;
let targetLng;
let allowedRadius;
let lat = null;
let lng = null;
let fingerprint = null;
let uuid = null;

let endpoints = {
  GET: '/api/configsRedis',
  PUT: '/api/configsRedis'
};

// --- Função para converter graus em radianos ---
function toRad(d) {
  return d * Math.PI / 180;
}

// --- Função para calcular distância entre dois pontos geográficos (Haversine) ---
function haversine(aLat, aLon, bLat, bLon) {
  const R = 6371000; // Raio da Terra em metros
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Função para verificar localização do usuário ---
function verificarLocalizacao() {
  if (!navigator.geolocation) {
    statusEl.textContent = 'Seu navegador não suporta geolocalização.';
    return;
  }

  sub.textContent = evento || '';
  statusEl.textContent = 'Verificando localização...';

  navigator.geolocation.getCurrentPosition(
    pos => {
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;

      // Para testes
      lat = -20.738130518152236;
      lng = -42.023347210022386;

      const dist = haversine(lat, lng, targetLat, targetLng);

      if (dist <= allowedRadius) {
        reiniciarBtn.classList.add('hidden');
        statusEl.textContent = 'Localização confirmada ✅';
        form.classList.remove('hidden');
      } else {
        statusEl.textContent = 'Você não está no local permitido ❌';
        form.classList.add('hidden');
        reiniciarBtn.classList.remove('hidden');
      }
    },
    err => {
      console.error(err);
      statusEl.textContent = 'Por favor, ative a localização no seu dispositivo.';
      form.classList.add('hidden');
      reiniciarBtn.classList.remove('hidden');
    },
    { 
      enableHighAccuracy: true, 
      timeout: 15000, 
      maximumAge: 0 
    }
  );
}

// --- Função para resetar estado da página antes de nova verificação ---
function resetarEstado() {
  lat = null;
  lng = null;
  dist = null;
  location.reload();
  
}

function adicionarEventos(palestras){

  const select = document.getElementById('evento');

  Object.entries(palestras).forEach(([id, nome]) => {
  const option = document.createElement("option");
  option.value = id;     // ID do evento (ex: 333)
  option.textContent = nome; // Nome exibido (ex: Palestra A)
  select.appendChild(option);
});

}

function saveEvent(){
  eventoID = document.getElementById('evento').value.trim();
  console.log("Evento selecionado:", eventoID);
  const nomePalestra = document.getElementById('evento').options[document.getElementById('evento').selectedIndex].text;
  console.log("nome palestra:", nomePalestra); // "palestra a" ou "palestra b"
  evento = nomePalestra;
}

// --- Evento DOMContentLoaded: busca configuração e inicia verificação ---
document.addEventListener("DOMContentLoaded", async () => {
  try {

    const redisConfig = await fetch(endpoints.GET);
    if (!redisConfig.ok) throw new Error('Erro ao buscar config');
    const redisConfigData = await redisConfig.json();
    console.log("redisConfigData:", redisConfigData);


    // Atribui valores da configuração
    targetLat = redisConfigData.TARGET_LAT || 0;
    targetLng = redisConfigData.TARGET_LNG || 0;
    allowedRadius = redisConfigData.ALLOWED_RADIUS_METERS || 0;
    evento = redisConfigData.EVENTO || "Evento";
    eventoID = redisConfigData.ID || 0;
    palestras = redisConfigData.PALESTRAS || "{}";

    //adiciona eventos;
    adicionarEventos(palestras);

    // Inicia verificação de localização
    verificarLocalizacao();

  } catch (err) {
    console.error("Erro ao buscar nome do evento:", err);
    statusEl.textContent = 'Erro ao carregar configuração do evento.';
  }

  // Inicializa FingerprintJS quando o DOM estiver carregado
  try {
  const fpPromise = window.FingerprintJS.load();
  fpPromise.then(fp => fp.get()).then(result => { 
    fingerprint = result.visitorId;
  });
  } catch (err) {
    console.error('Erro ao inicializar FingerprintJS:', err);
    fingerprint = null;  // Use só UUID como fallback
  }

    
  // 1. Tente obter UUID do localStorage (fallback persistente)
  uuid = localStorage.getItem('user_uuid');
  console.log("UUID do localStorage:", uuid);

  if (!uuid) {
    uuid = crypto.randomUUID ? crypto.randomUUID() : uuidv4();  // UUID v4
    console.log("Novo UUID gerado:", uuid);
    localStorage.setItem('user_uuid', uuid);
  }else{
    //nao sei oq tava fazendo aq
    

  }

});

// --- Evento submit do formulário ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!email || !nome) {
    alert('Nome e email obrigatórios');
    return;
  }

  //Salvando o evento escolhido
  saveEvent();
  
  statusEl.textContent = 'Verificando se já respondeu...';

  try {
    const check = await fetch(`/api/has-responded?eventoID=${encodeURIComponent(eventoID)}&primaryId=${encodeURIComponent(fingerprint || uuid)}`);
    const cj = await check.json();
    if (check.ok && cj.responded) {
      form.classList.add('hidden');
      statusEl.textContent = 'Você já respondeu!';
      reiniciarBtn.classList.remove('hidden');
      return;
    }else if (cj.responded === false){

      console.log("Usuário ainda não respondeu, pode continuar. agora verificar com o UUID");
      //verificar com o uuid

    }
  } catch (err) {
    console.warn('Não foi possível checar status (continuaremos):', err);
    // opcional: aqui você pode impedir envio se checagem for crítica
  }


  const data = {
    primaryId: fingerprint || uuid,
    uuid: uuid + "_" + eventoID,
    fingerprint: fingerprint,
    ID: eventoID,
    evento: evento,
    nome: document.getElementById('nome').value.trim(),
    email: document.getElementById('email').value.trim(),
    curso: document.getElementById('curso').value.trim(),
    periodo: document.getElementById('periodo').value.trim()
    
  };

  console.log(data);
  
  try {
    const resp = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const j = await resp.json();

    if (resp.ok) {
      statusEl.textContent = 'Formulário enviado com sucesso! ✅';
      form.reset();
      form.classList.add('hidden');
      reiniciarBtn.classList.remove('hidden');
    } else if (resp.status === 409) {
      statusEl.textContent = 'Você já enviou sua resposta (servidor) ✅';
      form.classList.add('hidden');
      reiniciarBtn.classList.remove('hidden');
    } else {
      statusEl.textContent = 'Erro ao enviar: ' + (j.error || resp.status);
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Erro de comunicação com servidor.';
  }

});

// --- Evento click do botão reiniciar ---
reiniciarBtn.addEventListener('click', () => {
  resetarEstado();
  verificarLocalizacao();
});
