// DTO de salida del M00: la cuenta tal como la espera la app (models/Account.ts).
// "id" es el uid de Firebase cuando ya inició sesión con Firebase (contrato de docs/API.md).

const toAccountDto = (user) => ({
  id: user.firebaseUid ?? user.id,
  email: user.email,
  firstName: user.account.firstName,
  lastName: user.account.lastName,
  age: user.account.age,
  gender: user.account.gender,
  goals: [...user.account.goals],
  customGoal: user.account.customGoal ?? null,
  pet: user.pet,
  photoUrl: user.account.photoUrl ?? null,
  petColor: user.account.petColor ?? 'verde',
  createdAt: user.account.createdAt,
});

module.exports = { toAccountDto };
