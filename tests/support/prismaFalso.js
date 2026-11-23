// Cliente de Prisma FALSO para pruebas: imita, en memoria, las operaciones de Prisma
// que usan los repositorios (findUnique, findMany, create, update, updateMany...).
// Permite probar los repositorios Prisma sin conexión a MongoDB Atlas.
// Imita también los errores de Prisma: P2002 (único repetido) y P2025 (no existe).

let contador = 0;
const nuevoId = () => (++contador).toString(16).padStart(24, 'a'); // 24 hexadecimales, como un ObjectId

const errorPrisma = (code) => Object.assign(new Error(`Prisma ${code}`), { code });
const copia = (row) => (row ? structuredClone(row) : row);
const igual = (a, b) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);

// ¿El documento cumple el "where"? Soporta igualdad, { gte, lte, in } y llaves compuestas (userId_dayStart)
function cumple(row, where = {}) {
  return Object.entries(where).every(([key, cond]) => {
    if (key.includes('_') && cond && typeof cond === 'object' && !(cond instanceof Date) && !('in' in cond)) {
      return cumple(row, cond); // llave compuesta de @@unique
    }
    const value = row[key];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond && !cond.in.some((v) => igual(value, v))) return false;
      if ('gte' in cond && value < cond.gte) return false;
      if ('lte' in cond && value > cond.lte) return false;
      return true;
    }
    return igual(value, cond);
  });
}

const ordenar = (rows, orderBy) => {
  if (!orderBy) return rows;
  const [[field, dir]] = Object.entries(orderBy);
  return [...rows].sort((a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
};

const elegir = (row, select) => (row && select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : row);

const aplicar = (row, data) => {
  for (const [key, value] of Object.entries(data)) {
    row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value;
  }
  row.updatedAt = new Date();
};

function coleccion(unicos = []) {
  const rows = [];
  const repetido = (data, except) =>
    unicos.some((campos) => rows.some((r) => r !== except && campos.every((c) => data[c] != null && igual(r[c], data[c]))));

  return {
    rows,
    findUnique: async ({ where, select }) => copia(elegir(rows.find((r) => cumple(r, where)) ?? null, select)),
    findFirst: async ({ where }) => copia(rows.find((r) => cumple(r, where)) ?? null),
    findMany: async ({ where, orderBy } = {}) => ordenar(rows.filter((r) => cumple(r, where)), orderBy).map(copia),
    create: async ({ data }) => {
      if (repetido(data)) throw errorPrisma('P2002');
      const row = { id: nuevoId(), createdAt: new Date(), ...data, updatedAt: new Date() };
      rows.push(row);
      return copia(row);
    },
    update: async ({ where, data }) => {
      const row = rows.find((r) => cumple(r, where));
      if (!row) throw errorPrisma('P2025');
      aplicar(row, data);
      return copia(row);
    },
    updateMany: async ({ where, data }) => {
      const found = rows.filter((r) => cumple(r, where));
      found.forEach((r) => aplicar(r, data));
      return { count: found.length };
    },
    deleteMany: async ({ where }) => {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) if (cumple(rows[i], where)) rows.splice(i, 1);
      return { count: before - rows.length };
    },
  };
}

function crearPrismaFalso() {
  const db = {
    moodLog: coleccion([['userId', 'dayStart']]),
    journalEntry: coleccion([['moodLogId']]),
    playerProfile: coleccion([['userId']]),
    $transaction: (operaciones) => Promise.all(operaciones),
  };

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
