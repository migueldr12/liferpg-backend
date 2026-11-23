// Conversión documento de MongoDB ↔ datos del M00.
// En la base, el animal y el color usan los mismos valores que ya lee el M01
// (PlayerProfile.species = CAT/DOG/... y mascotColor = GREEN/PURPLE/...).

const invert = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));

const PET_TO_DB = { gato: 'CAT', perro: 'DOG', dragon: 'DRAGON', hamster: 'HAMSTER', leon: 'LION' };
const COLOR_TO_DB = { verde: 'GREEN', morado: 'PURPLE', rojo: 'RED', azul: 'BLUE', naranja: 'ORANGE' };
const PET_FROM_DB = invert(PET_TO_DB);

const toUsuario = (user, profile) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  firebaseUid: user.firebaseUid ?? null,
  account: user.account
    ? {
        ...user.account,
        goals: user.account.goals ?? [],
        createdAt: new Date(user.account.createdAt).toISOString(),
      }
    : null,
  // Hay mascota cuando el perfil tiene animal (los perfiles viejos sin animal no cuentan)
  pet: profile?.species ? PET_FROM_DB[profile.species] ?? null : null,
  hasProfile: Boolean(profile),
});

const accountData = (account) => ({
  firstName: account.firstName,
  lastName: account.lastName,
  age: account.age,
  gender: account.gender,
  goals: account.goals,
  customGoal: account.customGoal,
  photoUrl: account.photoUrl,
  petColor: account.petColor,
  createdAt: new Date(account.createdAt),
});

module.exports = { PET_TO_DB, COLOR_TO_DB, PET_FROM_DB, toUsuario, accountData };
