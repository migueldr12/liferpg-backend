const express = require('express');
const v = require('../validators/economiaValidators');

// Routers del M14 (PWA Admin). Se montan en src/routes/index.js:
//   /api/v1/economia  · curva de experiencia (RF043)
//   /api/v1/catalogo  · categorías y artículos (RF044)
//   /api/v1/push      · avisos push (RF045)
// Todas las rutas piden usuario (auth) y rol ADMIN (soloAdmin).

function makeEconomiaRouters(c, { auth, soloAdmin }) {
  const economia = express.Router();
  economia.use(auth, soloAdmin);
  economia.get('/curva', c.curva); // RDF134
  economia.post('/versiones', v.validarPublicacion, c.publicar); // RDF135, RDF136

  const catalogo = express.Router();
  catalogo.use(auth, soloAdmin);
  catalogo.get('/categorias', c.listarCategorias);
  catalogo.post('/categorias', v.validarCategoria, c.crearCategoria); // RDF137
  catalogo.put('/categorias/:id', v.validarCategoria, c.editarCategoria); // RDF138
  catalogo.delete('/categorias/:id', c.borrarCategoria); // RDF138
  catalogo.get('/articulos', c.listarArticulos);
  catalogo.post('/articulos', v.validarArticuloNuevo, c.crearArticulo); // RDF140
  catalogo.patch('/articulos/:id', v.validarCambiosArticulo, c.editarArticulo); // RDF140

  const push = express.Router();
  push.use(auth, soloAdmin);
  push.get('/audiencia', c.audiencia);
  push.get('/historial', c.historial); // RDF142
  push.post('/', v.validarPush, c.enviar); // RDF141

  return { economia, catalogo, push };
}

module.exports = { makeEconomiaRouters };
