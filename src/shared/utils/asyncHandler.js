// Express 4 no atrapa las promesas rechazadas de un controlador async.
// Envolver cada controlador con asyncHandler manda esos errores a errorHandler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asyncHandler };
