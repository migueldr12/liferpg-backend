// RDF073 · calcularResumenAnimo y RDF074 · detectarPatronSemanal.
// Funciones puras: reciben los puntos del periodo y devuelven el resumen.
// No tocan la base de datos, así que se prueban fácil.

// Promedio, mejor y peor día (empates: decide la energía)
function calcularResumenAnimo(points) {
  const withData = points.filter((p) => p.mood !== null && p.energy !== null);
  if (withData.length === 0) return { average: null, bestDate: null, worstDate: null };

  const average = withData.reduce((sum, p) => sum + p.mood, 0) / withData.length;
  const best = withData.reduce((a, b) => (b.mood > a.mood || (b.mood === a.mood && b.energy > a.energy) ? b : a));
  const worst = withData.reduce((a, b) => (b.mood < a.mood || (b.mood === a.mood && b.energy < a.energy) ? b : a));

  return { average: Math.round(average * 10) / 10, bestDate: best.date, worstDate: worst.date };
}

// Correlación de Pearson entre ánimo y energía (-1 a 1)
function correlacion(points) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.mood, 0) / n;
  const my = points.reduce((s, p) => s + p.energy, 0) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (const p of points) {
    cov += (p.mood - mx) * (p.energy - my);
    vx += (p.mood - mx) ** 2;
    vy += (p.energy - my) ** 2;
  }
  return vx && vy ? cov / Math.sqrt(vx * vy) : 0;
}

// Mensaje con el patrón detectado en el periodo
function detectarPatronSemanal(points, period) {
  const word = period === 'semana' ? 'la semana' : 'el mes';
  const withData = points.filter((p) => p.mood !== null && p.energy !== null);
  if (withData.length === 0) return `Aún no hay registros en ${word}.`;
  if (withData.length < 3) return `Registra más días para ver un patrón en ${word}.`;

  const r = correlacion(withData);
  if (r >= 0.5) {
    return 'Tu ánimo y tu energía se movieron juntos: los días con más energía también fueron los de mejor ánimo.';
  }
  if (r <= -0.3) {
    return 'Tu ánimo y tu energía fueron en sentidos distintos: aunque tuviste poca pila, tu ánimo se sostuvo.';
  }
  return `Tu ánimo se mantuvo estable durante ${word}.`;
}

module.exports = { calcularResumenAnimo, detectarPatronSemanal, correlacion };
