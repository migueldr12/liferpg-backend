const { Account, PETS } = require('../../domain/entities/Account');
const { ConflictError, NotFoundError, ValidationError } = require('../../domain/errors');

// Casos de uso del M00 (Usuarios y autenticación).
// deps: usuarioRepository, clock, allowUnverifiedLink.

// Nombre inicial de la mascota según el animal (se puede cambiar después en el M01)
const MASCOT_NAMES = { gato: 'Michi', perro: 'Firulais', dragon: 'Draco', hamster: 'Bolita', leon: 'Leo' };
const PROVEEDORES_CONFIABLES = ['google.com'];

function makeCuentaServices({ usuarioRepository, clock, allowUnverifiedLink = false }) {
  // RDF006 iniciarSesion (lado servidor): convierte el usuario de Firebase en el usuario de
  // la base. 1) ya ligado por uid; 2) existe con ese correo y no tiene uid → se liga;
  // 3) no existe → se crea. Ligar por correo exige correo verificado o Google (en
  // desarrollo se permite sin verificar para usar los usuarios de prueba de Atlas).
  async function identificarUsuarioFirebase(claims, intento = 0) {
    const ligado = await usuarioRepository.findByFirebaseUid(claims.uid);
    if (ligado) return ligado;

    const email = claims.email ?? `${claims.uid}@firebase.liferpg`;
    const existente = await usuarioRepository.findByEmail(email);
    if (existente) {
      if (existente.firebaseUid) throw new ConflictError('Ese correo ya está ligado a otra cuenta de inicio de sesión.');
      const confiable = claims.emailVerified || PROVEEDORES_CONFIABLES.includes(claims.provider) || allowUnverifiedLink;
      if (!confiable) throw new ConflictError('Verifica tu correo para ligarlo a la cuenta que ya existe con ese correo.');
      return usuarioRepository.linkFirebaseUid(existente.id, claims.uid);
    }

    try {
      return await usuarioRepository.createFromFirebase({
        uid: claims.uid,
        email,
        displayName: claims.name || email.split('@')[0],
      });
    } catch (err) {
      // Dos peticiones del mismo usuario nuevo al mismo tiempo: la segunda lo encuentra ya creado
      if (err.code === 'P2002' && intento === 0) return identificarUsuarioFirebase(claims, 1);
      throw err;
    }
  }

  async function usuarioConCuenta(userId) {
    const user = await usuarioRepository.findById(userId);
    if (!user) throw new NotFoundError('El usuario no existe.');
    if (!user.account) throw new NotFoundError('Todavía no creas tu cuenta.');
    return user;
  }

  // GET /usuarios/me/cuenta — 404 si aún no llena "Crear cuenta" (la app lo lleva ahí)
  async function consultarCuenta(userId) {
    return usuarioConCuenta(userId);
  }

  // RDF001 · agregarUsuario: datos de "Crear cuenta"; la mascota se elige después
  async function crearCuenta(userId, input) {
    const user = await usuarioRepository.findById(userId);
    if (!user) throw new NotFoundError('El usuario no existe.');
    if (user.account) throw new ConflictError('Tu cuenta ya existe.');
    const account = new Account({ ...input, photoUrl: null, petColor: 'verde', createdAt: clock().toISOString() });
    return usuarioRepository.saveAccount(userId, account);
  }

  // RDF024 y RDF026 · Mi perfil: nombre, edad, género, metas, foto y color de la mascota
  async function actualizarCuenta(userId, changes) {
    const user = await usuarioConCuenta(userId);
    const campos = ['firstName', 'lastName', 'age', 'gender', 'goals', 'customGoal', 'photoUrl', 'petColor'];
    const permitidos = Object.fromEntries(campos.filter((c) => changes[c] !== undefined).map((c) => [c, changes[c]]));
    const account = new Account({ ...user.account, ...permitidos });
    return usuarioRepository.saveAccount(userId, account);
  }

  // "Bienvenido a Life-RPG": elige su animal una sola vez y nace su Tamagotchi (perfil del jugador)
  async function elegirMascota(userId, pet) {
    if (!PETS.includes(pet)) throw new ValidationError('Elige gato, perro, dragon, hamster o leon.');
    const user = await usuarioConCuenta(userId);
    if (user.pet) throw new ValidationError('Ya elegiste tu mascota.');
    return usuarioRepository.savePet(userId, {
      pet,
      alias: user.account.firstName,
      mascotName: MASCOT_NAMES[pet],
      petColor: user.account.petColor,
      photoUrl: user.account.photoUrl,
    });
  }

  return { identificarUsuarioFirebase, consultarCuenta, crearCuenta, actualizarCuenta, elegirMascota };
}

module.exports = { makeCuentaServices, MASCOT_NAMES };
