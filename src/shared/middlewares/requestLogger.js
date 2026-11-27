const { sanitizePath, recordRequest } = require('../../modules/m13-sincronizacion-red/infrastructure/requestEvents');

// Registra cada respuesta sin exponer cuerpos, tokens, parámetros ni identificadores.
function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const path = sanitizePath(req.path);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    recordRequest({ time: new Date().toISOString(), method: req.method, path, statusCode: res.statusCode, durationMs: Math.round(durationMs) });
    console.log(`[HTTP] ${req.method} ${path} → ${res.statusCode} (${durationMs.toFixed(1)} ms)`);
  });

  next();
}

module.exports = { requestLogger };
