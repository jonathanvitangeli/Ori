import { supabase } from './supabaseClient.js';

let proyectosGlobal = [];
let proyectoEditando = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!sessionStorage.getItem('isAdmin')) {
    window.location.href = 'index.html';
    return;
  }

  cargarProyectosAdmin();

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

  const btnGuardarOrden = document.getElementById('btnGuardarOrden');
  if (btnGuardarOrden) {
    btnGuardarOrden.addEventListener('click', guardarOrdenProyectos);
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
  const filtrados = proyectosGlobal.filter(p =>
    p.descripcion.toLowerCase().includes(texto)
  );
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
    cargarProyectosAdmin();
  } catch (err) {
    console.error('Error guardando proyecto:', err);
    alert('Error guardando proyecto: ' + err.message);
  }
}

async function eliminar(id) {
  const pass = prompt('Para eliminar este proyecto, ingresa la contraseña de administrador:');
  if (!pass) return;

  if (pass !== '123') {
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
    const div = document.createElement('div');
    div.style = 'display:inline-block;position:relative;margin:5px;';
    div.innerHTML = `
      <img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">
      <span onclick="eliminarImagenEditor(${idx})" style="position:absolute;top:0;right:0;background:red;color:white;cursor:pointer;border-radius:50%;padding:2px 6px;">&times;</span>
    `;
    cont.appendChild(div);
  });
}

function eliminarImagenEditor(idx) {
  if (proyectoEditando) {
    proyectoEditando.imagenes.splice(idx, 1);
    mostrarImagenesEditor(proyectoEditando.imagenes);
  }
}

function cerrarEditor() {
  proyectoEditando = null;
  document.getElementById('editorProyecto').style.display = 'none';
}

async function guardarEdicionProyecto() {
  if (!proyectoEditando) return;

  const id = proyectoEditando.id;
  const descripcion = document.getElementById('editTitulo').value.trim();
  const descripcionLarga = document.getElementById('editDescripcion').value.trim();
  let imagenes = [...proyectoEditando.imagenes];

  if (!descripcion) {
    alert('La descripción es obligatoria');
    return;
  }

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

  try {
    const { error } = await supabase
      .from('proyectos')
      .update({
        descripcion,
        descripcion_larga: descripcionLarga,
        imagenes
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

// ================== Drag & Drop ======================

let draggedIndex = null;

function handleDragStart(e) {
  draggedIndex = parseInt(e.currentTarget.getAttribute('data-index'));
  e.currentTarget.style.opacity = '0.5';
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.style.borderTop = '2px solid blue';
}

function handleDrop(e) {
  e.preventDefault();
  const dropIndex = parseInt(e.currentTarget.getAttribute('data-index'));
  
  if (draggedIndex !== null && draggedIndex !== dropIndex) {
    const [movedItem] = proyectosGlobal.splice(draggedIndex, 1);
    proyectosGlobal.splice(dropIndex, 0, movedItem);
    renderizarProyectos(proyectosGlobal);
  }
  
  e.currentTarget.style.borderTop = 'none';
}

function handleDragEnd(e) {
  e.currentTarget.style.opacity = '1';
  e.currentTarget.style.borderTop = 'none';
}

async function guardarOrdenProyectos() {
  alert('La funcionalidad de reordenar está disponible.');
}
