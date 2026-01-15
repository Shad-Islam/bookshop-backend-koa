const path = require("path");
const { now } = require("../utils/time");
const { parseTags } = require("../utils/normalize");
const BooksRepo = require("../repositories/book_repo");

async function createBook({ userId, body, file }) {
  const { title, author, description, tags } = body || {};
  if (!title) throw new Error("title is required");
  if (!file) throw new Error("pdf file is required (field name: pdf)");

  const relativePdfPath = path
    .join("uploads", "books", "pdf", file.filename)
    .replace(/\\/g, "/");

  const doc = {
    title: title.trim(),
    author: author?.trim() || null,
    description: description?.trim() || null,
    tags: parseTags(tags),
    pdfPath: relativePdfPath,
    createdBy: userId,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  };

  return BooksRepo.createBook(doc);
}

module.exports = { createBook };
