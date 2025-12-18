const Router = require("@koa/router");

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

const authRoutes = require("./auth.routes");
router.use(authRoutes.routes()).use(authRoutes.allowedMethods());

module.exports = router;
