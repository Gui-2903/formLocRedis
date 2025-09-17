
const form = document.getElementById('myForm');
const statusEl = document.getElementById('status');
const sub = document.getElementById('sub');
evento = "Formulário de Inscrição - Evento Presencial";


// Local alvo (igual ao .env no back)
const targetLat = -20.738130518152236;
const targetLng = -42.023347210022386;
const allowedRadius = 150; // metros

// Função distância (Haversine)
function toRad(d){ return d * Math.PI/180; }
function haversine(aLat,aLon,bLat,bLon){
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Verificação inicial
function verificarLocalizacao(){
  if(!navigator.geolocation){
    statusEl.textContent = 'Seu navegador não suporta geolocalização.';
    return;
  }

  statusEl.textContent = 'Verificando localização...';

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    const dist = haversine(lat, lng, targetLat, targetLng);
    
    if(dist <= allowedRadius){
      statusEl.textContent = 'Localização confirmada ✅';
      form.classList.remove('hidden');
    } else {
      statusEl.textContent = 'Você não está no local permitido ❌';
      
    }
  }, err => {
    console.error(err);
    statusEl.textContent = 'Por favor, ative a localização no seu dispositivo.';
  }, { enableHighAccuracy: true, timeout: 10000 });
}

document.addEventListener("DOMContentLoaded", async () => {
  const sub = document.getElementById("sub");

  try {
    const res = await fetch("/api/event");
    const data = await res.json();

    // altera o conteúdo dinamicamente
    sub.textContent = data.name;
    verificarLocalizacao();
  } catch (err) {
    console.error("Erro ao buscar nome do evento:", err);
  }
});


// Envio do form
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Verifica se já respondeu
  if (localStorage.getItem("formRespondido") === "true") {
    form.classList.add('hidden');
    statusEl.textContent = "Você já enviou sua resposta ❌";
    alert("Você já enviou sua resposta.");
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
    if(resp.ok){
      statusEl.textContent = 'Formulário enviado com sucesso!';
      localStorage.setItem("formRespondido", "true"); // marca como já respondido
      form.reset();
      

    } else {
      statusEl.textContent = 'Erro ao enviar: ' + (j.error || resp.status);
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Erro de comunicação com servidor.';
  }
});

