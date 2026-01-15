const { ObjectId } = require("mongodb");
const { getCollection } = require("../config/db");

function booksCol() {
  return getCollection("books");
}

async function createBook(doc) {
  const result = await booksCol().insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

async function listBooks() {
  return booksCol()
    .find({ isActive: { $ne: false } })
    .sort({ createdAt: -1 })
    .project({
      title: 1,
      author: 1,
      description: 1,
      tags: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .toArray();
}

async function getBookById(id) {
  if (!ObjectId.isValid(id)) return null;
  return booksCol().findOne(
    { _id: new ObjectId(id), isActive: { $ne: false } },
    {
      projection: {
        title: 1,
        author: 1,
        description: 1,
        tags: 1,
        createdAt: 1,
        updatedAt: 1,
        pdfPath: 1, // keep if needed
      },
    }
  );
}

module.exports = { createBook, listBooks, getBookById };
