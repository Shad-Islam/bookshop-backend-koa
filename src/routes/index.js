const Router = require("@koa/router");
const booksRoutes = require("./books_routes");

const router = new Router();

router.get("/", (ctx) => {
  ctx.status = 200;
  ctx.body = { ok: true, message: "Welcome to the API" };
});

// Health check route
router.get("/health", (ctx) => {
  ctx.status = 200;
  ctx.body = { ok: true, message: "API is healthy" };
});

const authRoutes = require("./auth_routes");
router.use(authRoutes.routes()).use(authRoutes.allowedMethods());

router.use(booksRoutes.routes()).use(booksRoutes.allowedMethods());

module.exports = router;
