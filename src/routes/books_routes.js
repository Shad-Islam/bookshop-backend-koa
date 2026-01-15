const Router = require("@koa/router");
const path = require("path");
const fs = require("fs");
const multer = require("koa-multer");

const requireAuth = require("../middleware/requireAuth");
const BooksRepo = require("../repositories/book_repo");
const BooksService = require("../services/books_service");

const router = new Router({ prefix: "/api/books" });

const PDF_DIR = path.join(process.cwd(), "uploads", "books", "pdf");
fs.mkdirSync(PDF_DIR, { recursive: true });

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

function fileFilter(req, file, cb) {
  const isPdf =
    file.mimetype === "application/pdf" ||
    (file.originalname || "").toLowerCase().endsWith(".pdf");

  if (!isPdf) return cb(new Error("Only PDF files are allowed"), false);
  cb(null, true);
}

const upload = multer({ storage, fileFilter });

router.post("/", requireAuth, upload.single("pdf"), async (ctx) => {
  try {
    const book = await BooksService.createBook({
      userId: ctx.state.user.id,
      body: ctx.req.body,
      file: ctx.req.file,
    });

    ctx.status = 201;
    ctx.body = {
      message: "Book created successfully",
      book: {
        id: book._id,
        title: book.title,
        author: book.author,
        description: book.description,
        pdfPath: book.pdfPath,
        createdAt: book.createdAt,
      },
    };
  } catch (e) {
    ctx.status = 400;
    ctx.body = { message: e.message };
  }
});

router.get("/", async (ctx) => {
  const books = await BooksRepo.listBooks();
  ctx.body = { books };
});

router.get("/:id", async (ctx) => {
  const book = await BooksRepo.getBookById(ctx.params.id);
  if (!book) {
    ctx.status = 404;
    ctx.body = { message: "Book not found" };
    return;
  }
  ctx.body = { book };
});

module.exports = router;
