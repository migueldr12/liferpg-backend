// Contrato de datos del M00: QUÉ operaciones existen, no CÓMO se hacen.
// Implementación real: infrastructure/repositories/PrismaUsuarioRepository.js (MongoDB).
//
// Un "usuario" del repositorio es: { id, email, displayName, firebaseUid, account, pet }
//   account: datos de la cuenta del juego (Account) o null si no ha llenado "Crear cuenta"
//   pet:     animal elegido ('gato', 'perro'...) o null

/* eslint-disable no-unused-vars */
const noImplementado = () => {
  throw new Error('No implementado');
};

class UsuarioRepository {
  async findById(userId) { noImplementado(); }
  async findByFirebaseUid(uid) { noImplementado(); }
  async findByEmail(email) { noImplementado(); }
  async linkFirebaseUid(userId, uid) { noImplementado(); }
  async createFromFirebase({ uid, email, displayName }) { noImplementado(); }
  async saveAccount(userId, account) { noImplementado(); } // también actualiza displayName
  // Crea el perfil del jugador (mascota) o le pone el animal si ya existía
  async savePet(userId, { pet, alias, mascotName, petColor }) { noImplementado(); }
}

module.exports = { UsuarioRepository };
