// Búfer acotado por proceso; no guarda tokens, cuerpos ni parámetros de consulta.
const MAX_EVENTS = 200;
const events = [];
const SAFE_SEGMENTS = new Set([
  'api', 'v1', 'estado', 'health', 'usuarios', 'me', 'cuenta', 'sesion', 'mascota',
  'tamagotchi', 'vestidor', 'articulos', 'habitos', 'misiones', 'sesiones', 'logros',
  'progreso', 'animo', 'visualizador-usuarios', 'party', 'perfil-espejo', 'codigos',
  'botin', 'amigos', 'cofre', 'regalos', 'solicitudes', 'historial', 'diario',
  'actividades', 'notas', 'graficas', 'cumplimiento', 'distribucion', 'retos',
  'invitaciones', 'metricas', 'actividad', 'resumen-progreso', 'pendientes',
  'dias-baja-actividad', 'racha', 'consistencia', 'economia', 'curva', 'versiones',
  'catalogo', 'categorias', 'push', 'audiencia', 'notificaciones', 'stickers',
  'avisos-inactividad', 'inactividad', 'ejecutar', 'visto', 'admin', 'host', 'clients',
  'logs', 'data', 'profiles', 'exports', 'tienda', 'inventario',
]);

function sanitizePath(path) {
  return path.split('/').map((part) => !part || SAFE_SEGMENTS.has(part) ? part : ':param').join('/');
}

function recordRequest(event) {
  events.unshift(event);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

function listRequests() { return events.slice(); }

module.exports = { sanitizePath, recordRequest, listRequests };
