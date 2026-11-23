// Cliente de Prisma FALSO para pruebas: imita, en memoria, las operaciones de Prisma
// que usan los repositorios (findUnique, findFirst, findMany, count, create, createMany,
// upsert, update, updateMany, delete, deleteMany, $transaction). Permite probar los repositorios Prisma
// sin conexión a MongoDB Atlas. Imita también los errores de Prisma:
// P2002 (único repetido) y P2025 (no existe).
//
// Filtros soportados en "where": igualdad, { equals, mode: 'insensitive' }, { in },
// { not }, { gt, gte, lt, lte }, AND/OR y llaves compuestas de @@unique (userId_dayStart).
// Cualquier colección se crea al usarla (db.loQueSea); las de abajo traen sus índices únicos.

let contador = 0;
const nuevoId = () => (++contador).toString(16).padStart(24, '0'); // 24 hexadecimales únicos, como un ObjectId

const UNICOS = {
  user: [['email']],
  moodLog: [['userId', 'dayStart']],
  journalEntry: [['moodLogId']],
  playerProfile: [['userId']],
  economyVersion: [['version']],
  catalogCategory: [['name', 'type']],
  device: [['fcmToken']],
  challengeParticipant: [['challengeId', 'userId']],
  challengeContribution: [['challengeId', 'activityType', 'activityId']],
  inventoryEntry: [['userId', 'catalogItemId']],
  friendship: [['pairKey']],
};

// Valores @default del esquema (prisma/schema.prisma) que Prisma pone al crear
const DEFAULTS = {
  user: { role: 'PLAYER', status: 'ACTIVE' },
  playerProfile: { level: 1, xp: 0, hp: 100, moodReminderEnabled: true, moodReminderTime: '20:00', moodVisibleToViewers: true },
  device: { active: true },
  habit: { frequency: 'DAILY', active: true },
  habitCheckIn: { xpAwarded: 0, pointsAwarded: 0, penaltyApplied: 0 },
  mission: { status: 'PENDING', xpAwarded: 0, pointsAwarded: 0 },
  focusSession: { status: 'RUNNING', xpAwarded: 0, pointsAwarded: 0 },
  moodLog: { factors: [] },
  journalEntry: { shared: false },
  friendship: { status: 'PENDING' },
  groupChallenge: { currentValue: 0, status: 'ACTIVE' },
  challengeParticipant: { status: 'INVITED', contribution: 0 },
  challengeContribution: { value: 1 },
  catalogCategory: { active: true },
  catalogItem: { price: 0, giftable: false, custom: false, tags: [], active: true },
  inventoryEntry: { quantity: 1, equipped: false, source: 'PURCHASE' },
  pushCampaign: { recipientCount: 0, status: 'QUEUED' },
};

const errorPrisma = (code) => Object.assign(new Error(`Prisma ${code}`), { code });
const copia = (row) => (row ? structuredClone(row) : row);
const igual = (a, b) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
const esFiltro = (c) => c && typeof c === 'object' && !(c instanceof Date) && !Array.isArray(c);
const OPERADORES = ['equals', 'mode', 'in', 'not', 'gt', 'gte', 'lt', 'lte'];

function cumpleCampo(value, cond) {
  if (!esFiltro(cond)) return igual(value, cond);
  const insensible = cond.mode === 'insensitive';
  const norm = (v) => (insensible && typeof v === 'string' ? v.toLowerCase() : v);
  if ('equals' in cond && !igual(norm(value), norm(cond.equals))) return false;
  if ('in' in cond && !cond.in.some((v) => igual(norm(value), norm(v)))) return false;
  if ('not' in cond && igual(value, cond.not)) return false;
  if ('gt' in cond && !(value > cond.gt)) return false;
  if ('gte' in cond && !(value >= cond.gte)) return false;
  if ('lt' in cond && !(value < cond.lt)) return false;
  if ('lte' in cond && !(value <= cond.lte)) return false;
  return true;
}

function cumple(row, where = {}) {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'AND') return cond.every((w) => cumple(row, w));
    if (key === 'OR') return cond.some((w) => cumple(row, w));
    // Llave compuesta de @@unique: { userId_dayStart: { userId, dayStart } }
    if (esFiltro(cond) && !Object.keys(cond).every((k) => OPERADORES.includes(k))) return cumple(row, cond);
    return cumpleCampo(row[key], cond);
  });
}

const ordenar = (rows, orderBy) => {
  if (!orderBy) return rows;
  const criterios = (Array.isArray(orderBy) ? orderBy : [orderBy]).map((o) => Object.entries(o)[0]);
  return [...rows].sort((a, b) => {
    for (const [field, dir] of criterios) {
      const d = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
      if (d) return dir === 'desc' ? -d : d;
    }
    return 0;
  });
};

const elegir = (row, select) => (row && select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : row);

const aplicar = (row, data) => {
  for (const [key, value] of Object.entries(data)) {
    row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value;
  }
  row.updatedAt = new Date();
};

function coleccion(unicos = [], defaults = {}) {
  const rows = [];
  const repetido = (data, except) =>
    unicos.some((campos) => rows.some((r) => r !== except && campos.every((c) => data[c] != null && igual(r[c], data[c]))));

  const crear = (data) => {
    if (repetido(data)) throw errorPrisma('P2002');
    const row = { id: nuevoId(), createdAt: new Date(), ...structuredClone(defaults), ...data, updatedAt: new Date() };
    rows.push(row);
    return row;
  };

  return {
    rows,
    findUnique: async ({ where, select }) => copia(elegir(rows.find((r) => cumple(r, where)) ?? null, select)),
    findFirst: async ({ where, orderBy, select } = {}) =>
      copia(elegir(ordenar(rows.filter((r) => cumple(r, where)), orderBy)[0] ?? null, select)),
    findMany: async ({ where, orderBy, take, select } = {}) =>
      ordenar(rows.filter((r) => cumple(r, where)), orderBy)
        .slice(0, take ?? Infinity)
        .map((r) => copia(elegir(r, select))),
    count: async ({ where } = {}) => rows.filter((r) => cumple(r, where)).length,
    create: async ({ data }) => copia(crear(data)),
    // Como en MongoDB: inserta en orden y se detiene en el primer único repetido
    createMany: async ({ data }) => {
      data.forEach((d) => crear(d));
      return { count: data.length };
    },
    upsert: async ({ where, create, update }) => {
      const row = rows.find((r) => cumple(r, where));
      if (!row) return copia(crear(create));
      aplicar(row, update);
      return copia(row);
    },
    update: async ({ where, data }) => {
      const row = rows.find((r) => cumple(r, where));
      if (!row) throw errorPrisma('P2025');
      if (repetido({ ...row, ...data }, row)) throw errorPrisma('P2002');
      aplicar(row, data);
      return copia(row);
    },
    updateMany: async ({ where, data }) => {
      const found = rows.filter((r) => cumple(r, where));
      found.forEach((r) => aplicar(r, data));
      return { count: found.length };
    },
    delete: async ({ where }) => {
      const i = rows.findIndex((r) => cumple(r, where));
      if (i < 0) throw errorPrisma('P2025');
      return copia(rows.splice(i, 1)[0]);
    },
    deleteMany: async ({ where }) => {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) if (cumple(rows[i], where)) rows.splice(i, 1);
      return { count: before - rows.length };
    },
  };
}

function crearPrismaFalso() {
  const colecciones = {};
  const db = new Proxy(
    // $transaction acepta una lista de operaciones o una función (transacción interactiva)
    { $transaction: (arg) => (typeof arg === 'function' ? arg(db) : Promise.all(arg)) },
    {
      get(target, name) {
        if (name in target) return target[name];
        if (typeof name !== 'string' || name === 'then') return undefined;
        colecciones[name] ??= coleccion(UNICOS[name], DEFAULTS[name]);
        return colecciones[name];
      },
    },
  );

  // include: { journalEntry } del registro de ánimo (relación 1 a 1 por moodLogId)
  const findUnique = db.moodLog.findUnique;
  db.moodLog.findUnique = async (args) => {
    const log = await findUnique(args);
    if (log && args.include?.journalEntry) {
      log.journalEntry = copia(db.journalEntry.rows.find((e) => e.moodLogId === log.id) ?? null);
    }
    return log;
  };

  return db;
}

module.exports = { crearPrismaFalso, nuevoId };
