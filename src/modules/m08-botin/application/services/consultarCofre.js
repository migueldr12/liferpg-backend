const { cofreDe } = require('./comunes');

// RDF088 · consultarCofre: los objetos del usuario, con cantidad y si se pueden regalar
const consultarCofre = (deps) => (userId) => cofreDe(deps, userId);

module.exports = { consultarCofre };
