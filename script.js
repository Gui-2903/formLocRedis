// --- Seleção de elementos DOM ---
const form = document.getElementById('myForm');
const statusEl = document.getElementById('status');
const sub = document.getElementById('sub');
const reiniciarBtn = document.getElementById('reiniciar');

// --- Variáveis globais ---
let evento;
let eventID;
let targetLat;
let targetLng;
let allowedRadius;
let lat = null;
let lng = null;

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
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// --- Função para resetar estado da página antes de nova verificação ---
function resetarEstado() {
  lat = null;
  lng = null;
  location.reload();
  
}

// --- Evento DOMContentLoaded: busca configuração e inicia verificação ---
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Erro ao buscar config');
    const config = await res.json();

    // Atribui valores da configuração
    targetLat = config.targetLat;
    targetLng = config.targetLng;
    allowedRadius = config.allowedRadius;
    evento = config.evento;
    eventID = config.eventID;
    //console.log("Configuração do evento:", config);

    // Inicia verificação de localização
    verificarLocalizacao();

  } catch (err) {
    console.error("Erro ao buscar nome do evento:", err);
    statusEl.textContent = 'Erro ao carregar configuração do evento.';
  }
});

// --- Evento submit do formulário ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Verifica se já respondeu
  if (localStorage.getItem(`formRespondido${eventID}`) === "true") {
    form.classList.add('hidden');
    statusEl.textContent = `Você já enviou sua resposta ❌${eventID}`;
    alert(`Você já enviou sua resposta para o evento ${eventID}!`);
    reiniciarBtn.classList.remove('hidden');
    return;
  }

  statusEl.textContent = 'Enviando...';

  const data = {
    nome: document.getElementById('nome').value.trim(),
    email: document.getElementById('email').value.trim(),
    curso: document.getElementById('curso').value.trim(),
    periodo: document.getElementById('periodo').value.trim()
  };

  try {
    const resp = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const j = await resp.json();

    if (resp.ok) {
      statusEl.textContent = 'Formulário enviado com sucesso!✅';
      localStorage.setItem(`formRespondido${eventID}`, "true");
      form.reset();
      reiniciarBtn.classList.remove('hidden');
      form.classList.add('hidden');
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
