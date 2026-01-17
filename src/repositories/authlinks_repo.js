const { objectId } = require("mongodb");

const { now } = require("../utils/time");
const { getCollection } = require("../config/db");

function authLinksCol() {
  return getCollection("authlinks");
}

function toObjectId(id) {
  return typeof id === "string" && objectId.isValid(id) ? new objectId(id) : id;
}

async function findByProvider(provider, providerId) {
  return authLinksCol().findOne({ provider, providerId });
}

async function findByUserProvider(userId, provider) {
  const _userId = toObjectId(userId);
  return authLinksCol().findOne({ userId: _userId, provider });
}

async function listByUserId(userId) {
  return authLinksCol()
    .find({ userId: toObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();
}

async function upsertLink({
  userId,
  provider,
  providerId,
  email,
  photo,
  passwordHash,
}) {
  const filter = { userId: toObjectId(userId), provider };

  const $set = {
    providerId,
    email,
    photo,
    updatedAt: now(),
    linkedAt: now(),
  };

  if (provider === "local" && passwordHash) {
    $set.passwordHash = passwordHash;
  }

  const update = {
    $set,
    $setOnInsert: {
      userId: toObjectId(userId),
      provider,
      createdAt: now(),
    },
  };
  await authLinksCol().updateOne(filter, update, { upsert: true });
  return await authLinksCol().findOne(filter);
}

module.exports = {
  findByProvider,
  findByUserProvider,
  listByUserId,
  upsertLink,
};
