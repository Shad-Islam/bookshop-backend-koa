const Router = require("@koa/router");
const path = require("path");
const fs = require("fs");
const multer = require("koa-multer");
const { ObjectId } = require("mongodb");

const { getCollection } = require("../config/db");
const requireAuth = require("../middleware/requireAuth");


const router = new Router({ prefix: "/api/books" });

// Ensure upload folder exists
const PDF_DIR = path.join(process.cwd(), "uploads", "books", "pdf");
fs.mkdirSync(PDF_DIR, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PDF_DIR),
  filename: (req, file, cb) => {
    const safeBase = (file.originalname || "book")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-_.]/g, "")
      .toLowerCase();

    const ext = path.extname(safeBase) || ".pdf";
    const nameWithoutExt = safeBase.replace(ext, "");
    cb(null, `${nameWithoutExt}-${Date.now()}${ext}`);
  },
});

// Accept only PDFs
function fileFilter(req, file, cb) {
  const isPdf =
    file.mimetype === "application/pdf" ||
    (file.originalname || "").toLowerCase().endsWith(".pdf");

  if (!isPdf) return cb(new Error("Only PDF files are allowed"), false);
  cb(null, true);
}

const upload = multer({ storage, fileFilter });

// POST /api/books (create book + upload pdf)
router.post("/", requireAuth, upload.single("pdf"), async (ctx) => {
  const { title, author, description, tags } = ctx.req.body || {};
  const file = ctx.req.file;

  if (!title) {
    ctx.status = 400;
    ctx.body = { message: "title is required" };
    return;
  }

  if (!file) {
    ctx.status = 400;
    ctx.body = { message: "pdf file is required (field name: pdf)" };
    return;
  }

  // store relative path in DB
  const relativePdfPath = path
    .join("uploads", "books", "pdf", file.filename)
    .replace(/\\/g, "/");

  const parsedTags = Array.isArray(tags)
    ? tags
    : typeof tags === "string" && tags.length
    ? tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const books = getCollection("books");
  const doc = {
    title: title.trim(),
    author: author?.trim() || null,
    description: description?.trim() || null,
    tags: parsedTags,
    pdfPath: relativePdfPath,
    coverPath: null,
    isActive: true,
    createdBy: new ObjectId(ctx.state.user.id),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await books.insertOne(doc);
  const book = { _id: result.insertedId, ...doc };

  ctx.status = 201;
  ctx.body = {
    message: "Book created successfully",
    book: {
      id: book._id,
      title: book.title,
      author: book.author,
      description: book.description,
      tags: book.tags,
      createdAt: book.createdAt,
    },
  };
});

// GET /api/books (list books - meta only)
router.get("/", async (ctx) => {
  const booksCol = getCollection("books");

  const books = await booksCol
    .find({ isActive: { $ne: false } })
    .sort({ createdAt: -1 })
    .project({
      title: 1,
      author: 1,
      description: 1,
      coverPath: 1,
      tags: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .toArray();

  ctx.body = { books };
});

// GET /api/books/:id (single book meta)
router.get("/:id", async (ctx) => {
  const booksCol = getCollection("books");

  let book;
  try {
    book = await booksCol.findOne(
      { _id: new ObjectId(ctx.params.id), isActive: { $ne: false } },
      {
        projection: {
          title: 1,
          author: 1,
          description: 1,
          coverPath: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );
  } catch {
    ctx.status = 400;
    ctx.body = { message: "Invalid book id" };
    return;
  }

  if (!book) {
    ctx.status = 404;
    ctx.body = { message: "Book not found" };
    return;
  }

  ctx.body = { book };
});

module.exports = router;
