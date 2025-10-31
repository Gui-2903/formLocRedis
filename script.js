// =========================================================
//  SCRIPT PRINCIPAL - Sistema de Presença / Verificação Local
// =========================================================

// === Seleção de elementos DOM ===
const form = document.getElementById('myForm');
const statusEl = document.getElementById('status');
const sub = document.getElementById('sub');
const reiniciarBtn = document.getElementById('reiniciar');

// === Variáveis globais ===
let evento;
let eventoID;
let targetLat;
let targetLng;
let allowedRadius;
let localizacao;
let lat = null;
let lng = null;
let fingerprint = null;
let uuid = null;

// === Endpoints ===
const endpoints = {
  GET: '/api/configsRedis',
  PUT: '/api/configsRedis'
};

// =========================================================
//  FUNÇÕES UTILITÁRIAS
// =========================================================

// Converte graus em radianos
function toRad(deg) {
  return deg * Math.PI / 180;
}

// Calcula a distância entre dois pontos geográficos (Haversine)
function haversine(aLat, aLon, bLat, bLon) {
  const R = 6371000; // Raio da Terra em metros
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// =========================================================
//  GEOLOCALIZAÇÃO E CONTROLE DE ACESSO
// =========================================================

// Verifica localização atual do usuário e compara com o ponto alvo
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

      // Simulação para testes (configurada via Redis)
      if (localizacao === "false" || localizacao === false) {
        lat = -20.738130518152236;
        lng = -42.023347210022386;
      }

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
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

// Reseta estado e recarrega a página
function resetarEstado() {
  lat = null;
  lng = null;
  location.reload();
}

// =========================================================
//  CONTROLE DE EVENTOS / PALESTRAS
// =========================================================

// Preenche o <select> com as palestras recebidas do servidor
function adicionarEventos(palestras) {
  const select = document.getElementById('evento');
  Object.entries(palestras).forEach(([id, nome]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = nome;
    select.appendChild(option);
  });
}

// Armazena o evento selecionado
function saveEvent() {
  const select = document.getElementById('evento');
  eventoID = select.value.trim();
  evento = select.options[select.selectedIndex].text;
}

// =========================================================
//  COMUNICAÇÃO COM SERVIDOR E INICIALIZAÇÃO
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Busca configuração no Redis
    const redisConfig = await fetch(endpoints.GET);
    if (!redisConfig.ok) throw new Error('Erro ao buscar configuração');

    const redisConfigData = await redisConfig.json();

    // Atribui valores de configuração
    targetLat = redisConfigData.TARGET_LAT || 0;
    targetLng = redisConfigData.TARGET_LNG || 0;
    allowedRadius = redisConfigData.ALLOWED_RADIUS_METERS || 0;
    evento = redisConfigData.EVENTO || "Evento";
    eventoID = redisConfigData.ID || 0;
    palestras = redisConfigData.PALESTRAS || "{}";
    localizacao = redisConfigData.LOCALIZACAO || "{}";

    // Preenche o select de eventos
    adicionarEventos(palestras);

    // Inicia verificação de localização
    verificarLocalizacao();

  } catch (err) {
    console.error("Erro ao buscar nome do evento:", err);
    statusEl.textContent = 'Erro ao carregar configuração do evento.';
  }

  // Inicializa FingerprintJS (identificação do usuário)
  try {
    const fpPromise = window.FingerprintJS.load();
    fpPromise.then(fp => fp.get()).then(result => {
      fingerprint = result.visitorId;
    });
  } catch (err) {
    console.error('Erro ao inicializar FingerprintJS:', err);
    fingerprint = null; // fallback: usa apenas UUID
  }

  // Recupera ou cria UUID persistente
  uuid = localStorage.getItem('user_uuid');
  if (!uuid) {
    uuid = crypto.randomUUID ? crypto.randomUUID() : uuidv4();
    localStorage.setItem('user_uuid', uuid);
  }
});

// =========================================================
//  ENVIO DO FORMULÁRIO
// =========================================================

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const curso = document.getElementById('curso').value.trim();
  const periodo = document.getElementById('periodo').value.trim();

  if (!email || !nome) {
    alert('Nome e email obrigatórios');
    return;
  }

  // Salva o evento selecionado
  saveEvent();
  statusEl.textContent = 'Verificando se já respondeu...';

  try {
    // Verifica se o usuário já respondeu anteriormente
    const check = await fetch(`/api/has-responded?eventoID=${encodeURIComponent(eventoID)}&primaryId=${encodeURIComponent(fingerprint || uuid)}`);
    const cj = await check.json();

    if (check.ok && cj.responded) {
      form.classList.add('hidden');
      statusEl.textContent = 'Você já respondeu!';
      reiniciarBtn.classList.remove('hidden');
      return;
    }
  } catch (err) {
    console.warn('Não foi possível checar status (continuaremos):', err);
  }

  // Monta dados para envio
  const data = {
    primaryId: fingerprint || uuid,
    uuid: uuid + "_" + eventoID,
    fingerprint: fingerprint,
    ID: eventoID,
    evento: evento,
    nome,
    email,
    curso,
    periodo
  };

  // Envia formulário para o servidor
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
    statusEl.textContent = 'Erro de comunicação com o servidor.';
  }
});

// =========================================================
//  REINÍCIO MANUAL (BOTÃO)
// =========================================================

reiniciarBtn.addEventListener('click', () => {
  resetarEstado();
  verificarLocalizacao();
});
