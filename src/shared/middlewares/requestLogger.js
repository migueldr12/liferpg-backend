// Registra cada respuesta sin exponer cuerpos, tokens ni parámetros de consulta.
function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const path = req.path;

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(`[HTTP] ${req.method} ${path} → ${res.statusCode} (${durationMs.toFixed(1)} ms)`);
  });

  next();
}

module.exports = { requestLogger };
