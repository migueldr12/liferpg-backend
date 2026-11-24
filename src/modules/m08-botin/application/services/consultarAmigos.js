const { personView, sortByName } = require('../../domain/entities/Botin');

// Amigos (amistades aceptadas del M07) para elegir a quién regalar o pedir
const consultarAmigos = ({ botinRepository }) => async (userId) => {
  const ids = await botinRepository.listFriendIds(userId);
  return sortByName((await botinRepository.findPeople(ids)).map(personView));
};

module.exports = { consultarAmigos };
