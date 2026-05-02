const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '123';

function mostrarLoginAdmin() {
  const loginDiv = document.getElementById('adminLogin');
  loginDiv.classList.remove('d-none');
  loginDiv.classList.add('d-block');
}

function login() {
  const pass = document.getElementById('adminPass').value;

  if (pass === adminPassword) {
    sessionStorage.setItem('isAdmin', 'true');
    window.location.href = '/admin.html';
  } else {
    alert('Contrasena incorrecta');
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
