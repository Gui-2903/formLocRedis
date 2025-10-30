
//fallback TEM QUE BUSCAR NO REDIS 
let fallback = null;

//trocar end points
const endpoints = {
  GET: '/api/configsRedis',
  PUT: '/api/configsRedis'
};

// elementos
const allowedRadiusEl = document.getElementById('allowedRadius');
const eventoEl = document.getElementById('evento');
const targetLatEl = document.getElementById('targetLat');
const targetLngEl = document.getElementById('targetLng');
const palestrasContainer = document.getElementById('palestrasContainer');
const jsonPreview = document.getElementById('jsonPreview');
const statusMsg = document.getElementById('statusMsg');
const btnAddPalestra = document.getElementById('btnAddPalestra');
const newPalestraId = document.getElementById('newPalestraId');
const newPalestraName = document.getElementById('newPalestraName');
const btnReload = document.getElementById('btnReload');
const btnExport = document.getElementById('btnExport');
const fileImport = document.getElementById('fileImport');
const btnReset = document.getElementById('btnReset');
const btnAtualizarTudo = document.getElementById('btnAtualizarTudo');
const toggleMonitorEl = document.getElementById('toggleMonitor');

let current = null; // objeto corrente

// config/config.js
document.addEventListener('DOMContentLoaded', async () => {
  const meuCard = document.getElementById('card');

  // 1. Bloqueia o card imediatamente
  if (meuCard) {
    // --- CORREÇÃO PRINCIPAL ---
    // Você precisa dizer ao CSS para animar AMBAS as propriedades.
    // Separe-as por vírgula:
    meuCard.style.transition = 'filter 2.3s ease, opacity 1s ease'; 
    
    // Agora defina o estado inicial (invisível E borrado)
    meuCard.style.opacity = '0'; // <-- Movido para dentro do 'if'
    meuCard.style.filter = 'blur(5px)';
    meuCard.style.pointerEvents = 'none';
  } else {
    // É bom avisar se o card não for encontrado
    console.warn("Elemento #card não encontrado. A tela não será borrada.");
  }

  // 2. Verifica auth local (Sua lógica está perfeita)
  const auth = sessionStorage.getItem('auth');
  const expiry = sessionStorage.getItem('auth_expiry');

  if (!auth || !expiry || Date.now() > parseInt(expiry)) {
    sessionStorage.removeItem('auth');
    sessionStorage.removeItem('auth_expiry');
    window.location.href = '/adm/index.html';
    return;
  }

  // 3. Verificação real no backend
  try {
    const res = await fetch('/api/check-auth', { credentials: 'include' });
    
    if (!res.ok) {
      sessionStorage.removeItem('auth');
      sessionStorage.removeItem('auth_expiry');
      window.location.href = '/adm/index.html';
      return;
    }

    // 4. Se OK, libera o conteúdo
    if (meuCard) {
      // Como a transição foi definida para 'opacity' e 'filter',
      // o navegador vai animar as duas mudanças suavemente.
      meuCard.style.opacity = '1'; // <-- Movido para dentro do 'if'
      meuCard.style.filter = 'none';
      meuCard.style.pointerEvents = 'auto';
    }

  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
    window.location.href = '/adm/index.html';
  }


  loadFromServer();
 
});

// carregar do servidor
async function loadFromServer() {
  setStatus('Carregando...', 'muted');
  try {
    const redisConfig = await fetch(endpoints.GET);
    if (!redisConfig.ok) throw new Error('Erro ao buscar config');
    const redisConfigData = await redisConfig.json();
    console.log("redisConfigData:", redisConfigData);

    fallback = redisConfigData || {};
    console.log("Fallback de configuração:", fallback);
    setStatus('Carregado do servidor.', 'success');
    current = null;
  } catch (err) {
    console.warn('Erro ao carregar do servidor, usando fallback:', err);
    current = fallback;
    setStatus('Não foi possível carregar do servidor → usando fallback local.', 'danger');
  }
  renderUIFromCurrent();
  comparePreviewWithRedis();
}

function setStatus(text, type) {
  statusMsg.textContent = text;
  statusMsg.className = '';
  if (type === 'success') statusMsg.classList.add('success');
  if (type === 'danger') statusMsg.classList.add('danger');
  if (type === 'muted') statusMsg.classList.add('muted');
}

// renderiza campos
function renderUIFromCurrent() {
  if (!current) current = fallback;
  if (!current && !fallback) current = {};
  allowedRadiusEl.value = current.ALLOWED_RADIUS_METERS ?? '';
  eventoEl.value = current.EVENTO ?? '';
  targetLatEl.value = current.TARGET_LAT ?? '';
  targetLngEl.value = current.TARGET_LNG ?? '';
  renderPalestras(current.PALESTRAS || {});
  updatePreview();
}

function renderPalestras(palestras) {
  palestrasContainer.innerHTML = '';
  const entries = Object.entries(palestras);
  if (entries.length === 0) {
    const note = document.createElement('div');
    note.className = 'muted';
    note.textContent = 'Nenhuma palestra cadastrada.';
    palestrasContainer.appendChild(note);
    return;
  }

  for (const [id, name] of Object.entries(palestras)) {
    const div = document.createElement('div');
    div.className = 'palestra-item';
    div.id = `palestra-div-${id}`;

    const idInput = document.createElement('input');
    idInput.value = id;
    idInput.id = `palestra-${id}`;
    idInput.dataset.id = id;
    idInput.placeholder = `nome da palestra ${id}`;
    idInput.style.maxWidth = '110px';
    palestrasContainer.appendChild(idInput);

    const nameInput = document.createElement('input');
    nameInput.value = name;
    nameInput.placeholder = name;
    nameInput.id = `palestra-${id}`;

    const btnUpdate = document.createElement('button');
    btnUpdate.type = 'button';
    btnUpdate.className = 'smallBtn';
    btnUpdate.textContent = 'Atualizar';
    btnUpdate.onclick = () => {
      const newId = idInput.value.trim();
      const newName = nameInput.value.trim();
      if (!newId) return alert('ID não pode ficar vazio');
      if (!current.PALESTRAS) current.PALESTRAS = {};
      if (newId !== id) delete current.PALESTRAS[id];
      current.PALESTRAS[newId] = newName;
      renderPalestras(current.PALESTRAS);
      updatePreview();
    };

    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'smallBtn danger';
    btnRemove.textContent = 'Remover';
    btnRemove.onclick = () => {
      //if (!confirm('Remover esta palestra?')) return;
      delete current.PALESTRAS[id];
      renderPalestras(current.PALESTRAS);
      updatePreview();
    };

    div.append(idInput, nameInput, btnUpdate, btnRemove);
    palestrasContainer.appendChild(div);
  }
}

// adicionar nova palestra
btnAddPalestra.addEventListener('click', () => {
  const id = newPalestraId.value.trim();
  const name = newPalestraName.value.trim();
  if (!id || !name) return alert('Preencha ID e nome para adicionar.');
  if (!current.PALESTRAS) current.PALESTRAS = {};
  if (current.PALESTRAS[id]) {
    if (!confirm('ID já existe. Deseja substituir?')) return;
  }
  current.PALESTRAS[id] = name;
  newPalestraId.value = '';
  newPalestraName.value = '';
  renderPalestras(current.PALESTRAS);
  updatePreview();
});

// salva no servidor
document.getElementById('adminForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const allowedRadius = Number(allowedRadiusEl.value);
  const evento = eventoEl.value.trim();
  const lat = Number(targetLatEl.value);
  const lng = Number(targetLngEl.value);

  if (!evento) return alert('Preencha o nome do evento.');
  if (Number.isNaN(allowedRadius) || Number.isNaN(lat) || Number.isNaN(lng))
    return alert('Verifique os valores numéricos.');

  const payload = {
    ALLOWED_RADIUS_METERS: allowedRadius,
    EVENTO: evento,
    LOCALIZACAO: current.LOCALIZACAO || "---",
    PALESTRAS: current.PALESTRAS || {},
    TARGET_LAT: lat,
    TARGET_LNG: lng
  };

  setStatus('Salvando...', 'muted');
  try {
    const res = await fetch(endpoints.PUT, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Resposta não ok: ' + res.status);
    const data = await res.json().catch(() => null);
    setStatus('Salvo com sucesso.', 'success');
    current = data || payload;
    renderUIFromCurrent();
  } catch (err) {
    console.error(err);
    setStatus('Erro ao salvar — ver console.', 'danger');
    if (confirm('Erro ao salvar. Deseja copiar o JSON?')) {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      alert('JSON copiado.');
    }
  }
});

function updatePreview() {
  const previewObj = {
    ALLOWED_RADIUS_METERS: Number(allowedRadiusEl.value || current?.ALLOWED_RADIUS_METERS || 0),
    TARGET_LAT: Number(targetLatEl.value || current?.TARGET_LAT || 0),
    TARGET_LNG: Number(targetLngEl.value || current?.TARGET_LNG || 0),
    LOCALIZACAO: current.LOCALIZACAO || '',
    EVENTO: eventoEl.value || current?.EVENTO || '',
    PALESTRAS: current?.PALESTRAS || {}
  };
  jsonPreview.textContent = JSON.stringify(previewObj, null, 2);
}
function resetarEstado() {
  current = null;
  fallback = null;
  renderUIFromCurrent();
}

[allowedRadiusEl, eventoEl, targetLatEl, targetLngEl].forEach(el => {
  el.addEventListener('input', updatePreview);
});

// ======== MONITORAMENTO DE ALTERAÇÕES EM TEMPO REAL ========
// === COMPARADOR DETALHADO DE OBJETOS ===
function diffObjects(obj1, obj2, prefix = '') {
  const changes = [];

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      changes.push({ type: 'changed', path: prefix, oldValue: obj1, newValue: obj2 });
    }
    return changes;
  }

  for (const key in obj1) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (!(key in obj2)) {
      changes.push({ type: 'removed', path, oldValue: obj1[key], newValue: undefined });
      continue;
    }

    if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
      changes.push(...diffObjects(obj1[key], obj2[key], path));
    } else if (obj1[key] !== obj2[key]) {
      changes.push({ type: 'changed', path, oldValue: obj1[key], newValue: obj2[key] });
    }
  }

  for (const key in obj2) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!(key in obj1)) {
      changes.push({ type: 'added', path, oldValue: undefined, newValue: obj2[key] });
    }
  }

  return changes;
}
// === DESTAQUE VISUAL DOS CAMPOS ALTERADOS ===
function highlightChangedFields(differences) {
  // Remove destaques antigos
  document.querySelectorAll('.field-changed').forEach(el => el.classList.remove('field-changed'));

  if (!differences || differences.length === 0) return;

  differences.forEach(diff => {
    const path = diff.path.replace(/^\$\.?/, '').replace(/^0\./, '');

    // Campos simples
    if (path === 'ALLOWED_RADIUS_METERS') allowedRadiusEl.classList.add('field-changed');
    else if (path === 'EVENTO') eventoEl.classList.add('field-changed');
    else if (path === 'TARGET_LAT') targetLatEl.classList.add('field-changed');
    else if (path === 'TARGET_LNG') targetLngEl.classList.add('field-changed');

    // Campos de palestras

    else if (path.startsWith('PALESTRAS')) {
    const palestraId = path.split('.')[1]; // ex: "2300"
    if (palestraId) {
      // Encontra o container da palestra
      const palestraDiv = document.getElementById(`palestra-div-${palestraId}`);
      if (palestraDiv) {
        palestraDiv.classList.add('field-changed');
      } else {
        //console.warn('Não foi encontrada div para palestra ID:', palestraId);
      }
    }
  }
  updatePreview();
  });
}
// Função para verificar alterações no Redis
async function comparePreviewWithRedis() {
  try {
    // Pega o JSON atual mostrado no <pre>
    const localPreviewText = jsonPreview.textContent.trim();
    const localData = JSON.parse(localPreviewText);

    // Busca o JSON atual do Redis
    const res = await fetch(endpoints.GET);
    if (!res.ok) throw new Error('Erro ao buscar config do Redis');
    const redisData = await res.json();

    // Remove camadas extras ($ ou [0]) se existirem
    const redisClean = Array.isArray(redisData) ? redisData[0] : redisData;

    // Compara
    const differences = diffObjects(redisClean,localData);
    console.log("Diferenças entre preview e Redis:", differences);

    if (differences.length === 0) {
      setStatus('✅ Nenhuma diferença entre o que está na tela e o Redis.', 'success');
      highlightChangedFields(false); // Remove destaques
      
    } else {
      setStatus(`⚠️ ${differences.length} diferenças detectadas em relação ao Redis.`, 'danger');
      highlightChangedFields(differences);
    }

  } catch (err) {
    console.error('Erro ao comparar preview com Redis:', err);
    setStatus('Erro ao comparar dados com o Redis.', 'danger');
  }
}
const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};
const debouncedCompare = debounce(comparePreviewWithRedis, 500);
function configurarMonitoramento(elementoAlvo) {
  if(elementoAlvo === false){
    console.log("Monitoramento desativado");
    comparePreviewWithRedis();
  }else{
    
    elementoAlvo.addEventListener('click', debouncedCompare);
    elementoAlvo.addEventListener('keyup', debouncedCompare);
    elementoAlvo.addEventListener('change', debouncedCompare);
    elementoAlvo.addEventListener('input', debouncedCompare);

  }
}

// Chame a função para configurar o monitoramento em todo o corpo do documento
configurarMonitoramento(document.body);

btnReload.addEventListener('click', loadFromServer);
btnExport.addEventListener('click', () => {
  const dataStr = jsonPreview.textContent;
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config-export.json';
  a.click();
  URL.revokeObjectURL(url);
});
btnAtualizarTudo.addEventListener('click', () => {
  const palestraDivs = document.querySelectorAll('.palestra-item');
  let alteracoes = 0;

  // Se não houver nada, sair
  if (palestraDivs.length === 0) {
    alert('Nenhuma palestra encontrada para atualizar.');
    return;
  }

  // Se não existir o objeto de palestras, cria
  if (!current.PALESTRAS) current.PALESTRAS = {};

  // Percorre todas as divs e atualiza os dados
  palestraDivs.forEach(div => {
    const inputs = div.querySelectorAll('input');
    if (inputs.length >= 2) {
      const idInput = inputs[0];
      const nameInput = inputs[1];
      const id = idInput.value.trim();
      const nome = nameInput.value.trim();

      if (id && nome) {
        // Se o ID foi alterado, remove o antigo
        const oldId = idInput.dataset.id;
        if (oldId && oldId !== id) {
          delete current.PALESTRAS[oldId];
          idInput.dataset.id = id; // Atualiza o data-id
        }

        // Atualiza ou adiciona a palestra
        current.PALESTRAS[id] = nome;
        alteracoes++;
      }
    }
  });

  if (alteracoes > 0) {
    updatePreview();
    renderPalestras(current.PALESTRAS);
    //setStatus(`Atualizadas ${alteracoes} palestra(s).`, 'success');
  } else {
    //setStatus('Nenhuma alteração encontrada.', 'muted');
  }
});

fileImport.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      current = parsed;
      renderUIFromCurrent();
      setStatus('Importado JSON.', 'success');
    } catch (err) {
      alert('Arquivo JSON inválido: ' + err.message);
    }
  };
  reader.readAsText(f);
  e.target.value = '';
});
btnReset.addEventListener('click', () => {resetarEstado();});

toggleMonitorEl.addEventListener('change', () => {

  if (toggleMonitorEl.checked) {
    console.log("O monitoramento está ATIVADO.",current.LOCALIZACAO);
    current.LOCALIZACAO = "true";
    renderUIFromCurrent()
    
  } else {
    
    console.log("O monitoramento está DESATIVADO.",current.LOCALIZACAO);
    current.LOCALIZACAO = "false";
    renderUIFromCurrent()
  }

  });

loadFromServer();
