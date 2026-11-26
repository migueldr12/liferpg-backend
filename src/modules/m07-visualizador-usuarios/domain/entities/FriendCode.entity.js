class FriendCodeEntity {
  constructor({
    id,
    userId,
    code,
    maxUses = 1,
    uses = 0,
    expiresAt,
    revokedAt = null,
    createdAt = null,
  }) {
    this.id = id;
    this.userId = userId;
    this.code = code;
    this.maxUses = maxUses;
    this.uses = uses;
    this.expiresAt = new Date(expiresAt);
    this.revokedAt = revokedAt ? new Date(revokedAt) : null;
    this.createdAt = createdAt ? new Date(createdAt) : null;
  }

  getStatus(now = new Date()) {
    if (this.revokedAt) return 'Revocado';
    if (this.expiresAt <= now) return 'Expirado';
    if (this.uses >= this.maxUses) return 'Expirado';
    return 'Vigente';
  }

  canBeRedeemed(now = new Date()) {
    return this.getStatus(now) === 'Vigente';
  }
}

module.exports = { FriendCodeEntity };