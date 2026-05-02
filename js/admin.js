import { supabase } from './supabaseClient.js';

let proyectosGlobal = [];
let proyectoEditando = null;
const SITE_CONFIG_ID = 1;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '123';

document.addEventListener('DOMContentLoaded', () => {
  if (!sessionStorage.getItem('isAdmin')) {
    window.location.href = 'index.html';
    return;
  }

  cargarProyectosAdmin();
  cargarConfiguracionSitio();

  const buscador = document.getElementById('buscador');
  if (buscador) {
    buscador.addEventListener('input', filtrarProyectos);
  }

  const form = document.getElementById('formulario');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await agregarProyecto();
    });
  }

  configurarVistaPreviaImagenes('imagen', 'previewImagenes');
  configurarVistaPreviaImagenes('editNuevasImagenes', 'previewEditImagenes');

  const btnGuardarOrden = document.getElementById('btnGuardarOrden');
  if (btnGuardarOrden) {
    btnGuardarOrden.addEventListener('click', guardarOrdenProyectos);
  }

  const btnGuardarConfiguracion = document.getElementById('btnGuardarConfiguracion');
  if (btnGuardarConfiguracion) {
    btnGuardarConfiguracion.addEventListener('click', guardarConfiguracionSitio);
  }

  const inputFondo = document.getElementById('siteBackgroundFile');
  if (inputFondo) {
    inputFondo.addEventListener('change', () => {
      mostrarVistaPreviaImagenes(inputFondo.files, 'siteBackgroundPreview');
      const file = inputFondo.files[0];
      if (file) {
        const blobUrl = URL.createObjectURL(file);
        document.documentElement.style.setProperty('--portfolio-bg-image', `url("${blobUrl}")`);
      }
    });
  }

  window.addEventListener('beforeunload', () => {
    sessionStorage.removeItem('isAdmin');
  });
});

function volverAlInicio() {
  sessionStorage.removeItem('isAdmin');
  window.location.href = 'index.html';
}

async function cargarProyectosAdmin() {
  try {
    const { data: proyectos, error } = await supabase
      .from('proyectos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    proyectosGlobal = proyectos || [];
    renderizarProyectos(proyectosGlobal);
  } catch (err) {
    console.error('Error al cargar proyectos:', err);
    alert('Error al cargar proyectos: ' + err.message);
  }
}

function renderizarProyectos(lista) {
  const galeria = document.getElementById('galeria');
  if (!galeria) return;

  galeria.innerHTML = '';
  lista.forEach((p, index) => {
    const primeraImagen = (p.imagenes && p.imagenes.length > 0)
      ? p.imagenes[0]
      : 'https://via.placeholder.com/150x150?text=Sin+imagen';

    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-index', index);
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    card.innerHTML = `
      <h3>${p.descripcion}</h3>
      <img src="${primeraImagen}" alt="Imagen del proyecto" onclick="verDetalle(${p.id})" style="cursor:pointer;">
      <div class="acciones">
        <span class="material-symbols-outlined edit-icon" onclick="abrirEditor(${p.id})">edit</span>
        <span class="material-symbols-outlined delete-icon" onclick="eliminar(${p.id})">delete_forever</span>
      </div>
    `;
    galeria.appendChild(card);
  });
}



function filtrarProyectos() {
  const texto = document.getElementById('buscador').value.toLowerCase();
  const filtrados = proyectosGlobal.filter(p => p.descripcion.toLowerCase().includes(texto));
  renderizarProyectos(filtrados);
}

async function agregarProyecto() {
  const descripcion = document.getElementById('descripcion').value.trim();
  const descripcionLarga = document.getElementById('descripcionLarga').value.trim();
  const fileInput = document.getElementById('imagen');

  if (!descripcion) {
    alert('La descripción es obligatoria');
    return;
  }

  const imagenesUrls = [];

  // Subir imágenes a Storage
  for (const file of fileInput.files) {
    const nombreArchivo = `${Date.now()}-${file.name}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('proyectos')
        .upload(nombreArchivo, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('proyectos')
        .getPublicUrl(nombreArchivo);

      imagenesUrls.push(data.publicUrl);
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      alert('Error subiendo imagen: ' + err.message);
      return;
    }
  }

  // Guardar en base de datos
  try {
    const { error } = await supabase
      .from('proyectos')
      .insert({
        descripcion,
        descripcion_larga: descripcionLarga,
        imagenes: imagenesUrls
      });

    if (error) throw error;

    alert('✅ Proyecto guardado correctamente');
    document.getElementById('formulario').reset();
    limpiarVistaPreviaImagenes('previewImagenes');
    cargarProyectosAdmin();
  } catch (err) {
    console.error('Error guardando proyecto:', err);
    alert('Error guardando proyecto: ' + err.message);
  }
}

async function eliminar(id) {
  const pass = prompt('Para eliminar este proyecto, ingresa la contraseña de administrador:');
  if (!pass) return;

  if (pass !== ADMIN_PASSWORD) {
    alert('Contraseña incorrecta');
    return;
  }

  if (!confirm('¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('proyectos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert('✅ Proyecto eliminado');
    cargarProyectosAdmin();
  } catch (err) {
    console.error('Error eliminando proyecto:', err);
    alert('Error al eliminar: ' + err.message);
  }
}

function verDetalle(id) {
  window.location.href = `/proyecto.html?id=${id}`;
}

// Exponer funciones al window para que los onclick del HTML funcionen
window.volverAlInicio = volverAlInicio;
window.abrirEditor = abrirEditor;
window.eliminar = eliminar;
window.verDetalle = verDetalle;

// ================== Editor ======================

function abrirEditor(id) {
  const proyecto = proyectosGlobal.find(p => p.id === id);
  if (!proyecto) return;
  proyectoEditando = proyecto;
  document.getElementById('editTitulo').value = proyecto.descripcion || '';
  document.getElementById('editDescripcion').value = proyecto.descripcion_larga || '';
  mostrarImagenesEditor(proyecto.imagenes || []);
  document.getElementById('editorProyecto').style.display = 'flex';
}

function mostrarImagenesEditor(imagenes) {
  const cont = document.getElementById('editImagenes');
  cont.innerHTML = '';
  imagenes.forEach((url, idx) => {
    const wrapper = document.createElement('div');
    wrapper.style = 'display:inline-block;position:relative;margin:6px;text-align:center;';

    const img = document.createElement('img');
    img.src = url;
    img.style = 'width:90px;height:90px;object-fit:cover;border-radius:6px;display:block;';

    const controls = document.createElement('div');
    controls.style = 'display:flex;gap:6px;justify-content:center;margin-top:6px;';

    const btnLeft = document.createElement('button');
    btnLeft.type = 'button';
    btnLeft.textContent = '◀';
    btnLeft.title = 'Mover a la izquierda';
    btnLeft.disabled = idx === 0;
    btnLeft.style = 'padding:4px 6px;border-radius:6px;cursor:pointer;';
    btnLeft.addEventListener('click', () => moverImagenEditor(idx, -1));

    const btnRight = document.createElement('button');
    btnRight.type = 'button';
    btnRight.textContent = '▶';
    btnRight.title = 'Mover a la derecha';
    btnRight.disabled = idx === imagenes.length - 1;
    btnRight.style = 'padding:4px 6px;border-radius:6px;cursor:pointer;';
    btnRight.addEventListener('click', () => moverImagenEditor(idx, 1));

    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.textContent = '✕';
    btnEliminar.title = 'Eliminar imagen';
    btnEliminar.style = 'padding:4px 6px;border-radius:6px;cursor:pointer;background:red;color:white;border:none;';
    btnEliminar.addEventListener('click', () => eliminarImagenEditor(idx));

    controls.appendChild(btnLeft);
    controls.appendChild(btnRight);
    controls.appendChild(btnEliminar);

    wrapper.appendChild(img);
    wrapper.appendChild(controls);
    cont.appendChild(wrapper);
  });
}


function eliminarImagenEditor(idx) {
  if (!proyectoEditando) return;
  proyectoEditando.imagenes.splice(idx, 1);
  mostrarImagenesEditor(proyectoEditando.imagenes);
}

function moverImagenEditor(idx, direction) {
  if (!proyectoEditando) return;
  const imagenes = proyectoEditando.imagenes;
  const nuevoIdx = idx + direction;
  if (nuevoIdx < 0 || nuevoIdx >= imagenes.length) return;
  // Intercambiar
  const tmp = imagenes[nuevoIdx];
  imagenes[nuevoIdx] = imagenes[idx];
  imagenes[idx] = tmp;
  mostrarImagenesEditor(imagenes);
}

function cerrarEditor() {
  proyectoEditando = null;
  document.getElementById('editorProyecto').style.display = 'none';
  limpiarVistaPreviaImagenes('previewEditImagenes');
}

// Exponer funciones al window para onclick del HTML
window.cerrarEditor = cerrarEditor;
window.guardarEdicionProyecto = guardarEdicionProyecto;
window.eliminarImagenEditor = eliminarImagenEditor;

async function guardarEdicionProyecto() {
  const id = proyectoEditando.id;
  const descripcion = document.getElementById('editTitulo').value.trim();
  const descripcionLarga = document.getElementById('editDescripcion').value.trim();
  let imagenes = [...proyectoEditando.imagenes];

  // Subir nuevas imágenes a Storage
  const nuevas = document.getElementById('editNuevasImagenes').files;
  if (nuevas.length > 0) {
    for (const file of nuevas) {
      const nombreArchivo = `${Date.now()}-${file.name}`;
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('proyectos')
          .upload(nombreArchivo, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('proyectos')
          .getPublicUrl(nombreArchivo);

        imagenes.push(data.publicUrl);
      } catch (err) {
        console.error('Error subiendo imagen:', err);
        alert('Error subiendo imagen: ' + err.message);
        return;
      }
    }
  }

  // Actualizar en Supabase
  try {
    const { error } = await supabase
      .from('proyectos')
      .update({
        descripcion,
        descripcion_larga: descripcionLarga,
        imagenes: imagenes
      })
      .eq('id', id);

    if (error) throw error;

    alert('✅ Proyecto actualizado');
    cerrarEditor();
    cargarProyectosAdmin();
  } catch (err) {
    console.error('Error guardando proyecto:', err);
    alert('Error al guardar: ' + err.message);
  }
}

function configurarVistaPreviaImagenes(inputId, contenedorId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('change', () => {
    mostrarVistaPreviaImagenes(input.files, contenedorId);
  });
}

function mostrarVistaPreviaImagenes(files, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  contenedor.innerHTML = '';
  if (!files || files.length === 0) return;

  Array.from(files).forEach((file) => {
    const item = document.createElement('div');
    item.className = 'preview-item';

    const imagen = document.createElement('img');
    imagen.alt = file.name;
    imagen.src = URL.createObjectURL(file);
    imagen.onload = () => URL.revokeObjectURL(imagen.src);

    const nombre = document.createElement('span');
    nombre.className = 'preview-nombre';
    nombre.textContent = file.name;

    item.appendChild(imagen);
    item.appendChild(nombre);
    contenedor.appendChild(item);
  });
}

function limpiarVistaPreviaImagenes(contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (contenedor) {
    contenedor.innerHTML = '';
  }
}

// ==================== DRAG & DROP ====================

let draggedIndex = null;

function handleDragStart(e) {
  draggedIndex = e.target.closest('.card').getAttribute('data-index');
  e.target.closest('.card').style.opacity = '0.5';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dropEffect = 'move';
}

function handleDrop(e) {
  e.preventDefault();
  const targetIndex = e.target.closest('.card')?.getAttribute('data-index');
  
  if (targetIndex === null || draggedIndex === targetIndex) return;

  // Reordenar array
  const temp = proyectosGlobal[draggedIndex];
  proyectosGlobal.splice(draggedIndex, 1);
  proyectosGlobal.splice(targetIndex, 0, temp);

  renderizarProyectos(proyectosGlobal);
}

function handleDragEnd(e) {
  e.target.closest('.card').style.opacity = '1';
}

async function guardarOrdenProyectos() {
  try {
    // Actualizar cada proyecto con su nueva posición
    for (let i = 0; i < proyectosGlobal.length; i++) {
      const { error } = await supabase
        .from('proyectos')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', proyectosGlobal[i].id);

      if (error) throw error;
    }
    alert('✅ Orden guardado');
    cargarProyectosAdmin();
  } catch (err) {
    console.error('Error guardando orden:', err);
    alert('Error al guardar orden: ' + err.message);
  }
}

// ==================== Configuracion sitio ====================

async function cargarConfiguracionSitio() {
  const inputTitulo = document.getElementById('siteTitle');
  const inputFondoUrl = document.getElementById('siteBackgroundUrl');
  if (!inputTitulo || !inputFondoUrl) return;

  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('portfolio_title, portfolio_background_url')
      .eq('id', SITE_CONFIG_ID)
      .maybeSingle();

    if (error) throw error;

    inputTitulo.value = data?.portfolio_title || '';
    inputFondoUrl.value = data?.portfolio_background_url || '';
    if (data?.portfolio_background_url) {
      const escaped = data.portfolio_background_url.replace(/"/g, '\\"');
      document.documentElement.style.setProperty('--portfolio-bg-image', `url("${escaped}")`);
    }
  } catch (err) {
    console.error('Error al cargar configuracion del sitio:', err);
  }
}

async function guardarConfiguracionSitio() {
  const inputTitulo = document.getElementById('siteTitle');
  const inputFondoUrl = document.getElementById('siteBackgroundUrl');
  const inputFondoArchivo = document.getElementById('siteBackgroundFile');
  if (!inputTitulo || !inputFondoUrl || !inputFondoArchivo) return;

  let fondoUrl = inputFondoUrl.value.trim();
  const archivoFondo = inputFondoArchivo.files[0];

  if (archivoFondo) {
    const nombreArchivo = `site/background-${Date.now()}-${archivoFondo.name}`;
    const { error: uploadError } = await supabase.storage
      .from('proyectos')
      .upload(nombreArchivo, archivoFondo);

    if (uploadError) {
      alert('Error subiendo imagen de fondo: ' + uploadError.message);
      return;
    }

    const { data: fondoPublico } = supabase.storage
      .from('proyectos')
      .getPublicUrl(nombreArchivo);

    fondoUrl = fondoPublico.publicUrl;
  }

  const payload = {
    id: SITE_CONFIG_ID,
    portfolio_title: inputTitulo.value.trim() || null,
    portfolio_background_url: fondoUrl || null,
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('site_config')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;

    inputFondoUrl.value = fondoUrl;
    inputFondoArchivo.value = '';
    limpiarVistaPreviaImagenes('siteBackgroundPreview');
    if (fondoUrl) document.documentElement.style.setProperty('--portfolio-bg-image', `url("${fondoUrl}")`);
    alert('✅ Configuración guardada');
  } catch (err) {
    console.error('Error guardando configuracion:', err);
    alert('Error guardando configuración: ' + err.message + '\nVerifica que exista la tabla site_config en Supabase.');
  }
}

// ==================== LIGHTBOX ====================

function verDetalleLightbox(imgSrc) {
  document.getElementById('lightboxImg').src = imgSrc;
  document.getElementById('lightbox').style.display = 'flex';
}

function cerrarLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

// Exponer funciones al window
window.cerrarLightbox = cerrarLightbox;
window.verDetalleLightbox = verDetalleLightbox;
