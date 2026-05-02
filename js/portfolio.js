import { supabase } from './supabaseClient.js';

const SITE_CONFIG_ID = 1;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '123';

async function cargarConfiguracionSitio() {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('portfolio_title, portfolio_background_url')
      .eq('id', SITE_CONFIG_ID)
      .maybeSingle();

    if (error) throw error;

    const titulo = document.getElementById('tituloPortfolio');
    if (titulo && data?.portfolio_title) {
      titulo.textContent = data.portfolio_title;
    }

    if (data?.portfolio_background_url) {
      const escapedUrl = data.portfolio_background_url.replace(/"/g, '\\"');
      document.documentElement.style.setProperty('--portfolio-bg-image', `url("${escapedUrl}")`);
    }
  } catch (err) {
    console.error('Error al cargar configuracion del sitio:', err);
  }
}

async function cargarProyectosVisitante() {
  const galeria = document.getElementById('galeriaVisitante');
  if (!galeria) return;

  galeria.innerHTML = '<p>Cargando proyectos...</p>';

  try {
    const { data: proyectos, error } = await supabase
      .from('proyectos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error de Supabase:', error);
      throw error;
    }

    galeria.innerHTML = '';

    if (!proyectos || proyectos.length === 0) {
      galeria.innerHTML = '<p>Sin proyectos disponibles</p>';
      return;
    }

    proyectos.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card-proyecto';
      card.style.cursor = 'pointer';
      card.onclick = () => verDetalle(p.id);

      // Construir HTML de imágenes
      const imagenesHtml = (p.imagenes || [])
        .map(url => `<img src="${url}" alt="Imagen del proyecto" onerror="this.src='https://via.placeholder.com/360x240?text=Sin+imagen'" />`)
        .join('');

      const primeraImagen = (p.imagenes && p.imagenes[0]) 
        ? p.imagenes[0] 
        : 'https://via.placeholder.com/360x240?text=Sin+imagen';

      card.innerHTML = `
        <img src="${primeraImagen}" alt="Proyecto" onerror="this.src='https://via.placeholder.com/360x240?text=Sin+imagen'" />
        <div class="contenido">
          <h3>${p.descripcion}</h3>
          <p class="descripcion">${p.descripcion_larga || p.descripcion}</p>
        </div>
      `;
      galeria.appendChild(card);
    });

  } catch (err) {
    console.error('Error al cargar proyectos:', err);
    galeria.innerHTML = '<p>Error al cargar proyectos. Revisa la consola.</p>';
  }
}

async function solicitarLoginAdmin() {
  const password = prompt('Ingresa la contraseña de administrador:');

  if (password === null) {
    return;
  }

  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem('isAdmin', 'true');
    window.location.href = '/admin.html';
    return;
  }

  alert('Contraseña incorrecta');
}

function verDetalle(id) {
  window.location.href = `/proyecto.html?id=${id}`;
}

document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracionSitio();
  cargarProyectosVisitante();

  const titulo = document.getElementById('tituloPortfolio');
  if (titulo) {
    titulo.addEventListener('click', solicitarLoginAdmin);
  }
});
