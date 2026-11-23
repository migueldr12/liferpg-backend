const { EconomyVersion, DEFAULT_ECONOMY } = require('../../domain/entities/EconomyVersion');

// 14.1 Curva de experiencia (RF043).

// RDF134 · consultarCurvaXP: la versión activa (la última publicada).
// Si todavía no se publica ninguna, responde los valores por defecto como versión 0.
// También la usan otros módulos: hábitos y misiones (puntos por dificultad) y
// la tienda (rango de precio de recompensas, RDF054).
function makeConsultarEconomiaActiva({ economyRepository }) {
  return async function consultarEconomiaActiva() {
    return (await economyRepository.findLatest()) ?? new EconomyVersion(DEFAULT_ECONOMY);
  };
}

// RDF135 · actualizarFormulaXP y RDF136 · actualizarParametrosEconomia.
// Publicar crea la versión siguiente; las anteriores no se tocan (no retroactivo).
// Si dos administradores publican a la vez, el índice único de "version" rechaza al segundo (409).
function makePublicarEconomia({ economyRepository, clock }) {
  return async function publicarEconomia(adminId, { base, exponent, difficultyPoints, rewardPrice }) {
    const latest = await economyRepository.findLatest();
    const version = new EconomyVersion({
      version: (latest?.version ?? 0) + 1,
      base,
      exponent,
      difficultyPoints,
      rewardPrice,
      publishedAt: clock().toISOString(),
      publishedById: adminId,
    });
    return economyRepository.create(version);
  };
}

module.exports = { makeConsultarEconomiaActiva, makePublicarEconomia };
