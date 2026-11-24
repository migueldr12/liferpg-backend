const { cargarActividades } = require('./cargarActividades');

// RDF091 · consultarActividades + RDF092 · filtrarActividades
// Hábitos, misiones y sesiones del usuario, de la más reciente a la más antigua.
const consultarActividades = (deps) => (userId, filters) => cargarActividades(deps, userId, filters);

module.exports = { consultarActividades };
