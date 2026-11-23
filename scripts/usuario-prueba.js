// Imprime el _id de un usuario con perfil de jugador para probar la API con la base real:
//   curl -H "x-user-id: <_id>" http://localhost:3000/api/v1/animo/hoy
// Si la base no tiene ninguno, crea el usuario de prueba prueba@liferpg.mx con su perfil.
// En el .env del backend puede ir como DEV_USER_ID y en el del móvil como EXPO_PUBLIC_DEV_USER_ID.
// PROVISIONAL: se quita cuando el inicio de sesión (M00) identifique al usuario.

const { getPrisma, disconnect } = require('../src/shared/infrastructure/database/prisma');

const EMAIL = 'prueba@liferpg.mx';

async function main() {
  const db = getPrisma();
  let profile = await db.playerProfile.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!profile) {
    const user = await db.user.upsert({
      where: { email: EMAIL },
      update: {},
      create: { email: EMAIL, passwordHash: 'sin-acceso', displayName: 'Usuario de prueba' },
    });
    profile = await db.playerProfile.create({
      data: { userId: user.id, alias: 'Prueba', mascotName: 'Firulais', mascotColor: '#7C5CFF' },
    });
    console.log(`Se creó el usuario de prueba ${EMAIL}.`);
  }

  console.log(`x-user-id: ${profile.userId}  (alias: ${profile.alias})`);
}

main()
  .catch((err) => {
    console.error('No se pudo leer la base. Revisa DATABASE_URL y el acceso de red de Atlas.', err.code || err.message);
    process.exitCode = 1;
  })
  .finally(disconnect);
