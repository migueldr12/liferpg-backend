// Metadatos de presentación que aún no existen en el esquema de achievements.
// Las reglas, el avance, el desbloqueo y los saldos se consultan en la base de datos.
// Las claves de icon deben existir en src/components/ui/PixelIcons.tsx del móvil.
const catalog = {
  'a-primera-racha': { icon: 'streak', rarity: 'comun', area: 'habitos', unit: 'días', conditions: ['Al menos un hábito cumplido cada día', '3 días seguidos'], pointType: 'enfoque', item: null },
  'a-lector': { icon: 'book-open', rarity: 'raro', area: 'habitos', unit: 'veces', conditions: ['Hábitos de tipo Cultura', '30 cumplimientos en total'], pointType: 'cultura', item: null },
  'a-maratonista': { icon: 'dumbbell', rarity: 'raro', area: 'misiones', unit: 'misiones', conditions: ['Misiones de tipo Física', '10 misiones completadas'], pointType: 'fisico', item: 'Banda deportiva' },
  'a-madrugador': { icon: 'star', rarity: 'comun', area: 'habitos', unit: 'días', conditions: ['Check-in antes de las 7:00', '5 días distintos'], pointType: 'fisico', item: null },
  'a-mente-clara': { icon: 'heart', rarity: 'raro', area: 'animo', unit: 'días', conditions: ['Un registro de ánimo por día', '14 días seguidos'], pointType: 'enfoque', item: null },
  'a-monje': { icon: 'focus', rarity: 'epico', area: 'enfoque', unit: 'sesiones', conditions: ['Sesiones de 25 min o más', 'Sin pulsar «Rendirse»', '20 sesiones completas'], pointType: 'enfoque', item: 'Capucha de monje' },
  'a-explorador': { icon: 'flag', rarity: 'raro', area: 'misiones', unit: 'museos', conditions: ['Misiones de Cultura con la palabra «museo»', '5 misiones completadas'], pointType: 'cultura', item: null },
  'a-coleccionista': { icon: 'clothes', rarity: 'raro', area: 'tienda', unit: 'prendas', conditions: ['Prendas compradas, regaladas o ganadas', '15 prendas distintas'], pointType: 'cultura', item: 'Corona de sabio' },
  'a-imparable': { icon: 'streak', rarity: 'legendario', area: 'habitos', unit: 'días', conditions: ['Al menos un hábito cumplido cada día', '30 días seguidos'], pointType: 'fisico', item: 'Aura dorada' },
  'a-dia-perfecto': { icon: 'check', rarity: 'comun', area: 'habitos', unit: 'hábitos hoy', conditions: ['Todos los hábitos programados para hoy', 'Antes del cierre de las 23:59'], pointType: 'enfoque', item: null },
  'a-ahorrador': { icon: 'bag', rarity: 'epico', area: 'tienda', unit: 'puntos', conditions: ['Puntos de Cultura, Físicos o de Enfoque', '1 000 puntos de un solo tipo al mismo tiempo'], pointType: 'cultura', item: null },
  'a-constancia': { icon: 'edit', rarity: 'comun', area: 'animo', unit: 'entradas', conditions: ['Entradas del diario rápido', '10 entradas'], pointType: 'cultura', item: null },
};

module.exports = { catalog };
