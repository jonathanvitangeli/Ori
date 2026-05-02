import { supabase } from './supabaseClient.js';

const SITE_CONFIG_ID = 1;

async function cargarConfiguracionSitio() {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('portfolio_background_url')
      .eq('id', SITE_CONFIG_ID)
      .maybeSingle();

    if (error) throw error;

    if (data?.portfolio_background_url) {
      const escapedUrl = data.portfolio_background_url.replace(/"/g, '\\"');
      document.documentElement.style.setProperty('--portfolio-bg-image', `url("${escapedUrl}")`);
    }
  } catch (err) {
    console.error('Error al cargar configuracion del sitio en proyecto:', err);
  }
}

async function cargarDetalleProyecto() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));

  if (!id) {
    document.getElementById('titulo').innerText = 'Proyecto no encontrado';
    return;
  }

  try {
    const { data: proyecto, error } = await supabase
      .from('proyectos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!proyecto) {
      document.getElementById('titulo').innerText = 'Proyecto no encontrado';
      return;
    }

    document.getElementById('titulo').innerText = proyecto.descripcion || 'Proyecto';
    document.getElementById('descripcionLarga').innerText = proyecto.descripcion_larga || '';

    const galeria = document.getElementById('galeria');
    galeria.innerHTML = '';

    const imagenes = Array.isArray(proyecto.imagenes) ? proyecto.imagenes : [];
    if (imagenes.length === 0) {
      galeria.innerHTML = '<p>Este proyecto no tiene imágenes.</p>';
      return;
    }

    imagenes.forEach((url) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Imagen del proyecto';
      img.onclick = () => mostrarLightbox(url);
      galeria.appendChild(img);
    });
  } catch (err) {
    console.error('Error al cargar proyecto:', err);
    document.getElementById('titulo').innerText = 'Error al cargar el proyecto';
  }
}

function mostrarLightbox(url) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  lightboxImg.src = url;
  lightbox.style.display = 'flex';
}

function cerrarLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracionSitio();
  cargarDetalleProyecto();

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  if (lightbox) {
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        cerrarLightbox();
      }
    });
  }

  if (lightboxImg) {
    lightboxImg.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }
});