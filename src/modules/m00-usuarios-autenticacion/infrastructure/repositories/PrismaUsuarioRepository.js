const { UsuarioRepository } = require('../../domain/repositories/UsuarioRepository');
const { PET_TO_DB, COLOR_TO_DB, toUsuario, accountData } = require('../mappers/usuarioMapper');

// Usuarios en MongoDB: users (correo, uid de Firebase y cuenta del juego) y
// player_profiles (mascota, la crea el M00 al elegir el animal y la usa el M01).

const OBJECT_ID = /^[a-f\d]{24}$/i;

class PrismaUsuarioRepository extends UsuarioRepository {
  /** @param {{ db: import('@prisma/client').PrismaClient | (() => import('@prisma/client').PrismaClient) }} options */
  constructor({ db }) {
    super();
    this.cliente = typeof db === 'function' ? db : () => db;
  }

  /** @returns {import('@prisma/client').PrismaClient} */
  get db() {
    return this.cliente();
  }

  async conPerfil(user) {
    if (!user) return null;
    const profile = await this.db.playerProfile.findUnique({ where: { userId: user.id }, select: { species: true } });
    return toUsuario(user, profile);
  }

  async findById(userId) {
    if (!OBJECT_ID.test(userId ?? '')) return null;
    return this.conPerfil(await this.db.user.findUnique({ where: { id: userId } }));
  }

  async findByFirebaseUid(uid) {
    return this.conPerfil(await this.db.user.findFirst({ where: { firebaseUid: uid } }));
  }

  async findByEmail(email) {
    return this.conPerfil(await this.db.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }));
  }

  async linkFirebaseUid(userId, uid) {
    return this.conPerfil(await this.db.user.update({ where: { id: userId }, data: { firebaseUid: uid } }));
  }

  async createFromFirebase({ uid, email, displayName }) {
    return this.conPerfil(await this.db.user.create({ data: { email, displayName, firebaseUid: uid } }));
  }

  // Guarda la cuenta y, si ya tiene mascota, le pasa el color y la foto al perfil
  async saveAccount(userId, account) {
    await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        data: { account: accountData(account), displayName: `${account.firstName} ${account.lastName}` },
      }),
      this.db.playerProfile.updateMany({
        where: { userId },
        data: { mascotColor: COLOR_TO_DB[account.petColor], avatarUrl: account.photoUrl },
      }),
    ]);
    return this.findById(userId);
  }

  async savePet(userId, { pet, alias, mascotName, petColor, photoUrl = null }) {
    await this.db.playerProfile.upsert({
      where: { userId },
      create: { userId, alias, mascotName, mascotColor: COLOR_TO_DB[petColor], avatarUrl: photoUrl, species: PET_TO_DB[pet] },
      update: { species: PET_TO_DB[pet], mascotName, mascotColor: COLOR_TO_DB[petColor] },
    });
    return this.findById(userId);
  }
}

module.exports = { PrismaUsuarioRepository };
