const { getCollection } = require("./db");

async function ensureIndexes() {
  // users collection
  const usersCollection = getCollection("users");
  // unique index on email field
  await usersCollection.createIndex(
    { email: 1 },
    { unique: true, sparse: true }
  );
  //   unique Oauth ids
  await usersCollection.createIndex(
    { googleId: 1 },
    { unique: true, sparse: true }
  );
  await usersCollection.createIndex(
    { facebookId: 1 },
    { unique: true, sparse: true }
  );
  // authlinks collection

  const authLinks = getCollection("authlinks");

  await authLinks.createIndex(
    { provider: 1, providerId: 1 },
    { unique: true, sparse: true }
  );
  await authLinks.createIndex({ userId: 1, provider: 1 }, { unique: true });

  //   book collection
  const books = getCollection("books");

  await books.createIndex({ title: 1 });
  await books.createIndex({ createdAt: -1 });
  await books.createIndex({ isActive: 1 });

  // favorites collection
  const favorites = getCollection("favorites");
  await favorites.createIndex({ userId: 1, bookId: 1 }, { unique: true });
  await favorites.createIndex({ userId: 1, createdAt: -1 });
  console.log("✅ Indexes ensured");
}

module.exports = {
  ensureIndexes,
};
