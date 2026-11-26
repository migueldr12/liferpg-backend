const MAX_PARTY_SIZE = 30;

class VinculacionEntity {
  constructor({
    id,
    requesterId,
    addresseeId,
    pairKey,
    status = 'ACCEPTED',
    acceptedAt = null,
    createdAt = null,
  }) {
    this.id = id;
    this.requesterId = requesterId;
    this.addresseeId = addresseeId;
    this.pairKey = pairKey;
    this.status = status;
    this.acceptedAt = acceptedAt ? new Date(acceptedAt) : null;
    this.createdAt = createdAt ? new Date(createdAt) : null;
  }

  static buildPairKey(userA, userB) {
    return [String(userA), String(userB)].sort().join(':');
  }

  isAccepted() {
    return this.status === 'ACCEPTED';
  }
}

module.exports = { VinculacionEntity, MAX_PARTY_SIZE };