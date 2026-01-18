const { ObjectId } = require("mongodb");
const FavoritesRepo = require("../repositories/favorites_repo");
const { getCollection } = require("../config/db");

function booksCol() {
  return getCollection("books");
}

async function addToFavorites({ userId, bookId }) {
  if (!ObjectId.isValid(bookId)) throw new Error("Invalid book id");

  // (optional) book exists + active কিনা
  const book = await booksCol().findOne({
    _id: new ObjectId(bookId),
    isActive: { $ne: false },
  });
  if (!book) throw new Error("Book not found");

  return FavoritesRepo.addFavorite(userId, bookId);
}

async function removeFromFavorites({ userId, bookId }) {
  if (!ObjectId.isValid(bookId)) throw new Error("Invalid book id");
  return FavoritesRepo.removeFavorite(userId, bookId);
}

async function listMyFavoriteBooks({ userId }) {
  const favoritesCol = getCollection("favorites");
  const booksCol = getCollection("books");

  const uid = typeof userId === "string" ? new ObjectId(userId) : userId;

  // 1) get favorite bookIds
  const favs = await favoritesCol
    .find({ userId: uid })
    .sort({ createdAt: -1 })
    .project({ bookId: 1, _id: 0 })
    .toArray();

  const bookIds = favs.map((f) => f.bookId);
  if (bookIds.length === 0) return [];

  // 2) fetch books by ids
  const books = await booksCol
    .find({ _id: { $in: bookIds }, isActive: { $ne: false } })
    .project({
      title: 1,
      author: 1,
      description: 1,
      tags: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .toArray();

  return books;
}

module.exports = {
  addToFavorites,
  removeFromFavorites,
  listMyFavoriteBooks,
};
