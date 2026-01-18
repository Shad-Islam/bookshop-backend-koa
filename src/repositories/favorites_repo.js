const { ObjectId } = require("mongodb");
const { getCollection } = require("../config/db");

function col() {
  return getCollection("favorites");
}

function toObjectId(id) {
  return typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : id;
}

// Add favorite (duplicate avoid)
async function addFavorite(userId, bookId) {
  const now = new Date();

  const doc = {
    userId: toObjectId(userId),
    bookId: toObjectId(bookId),
    createdAt: now,
  };

  // upsert: same userId+bookId হলে নতুন doc হবে না
  await col().updateOne(
    { userId: doc.userId, bookId: doc.bookId },
    { $setOnInsert: doc },
    { upsert: true }
  );

  return col().findOne({ userId: doc.userId, bookId: doc.bookId });
}

async function removeFavorite(userId, bookId) {
  const res = await col().deleteOne({
    userId: toObjectId(userId),
    bookId: toObjectId(bookId),
  });
  return res.deletedCount > 0;
}

async function listFavoritesByUser(userId) {
  return col()
    .find({ userId: toObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();
}

module.exports = {
  addFavorite,
  removeFavorite,
  listFavoritesByUser,
};