const API_URL = 'http://localhost:3000';
const BASE_URL = location.hostname.includes('localhost') ? 'http://localhost:3000' : 'https://TU_BACKEND_EN_PRODUCCION';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '123';

document.getElementById('formulario').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('imagen');
  const descripcion = document.getElementById('descripcion').value;
  const descripcionLarga = document.getElementById('descripcionLarga').value;

  if (!fileInput.files.length || !descripcion) {
    alert('Debes completar la descripción y seleccionar al menos una imagen.');
    return;
  }

  // 1. Subir imágenes
  const formData = new FormData();
  for (const file of fileInput.files) {
    formData.append('imagenes', file);
  }

  let urls;
  try {
    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    if (!uploadRes.ok) throw new Error('Error al subir las imágenes');
    const data = await uploadRes.json();
    urls = data.urls;
    console.log('Imágenes subidas:', urls);
  } catch (err) {
    alert('No se pudieron subir las imágenes.');
    return;
  }

  // 2. Crear proyecto
  try {
    const res = await fetch(`${BASE_URL}/api/proyectos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descripcion, descripcionLarga, imagenes: urls })
    });
    if (!res.ok) {
      const error = await res.text();
      alert('Error al crear proyecto: ' + error);
      return;
    }
    alert('Proyecto creado correctamente');
    e.target.reset();
    cargarProyectosAdmin();
  } catch (err) {
    alert('No se pudo crear el proyecto.');
    console.error(err);
  }
});

async function cargarDetalleProyecto() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  if (!id) {
    alert('ID de proyecto no proporcionado');
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/proyectos`);
    const proyectos = await res.json();
    const proyecto = proyectos.find(p => p.id === id);

    if (!proyecto) {
      document.getElementById('titulo').innerText = 'Proyecto no encontrado';
      return;
    }

    document.getElementById('titulo').innerText = 'Detalle del Proyecto';
    document.getElementById('descripcion').innerText = proyecto.descripcion;
    document.getElementById('descripcionLarga').innerText = proyecto.descripcionLarga || '';

    // Galería
    const galeria = document.getElementById('galeria');
    galeria.innerHTML = '';
    proyecto.imagenes.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.style = "max-width:150px;max-height:150px;margin:5px;cursor:pointer;border-radius:8px;";
      img.onclick = () => mostrarLightbox(url);
      galeria.appendChild(img);
    });
  } catch (err) {
    console.error('Error al cargar proyecto:', err);
  }
}

function mostrarLightbox(url) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  lightboxImg.src = url;
  lightbox.style.display = 'flex';
}
    let proyectosGlobal = [];

    function mostrarLoginAdmin() {
      document.getElementById('adminLogin').style.display = 'block';
      // Opcional: ocultar los botones de ingreso para evitar doble click
      const botones = document.querySelectorAll('#loginSection > button');
      botones.forEach(btn => btn.style.display = 'none');
    }

    function login() {
      const pass = document.getElementById('adminPass').value;
      if (pass === ADMIN_PASSWORD) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('panelSection').style.display = 'block';
        document.getElementById('volverBtn').style.display = 'inline';
        cargarProyectosAdmin();
      } else {
        alert('Contraseña incorrecta');
      }
    }

    function entrarComoVisitante() {
      window.location.href = "index.html";
    }

    function volverAlInicio() {
      document.getElementById('loginSection').style.display = 'block';
      document.getElementById('panelSection').style.display = 'none';
      document.getElementById('visitanteSection').style.display = 'none';
      document.getElementById('adminLogin').style.display = 'none';
      document.getElementById('volverBtn').style.display = 'none';
    }

    async function cargarProyectosAdmin() {
      const res = await fetch(`${BASE_URL}/api/proyectos`);
      proyectosGlobal = await res.json();
      renderizarProyectos(proyectosGlobal);
    }

    function renderizarProyectos(lista) {
      const galeria = document.getElementById('galeria');
      galeria.innerHTML = '';
      lista.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h3>${p.descripcion}</h3>
          <img src="${p.imagenes && p.imagenes[0] ? p.imagenes[0] : ''}" alt="Proyecto" onclick="verDetalle(${p.id})">
          <button onclick="abrirEditor(${p.id})">Editar proyecto</button>
          <button onclick="eliminar(${p.id})">Eliminar</button>
        `;
        galeria.appendChild(card);
      });
    }

    function filtrarProyectos() {
      const texto = document.getElementById('buscador').value.toLowerCase();
      const filtrados = proyectosGlobal.filter(p => p.descripcion.toLowerCase().includes(texto));
      renderizarProyectos(filtrados);
    }

    async function actualizarDescripcion(id, nuevaDesc) {
      await fetch(`${BASE_URL}/api/proyectos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion: nuevaDesc })
      });
    }

   async function cargarProyectosVisitante() {
  const galeria = document.getElementById('galeriaVisitante');
  galeria.innerHTML = '';

const res = await fetch(`${BASE_URL}/api/proyectos`);
  const proyectos = await res.json();

  proyectos.forEach(p => {
    const imagenUrl = (p.imagenes && p.imagenes.length > 0) ? p.imagenes[0] : 'placeholder.jpg';

    const card = document.createElement('div');
    card.className = 'card';
    card.style.cursor = 'pointer'; // Para indicar que es clickable
    card.onclick = () => verDetalle(p.id); // Redirige al detalle al hacer click en cualquier parte

    card.innerHTML = `
      <img src="${imagenUrl}" alt="Proyecto" />
      <h3>${p.descripcion}</h3>
      <p class="descripcion">${p.descripcionLarga || ''}</p>
    `;

    galeria.appendChild(card);
  });
}


    async function eliminar(id) {
      const pass = prompt('Para eliminar este proyecto, ingresa la contraseña de administrador:');
      if (pass !== CLAVE) {
        alert('Contraseña incorrecta. No se eliminó el proyecto.');
        return;
      }
      if (!confirm('¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.')) {
        return;
      }
const res = await fetch(`${BASE_URL}/api/proyectos`);
      cargarProyectosAdmin();
    }

    document.getElementById('formulario').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('imagen');
      const descripcion = document.getElementById('descripcion').value;
      const descripcionLarga = document.getElementById('descripcionLarga').value;
      const formData = new FormData();
      for (const file of fileInput.files) {
        formData.append('imagenes', file);
      }

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const { urls } = await uploadRes.json();

      await fetch(`${BASE_URL}/api/proyectos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion, descripcionLarga, imagenes: urls })
      });

      e.target.reset();
      cargarProyectosAdmin();
    });

    function verDetalle(id) {
window.location.href = 'proyecto.html?id=' + id;
    }

    function cargarDetalleProyecto(id) {
  fetch(`${BASE_URL}/api/proyectos`)
    .then(res => res.json())
    .then(proyectos => {
      const proyecto = proyectos.find(p => p.id === id);
      if (!proyecto) {
        alert('Proyecto no encontrado');
        return;
      }
      const galeria = document.getElementById('galeriaDetalle');
      galeria.innerHTML = '';
      proyecto.imagenes.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.style = "max-width:150px;max-height:150px;margin:5px;cursor:pointer;border-radius:8px;";
        img.onclick = () => mostrarLightbox(url);
        galeria.appendChild(img);
      });
      // Opcional: mostrar la descripción si tienes un elemento para eso
      if (document.getElementById('descripcionDetalle')) {
        document.getElementById('descripcionDetalle').innerText = proyecto.descripcion;
      }
    });
}

    function mostrarLightbox(url) {
      const lightbox = document.getElementById('lightbox');
      const img = document.getElementById('lightboxImg');
      img.src = url;
      lightbox.style.display = 'flex';
    }

   function cerrarLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

let proyectoEditando = null;

function abrirEditor(id) {
  const proyecto = proyectosGlobal.find(p => p.id === id);
  if (!proyecto) return;
  proyectoEditando = proyecto;
  document.getElementById('editTitulo').value = proyecto.descripcion || '';
  document.getElementById('editDescripcion').value = proyecto.descripcionLarga || '';
  mostrarImagenesEditor(proyecto.imagenes || []);
  document.getElementById('editorProyecto').style.display = 'flex';
}

function mostrarImagenesEditor(imagenes) {
  const cont = document.getElementById('editImagenes');
  cont.innerHTML = '';
  imagenes.forEach((url, idx) => {
    const div = document.createElement('div');
    div.style = "display:inline-block;position:relative;margin:5px;";
    div.innerHTML = `
      <img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">
      <span onclick="eliminarImagenEditor(${idx})" style="position:absolute;top:0;right:0;background:red;color:white;cursor:pointer;border-radius:50%;padding:2px 6px;">&times;</span>
    `;
    cont.appendChild(div);
  });
}

function eliminarImagenEditor(idx) {
  proyectoEditando.imagenes.splice(idx, 1);
  mostrarImagenesEditor(proyectoEditando.imagenes);
}

function cerrarEditor() {
  proyectoEditando = null;
  document.getElementById('editorProyecto').style.display = 'none';
}

async function guardarEdicionProyecto() {
  const id = proyectoEditando.id;
  const descripcion = document.getElementById('editTitulo').value;
  const descripcionLarga = document.getElementById('editDescripcion').value;
  let imagenes = [...proyectoEditando.imagenes];

  // Subir nuevas imágenes si hay
  const nuevas = document.getElementById('editNuevasImagenes').files;
  if (nuevas.length > 0) {
    const formData = new FormData();
    for (const file of nuevas) formData.append('imagenes', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    imagenes = imagenes.concat(data.urls);
  }

  // Actualizar en backend
  await fetch(`/api/proyectos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ descripcion, descripcionLarga, imagenes })
  });

  cerrarEditor();
  cargarProyectosAdmin();
}
  async function cargarProyectos() {
const res = await fetch(`${BASE_URL}/api/proyectos`);
      const proyectos = await res.json();
      const contenedor = document.getElementById('galeria');
      proyectos.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <img src="${p.imagenes && p.imagenes[0] ? p.imagenes[0] : ''}" alt="Proyecto" onclick="window.location='proyecto.html?id=${p.id}'">
          <p>${p.descripcion}</p>
        `;
        contenedor.appendChild(card);
      });
    }

 async function cargarDetalleProyecto() {
      const params = new URLSearchParams(window.location.search);
      const id = parseInt(params.get('id'));

      if (!id) {
        alert('ID de proyecto no proporcionado');
        return;
      }

      try {
const res = await fetch(`${BASE_URL}/api/proyectos`);
        const proyectos = await res.json();
        const proyecto = proyectos.find(p => p.id === id);

        if (!proyecto) {
          document.getElementById('titulo').innerText = 'Proyecto no encontrado';
          return;
        }

        document.getElementById('titulo').innerText = 'Detalle del Proyecto';
        document.getElementById('descripcion').innerText = proyecto.descripcion;
        document.getElementById('descripcionLarga').innerText = proyecto.descripcionLarga || '';

        // Cargar imágenes de la galería
        const galeriaDiv = document.getElementById('galeria');
        galeriaDiv.innerHTML = ''; // Limpiar galería existente

        proyecto.imagenes.forEach((imgSrc, index) => {
          const img = document.createElement('img');
          img.src = imgSrc;
          img.alt = `Imagen ${index + 1} del proyecto`;
          img.onclick = () => abrirLightbox(imgSrc);
          galeriaDiv.appendChild(img);
        });

      } catch (err) {
        console.error('Error al cargar proyecto:', err);
      }
    }

    function abrirLightbox(imgSrc) {
      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightbox-img');
      lightboxImg.src = imgSrc;
      lightbox.style.display = 'flex';
    }

    document.getElementById('lightbox').onclick = function() {
      this.style.display = 'none';
    }
function cerrarLightboxSiClickFuera(event) {
  const img = document.getElementById('lightbox-img');
  if (!img.contains(event.target)) {
    cerrarLightbox();
  }
}



document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  lightbox.addEventListener('click', cerrarLightbox);
});

cargarDetalleProyecto();
cargarProyectos();
