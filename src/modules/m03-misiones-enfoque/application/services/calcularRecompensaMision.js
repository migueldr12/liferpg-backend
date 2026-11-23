const { rewardFor } = require('../../domain/entities/Mission');

// RDF038 · calcularRecompensaMision: vista previa para el formulario de nueva misión.
// La misma regla se aplica al otorgar los puntos, así la app nunca la calcula por su cuenta.
function calcularRecompensaMision() {
  return async ({ type, durationMin }) => rewardFor(type, durationMin);
}

module.exports = { calcularRecompensaMision };
