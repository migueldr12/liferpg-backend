// Imprime el _id de un administrador para probar la PWA Admin (M14) con la base real:
//   curl -H "x-user-id: <_id>" http://localhost:3000/api/v1/economia/curva
// Si la base no tiene ninguno, crea el administrador de prueba admin@liferpg.mx.
// En el .env de la PWA va como VITE_DEV_USER_ID.
// PROVISIONAL: se quita cuando el inicio de sesión (M00) identifique al usuario.

const { getPrisma, disconnect } = require('../src/shared/infrastructure/database/prisma');

const EMAIL = 'admin@liferpg.mx';

async function main() {
  const db = getPrisma();
  let admin = await db.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });

  if (!admin) {
    admin = await db.user.upsert({
      where: { email: EMAIL },
      update: { role: 'ADMIN', status: 'ACTIVE' },
      create: { email: EMAIL, passwordHash: 'sin-acceso', displayName: 'Administrador de prueba', role: 'ADMIN' },
    });
    console.log(`Se creó el administrador de prueba ${EMAIL}.`);
  }

  console.log(`x-user-id: ${admin.id}  (${admin.displayName})`);
}

main()
  .catch((err) => {
    console.error('No se pudo leer la base. Revisa DATABASE_URL y el acceso de red de Atlas.', err.code || err.message);
    process.exitCode = 1;
  })
  .finally(disconnect);
