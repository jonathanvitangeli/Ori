function mostrarLoginAdmin() {
  const loginDiv = document.getElementById('adminLogin');
  loginDiv.classList.remove('d-none');
  loginDiv.classList.add('d-block');
}

async function login() {
  const pass = document.getElementById('adminPass').value;

  if (await validarPasswordAdmin(pass)) {
    sessionStorage.setItem('isAdmin', 'true');
    window.location.href = '/admin.html';
  } else {
    alert('Contrasena incorrecta');
  }
}

async function validarPasswordAdmin(password) {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const result = await response.json();
    return response.ok && result.ok === true;
  } catch (error) {
    console.error('Error validando administrador:', error);
    return false;
  }
}

function entrarComoVisitante(e) {
  if (e) e.preventDefault();
  sessionStorage.removeItem('isAdmin');
  window.location.href = '/portfolio.html';
}

window.mostrarLoginAdmin = mostrarLoginAdmin;
window.login = login;
window.entrarComoVisitante = entrarComoVisitante;
