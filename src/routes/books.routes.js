const Router = require("@koa/router");
const path = require("path");
const fs = require("fs");
const multer = require("koa-multer");

const Book = require("../models/book.model");
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

  const book = await Book.create({
    title: title.trim(),
    author: author?.trim() || null,
    description: description?.trim() || null,
    tags: parsedTags,
    pdfPath: relativePdfPath,
    createdBy: ctx.state.user.id,
    // isActive will be true by default from schema
  });

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
  // This includes old docs where isActive doesn't exist yet,
  // but excludes isActive:false
  const books = await Book.find({ isActive: { $ne: false } })
    .sort({ createdAt: -1 })
    .select("title author description coverPath tags createdAt updatedAt");

  ctx.body = { books };
});

// GET /api/books/:id (single book meta)
router.get("/:id", async (ctx) => {
  const book = await Book.findById(ctx.params.id).select(
    "title author description coverPath tags createdAt updatedAt"
  );

  if (!book) {
    ctx.status = 404;
    ctx.body = { message: "Book not found" };
    return;
  }

  ctx.body = { book };
});

module.exports = router;
