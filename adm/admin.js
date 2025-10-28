// adm/admin.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const usuarioInput = document.getElementById('usuario');
  const senhaInput = document.getElementById('senha');
  const mensagemErro = document.getElementById('mensagem-erro');
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensagemErro.textContent = '';
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Carregando...';

    const usuario = usuarioInput.value.trim();
    const senha = senhaInput.value.trim();
    console.log('Tentando login com', usuario, senha);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // importante para receber cookies HttpOnly
        body: JSON.stringify({ usuario, senha })
      });

      if (res.ok) {
        // login bem-sucedido -> redireciona para config
        const confingExpired = await fetch('/api/config');
        if (!confingExpired.ok) throw new Error('Erro ao buscar config');
        const expiredData = await confingExpired.json();
        console.log("expiredData:", expiredData);

        const expiresIn = expiredData.expiresIn; // mesmo valor do backend (ou pegue do backend se quiser)
        const expiryTime = Date.now() + expiresIn * 1000;

        sessionStorage.setItem('auth', 'ok');
        sessionStorage.setItem('auth_expiry', expiryTime);

        window.location.href = '/config/config.html';

      } else {
        const data = await res.json().catch(()=>({ error: 'Erro no servidor' }));
        mensagemErro.textContent = data.error || 'Usuário ou senha inválidos.';
      }
    } catch (err) {
      mensagemErro.textContent = 'Erro de conexão.';
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
});
