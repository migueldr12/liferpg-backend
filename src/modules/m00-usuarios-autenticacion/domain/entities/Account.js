const { ValidationError } = require('../errors');

// Entidad: cuenta del juego (M00 · RDF001 agregarUsuario, RDF024 y RDF026 Mi perfil).
// La contraseña y el correo los maneja Firebase; aquí solo van los datos del juego.
// Mismas reglas que docs/API.md del móvil (modelo Account.ts).

const GENDERS = ['mujer', 'hombre', 'no_binario', 'prefiero_no_decir'];
const GOALS = ['lectura', 'ejercicio', 'enfoque', 'sueno', 'animo'];
const PETS = ['gato', 'perro', 'dragon', 'hamster', 'leon'];
const PET_COLORS = ['verde', 'morado', 'rojo', 'azul', 'naranja'];
const NAME_MAX = 40;
const CUSTOM_GOAL_MAX = 60;
const PHOTO_MAX = 2048;

const texto = (value, campo, max) => {
  const clean = typeof value === 'string' ? value.trim() : '';
  if (!clean) throw new ValidationError(`Escribe tu ${campo}.`);
  if (clean.length > max) throw new ValidationError(`Tu ${campo} no puede pasar de ${max} caracteres.`);
  return clean;
};

class Account {
  constructor({ firstName, lastName, age, gender, goals = [], customGoal = null, photoUrl = null, petColor = 'verde', createdAt }) {
    this.firstName = texto(firstName, 'nombre', NAME_MAX);
    this.lastName = texto(lastName, 'apellido', NAME_MAX);
    if (!Number.isInteger(age) || age < 1 || age > 120) throw new ValidationError('La edad debe ser un número entero de 1 a 120.');
    if (!GENDERS.includes(gender)) throw new ValidationError('Elige una opción de género.');
    if (!Array.isArray(goals) || goals.some((g) => !GOALS.includes(g))) throw new ValidationError('Hay una meta que no es válida.');
    const meta = typeof customGoal === 'string' ? customGoal.trim() : '';
    if (meta.length > CUSTOM_GOAL_MAX) throw new ValidationError(`Tu meta no puede pasar de ${CUSTOM_GOAL_MAX} caracteres.`);
    const metas = [...new Set(goals)];
    if (!metas.length && !meta) throw new ValidationError('Elige al menos una meta o escribe la tuya.');
    if (photoUrl !== null && (typeof photoUrl !== 'string' || photoUrl.length > PHOTO_MAX)) {
      throw new ValidationError('La foto de perfil no es válida.');
    }
    if (!PET_COLORS.includes(petColor)) throw new ValidationError('El color de la mascota no es válido.');

    this.age = age;
    this.gender = gender;
    this.goals = metas;
    this.customGoal = meta || null;
    this.photoUrl = photoUrl || null;
    this.petColor = petColor;
    this.createdAt = createdAt; // ISO 8601
  }
}

module.exports = { Account, GENDERS, GOALS, PETS, PET_COLORS };
