// DTOs de salida del M12: la forma exacta en la que responde la API
// (la que usa la PWA en src/modules/m12-retos-grupo/api/retosApi.js).

const persona = (p) => ({ id: p.id, name: p.name, fullName: p.fullName, avatar: p.avatar, color: p.color, level: p.level });

const desconocido = (id) => ({ id, name: 'Jugador', fullName: 'Jugador', avatar: '?', color: '#9c27b0', level: 1 });

// Reto con la aportación de cada participante, de mayor a menor (RDF120)
const toChallengeDto = (c, people) => ({
  id: c.id,
  title: c.title,
  type: c.type,
  metric: c.metric,
  unit: c.unit,
  goal: c.goal,
  deadline: c.deadline,
  status: c.status, // 'activo' | 'completado'
  reward: c.reward,
  invitedCount: c.invitedCount,
  participants: c.participants
    .map((p) => {
      const { id, name, avatar, color } = people.get(p.userId) ?? desconocido(p.userId);
      return { id, name, avatar, color, amount: p.amount };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'es')),
});

const toInvitationDto = (inv, people) => ({
  id: inv.id,
  from: inv.challenge.creatorId,
  fromPerson: persona(people.get(inv.challenge.creatorId) ?? desconocido(inv.challenge.creatorId)),
  challenge: toChallengeDto(inv.challenge, people),
});

const toRankingDto = (p) => ({ ...persona(p), points: p.points, isMe: p.isMe, position: p.position });

module.exports = { persona, toChallengeDto, toInvitationDto, toRankingDto };
