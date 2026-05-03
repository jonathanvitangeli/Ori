// js/proyectosData.js
let listaProyectos = [];

function cargarProyectos() {
  return fetch('/api/proyectos')
    .then(res => res.json())
    .then(data => {
      listaProyectos = data;
    });
}

function getProyectos() {
  return listaProyectos;
}

function setProyectos(nuevaLista) {
  listaProyectos = nuevaLista;
}

function guardarProyectosEnServidor() {
  return fetch('/api/proyectos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(listaProyectos)
  });
}

export {
  cargarProyectos,
  getProyectos,
  setProyectos,
  guardarProyectosEnServidor
};
