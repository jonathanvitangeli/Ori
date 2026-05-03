import { supabase } from './supabaseClient.js';

let proyectosGlobal = [];
let proyectoEditando = null;
let imagenesPendientes = [];
let imagenesPendientesEdicion = [];
let fondoActualUrl = '';
let fondoPendienteDataUrl = '';
const SITE_CONFIG_ID = 1;

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
    inputFondo.addEventListener('change', async () => {
      mostrarVistaPreviaImagenes(inputFondo.files, 'siteBackgroundPreview');
      const file = inputFondo.files[0];
      if (file) {
        try {
          fondoPendienteDataUrl = await convertirImagenADataUrlOptimizada(file);
          aplicarFondoPortfolio(fondoPendienteDataUrl);
        } catch (err) {
          fondoPendienteDataUrl = '';
          alert('Error leyendo imagen de fondo: ' + err.message);
        }
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

    const titulo = document.createElement('h3');
    titulo.textContent = p.descripcion || 'Proyecto';

    const imagen = document.createElement('img');
    imagen.src = primeraImagen;
    imagen.alt = 'Imagen del proyecto';
    imagen.style.cursor = 'pointer';
    imagen.addEventListener('click', () => verDetalle(p.id));

    const acciones = document.createElement('div');
    acciones.className = 'acciones';

    const editar = document.createElement('span');
    editar.className = 'material-symbols-outlined edit-icon';
    editar.textContent = 'edit';
    editar.title = 'Editar proyecto';
    editar.addEventListener('click', () => abrirEditor(p.id));

    const borrar = document.createElement('span');
    borrar.className = 'material-symbols-outlined delete-icon';
    borrar.textContent = 'delete_forever';
    borrar.title = 'Eliminar proyecto';
    borrar.addEventListener('click', () => eliminar(p.id));

    acciones.appendChild(editar);
    acciones.appendChild(borrar);
    card.appendChild(titulo);
    card.appendChild(imagen);
    card.appendChild(acciones);
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

  if (!descripcion) {
    alert('La descripcion es obligatoria');
    return;
  }

  if (imagenesPendientes.length === 0) {
    alert('Elegi al menos una imagen');
    return;
  }

  const imagenesUrls = [];

  for (const item of imagenesPendientes) {
    const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}-${item.file.name}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('proyectos')
        .upload(nombreArchivo, item.file);

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

  try {
    const { error } = await supabase
      .from('proyectos')
      .insert({
        descripcion,
        descripcion_larga: descripcionLarga,
        imagenes: imagenesUrls
      });

    if (error) throw error;

    alert('Proyecto guardado correctamente');
    document.getElementById('formulario').reset();
    limpiarColaImagenes('new');
    cargarProyectosAdmin();
  } catch (err) {
    console.error('Error guardando proyecto:', err);
    alert('Error guardando proyecto: ' + err.message);
  }
}

async function eliminar(id) {
  const pass = prompt('Para eliminar este proyecto, ingresa la contraseña de administrador:');
  if (!pass) return;

  if (!(await validarPasswordAdmin(pass))) {
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

// ================== Editor ======================

function abrirEditor(id) {
  const proyecto = proyectosGlobal.find(p => String(p.id) === String(id));
  if (!proyecto) {
    console.error('No se encontro el proyecto para editar:', id, proyectosGlobal);
    alert('No se encontro el proyecto para editar. Recarga el panel e intenta de nuevo.');
    return;
  }
  proyectoEditando = proyecto;
  limpiarColaImagenes('edit');
  document.getElementById('editTitulo').value = proyecto.descripcion || '';
  document.getElementById('editDescripcion').value = proyecto.descripcion_larga || '';
  mostrarImagenesEditor(proyecto.imagenes || []);
  document.getElementById('editorProyecto').style.display = 'flex';
}

function mostrarImagenesEditor(imagenes) {
  const cont = document.getElementById('editImagenes');
  cont.innerHTML = '';

  if (!imagenes.length) {
    cont.innerHTML = '<p class="editor-empty">Este proyecto todavia no tiene imagenes.</p>';
    return;
  }

  imagenes.forEach((url, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-image-item';

    const img = document.createElement('img');
    img.src = url;
    img.alt = `Imagen ${idx + 1} del proyecto`;

    const controls = document.createElement('div');
    controls.className = 'editor-image-controls';

    const btnLeft = document.createElement('button');
    btnLeft.type = 'button';
    btnLeft.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
    btnLeft.title = 'Mover a la izquierda';
    btnLeft.disabled = idx === 0;
    btnLeft.className = 'editor-image-button';
    btnLeft.addEventListener('click', () => moverImagenEditor(idx, -1));

    const btnRight = document.createElement('button');
    btnRight.type = 'button';
    btnRight.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
    btnRight.title = 'Mover a la derecha';
    btnRight.disabled = idx === imagenes.length - 1;
    btnRight.className = 'editor-image-button';
    btnRight.addEventListener('click', () => moverImagenEditor(idx, 1));

    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.innerHTML = '<span class="material-symbols-outlined">delete</span>';
    btnEliminar.title = 'Eliminar imagen';
    btnEliminar.className = 'editor-image-button danger';
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
  if (!Array.isArray(proyectoEditando.imagenes)) proyectoEditando.imagenes = [];
  proyectoEditando.imagenes.splice(idx, 1);
  mostrarImagenesEditor(proyectoEditando.imagenes);
}

function moverImagenEditor(idx, direction) {
  if (!proyectoEditando) return;
  if (!Array.isArray(proyectoEditando.imagenes)) proyectoEditando.imagenes = [];
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
  limpiarColaImagenes('edit');
}

// Exponer funciones al window para onclick del HTML
window.cerrarEditor = cerrarEditor;
window.guardarEdicionProyecto = guardarEdicionProyecto;
window.eliminarImagenEditor = eliminarImagenEditor;

async function guardarEdicionProyecto() {
  const id = proyectoEditando.id;
  const descripcion = document.getElementById('editTitulo').value.trim();
  const descripcionLarga = document.getElementById('editDescripcion').value.trim();
  let imagenes = Array.isArray(proyectoEditando.imagenes)
    ? [...proyectoEditando.imagenes]
    : [];

  if (imagenesPendientesEdicion.length > 0) {
    for (const item of imagenesPendientesEdicion) {
      const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}-${item.file.name}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('proyectos')
          .upload(nombreArchivo, item.file);

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

    alert('Proyecto actualizado');
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
    const tipo = inputId === 'editNuevasImagenes' ? 'edit' : 'new';
    agregarImagenesACola(input.files, tipo, contenedorId);
    input.value = '';
  });
}

function agregarImagenesACola(files, tipo, contenedorId) {
  if (!files || files.length === 0) return;

  const cola = tipo === 'edit' ? imagenesPendientesEdicion : imagenesPendientes;

  Array.from(files).forEach((file) => {
    cola.push({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file)
    });
  });

  renderizarColaImagenes(tipo, contenedorId);
}

function renderizarColaImagenes(tipo, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const cola = tipo === 'edit' ? imagenesPendientesEdicion : imagenesPendientes;
  const usarEstiloEditor = tipo === 'edit' || tipo === 'new';
  contenedor.innerHTML = '';

  cola.forEach((item) => {
    const preview = document.createElement('div');
    preview.className = usarEstiloEditor
      ? 'editor-image-item queued-image-item'
      : 'preview-item preview-item-removable';

    const imagen = document.createElement('img');
    imagen.alt = item.file.name;
    imagen.src = item.previewUrl;

    const nombre = document.createElement('span');
    nombre.className = 'preview-nombre';
    nombre.textContent = item.file.name;

    const controles = document.createElement('div');
    controles.className = usarEstiloEditor ? 'editor-image-controls' : 'preview-controls';

    const moverIzquierda = document.createElement('button');
    moverIzquierda.type = 'button';
    moverIzquierda.className = usarEstiloEditor ? 'editor-image-button' : 'preview-move';
    moverIzquierda.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
    moverIzquierda.title = 'Mover a la izquierda';
    moverIzquierda.disabled = cola.indexOf(item) === 0;
    moverIzquierda.addEventListener('click', () => moverImagenEnCola(tipo, item.id, -1, contenedorId));

    const moverDerecha = document.createElement('button');
    moverDerecha.type = 'button';
    moverDerecha.className = usarEstiloEditor ? 'editor-image-button' : 'preview-move';
    moverDerecha.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
    moverDerecha.title = 'Mover a la derecha';
    moverDerecha.disabled = cola.indexOf(item) === cola.length - 1;
    moverDerecha.addEventListener('click', () => moverImagenEnCola(tipo, item.id, 1, contenedorId));

    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = usarEstiloEditor ? 'editor-image-button danger' : 'preview-remove';
    quitar.setAttribute('aria-label', 'Quitar imagen');
    quitar.innerHTML = usarEstiloEditor
      ? '<span class="material-symbols-outlined">delete</span>'
      : 'x';
    quitar.addEventListener('click', () => quitarImagenDeCola(tipo, item.id, contenedorId));

    controles.appendChild(moverIzquierda);
    controles.appendChild(moverDerecha);
    if (usarEstiloEditor) controles.appendChild(quitar);

    preview.appendChild(imagen);
    if (!usarEstiloEditor) preview.appendChild(nombre);
    preview.appendChild(controles);
    if (!usarEstiloEditor) preview.appendChild(quitar);
    contenedor.appendChild(preview);
  });
}

function moverImagenEnCola(tipo, id, direction, contenedorId) {
  const cola = tipo === 'edit' ? imagenesPendientesEdicion : imagenesPendientes;
  const index = cola.findIndex((item) => item.id === id);
  const nextIndex = index + direction;
  if (index === -1 || nextIndex < 0 || nextIndex >= cola.length) return;

  const [item] = cola.splice(index, 1);
  cola.splice(nextIndex, 0, item);
  renderizarColaImagenes(tipo, contenedorId);
}

function quitarImagenDeCola(tipo, id, contenedorId) {
  const cola = tipo === 'edit' ? imagenesPendientesEdicion : imagenesPendientes;
  const index = cola.findIndex((item) => item.id === id);
  if (index === -1) return;

  URL.revokeObjectURL(cola[index].previewUrl);
  cola.splice(index, 1);
  renderizarColaImagenes(tipo, contenedorId);
}

function limpiarColaImagenes(tipo) {
  const cola = tipo === 'edit' ? imagenesPendientesEdicion : imagenesPendientes;
  cola.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  cola.length = 0;
  limpiarVistaPreviaImagenes(tipo === 'edit' ? 'previewEditImagenes' : 'previewImagenes');
}

function mostrarVistaPreviaImagenes(files, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  contenedor.innerHTML = '';
  if (!files || files.length === 0) return;

  Array.from(files).forEach((file) => {
    const preview = document.createElement('div');
    preview.className = 'preview-item';

    const imagen = document.createElement('img');
    imagen.alt = file.name;
    imagen.src = URL.createObjectURL(file);
    imagen.onload = () => URL.revokeObjectURL(imagen.src);

    const nombre = document.createElement('span');
    nombre.className = 'preview-nombre';
    nombre.textContent = file.name;

    preview.appendChild(imagen);
    preview.appendChild(nombre);
    contenedor.appendChild(preview);
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
    const data = await obtenerConfiguracionSitio();

    inputTitulo.value = data?.portfolio_title || '';
    fondoActualUrl = data?.portfolio_background_url || '';
    fondoPendienteDataUrl = '';
    inputFondoUrl.value = fondoActualUrl && !fondoActualUrl.startsWith('data:')
      ? fondoActualUrl
      : '';
    inputFondoUrl.placeholder = fondoActualUrl?.startsWith('data:')
      ? 'Imagen de fondo guardada'
      : 'O pega URL del fondo (opcional)';
    if (fondoActualUrl) {
      aplicarFondoPortfolio(fondoActualUrl);
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

  const fondoUrlManual = inputFondoUrl.value.trim();
  let fondoUrl = fondoPendienteDataUrl || fondoUrlManual || fondoActualUrl;
  const archivoFondo = inputFondoArchivo.files[0];

  if (archivoFondo && !fondoPendienteDataUrl) {
    try {
      fondoUrl = await convertirImagenADataUrlOptimizada(archivoFondo);
    } catch (err) {
      alert('Error leyendo imagen de fondo: ' + err.message);
      return;
    }
  }

  const payload = {
    id: SITE_CONFIG_ID,
    portfolio_title: inputTitulo.value.trim() || null,
    portfolio_background_url: fondoUrl || null,
    updated_at: new Date().toISOString()
  };

  try {
    const response = await fetch('/api/site-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) throw new Error(result?.error || 'No se pudo guardar la configuracion');

    fondoActualUrl = result?.portfolio_background_url || fondoUrl;
    fondoPendienteDataUrl = '';
    inputFondoUrl.value = fondoActualUrl && !fondoActualUrl.startsWith('data:')
      ? fondoActualUrl
      : '';
    inputFondoUrl.placeholder = fondoActualUrl?.startsWith('data:')
      ? 'Imagen de fondo guardada'
      : 'O pega URL del fondo (opcional)';
    inputFondoArchivo.value = '';
    limpiarVistaPreviaImagenes('siteBackgroundPreview');
    if (fondoActualUrl) aplicarFondoPortfolio(fondoActualUrl);
    alert('Configuracion guardada');
  } catch (err) {
    console.error('Error guardando configuracion:', err);
    alert('Error guardando configuracion: ' + err.message + '\nVerifica que exista la tabla site_config en Neon.');
  }
}

async function obtenerConfiguracionSitio() {
  const response = await fetch('/api/site-config');
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || 'No se pudo cargar la configuracion');
  }

  return Array.isArray(result) ? result[0] : result;
}

function convertirArchivoADataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

async function convertirImagenADataUrlOptimizada(file) {
  const dataUrl = await convertirArchivoADataUrl(file);
  const imagen = await cargarImagen(dataUrl);
  const maxLado = 1600;
  const escala = Math.min(1, maxLado / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(imagen.width * escala));
  canvas.height = Math.max(1, Math.round(imagen.height * escala));

  const ctx = canvas.getContext('2d');
  ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.82);
}

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => reject(new Error('No se pudo preparar la imagen'));
    imagen.src = src;
  });
}

function aplicarFondoPortfolio(url) {
  const escapedUrl = url.replace(/"/g, '\\"');
  document.documentElement.style.setProperty('--portfolio-bg-image', `url("${escapedUrl}")`);
  document.documentElement.style.backgroundImage = `url("${escapedUrl}")`;
  if (document.body) {
    document.body.style.backgroundImage = `url("${escapedUrl}")`;
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
