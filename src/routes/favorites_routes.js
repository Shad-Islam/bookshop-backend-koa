const Router = require("@koa/router");
const requireAuth = require("../middleware/requireAuth");
const FavoritesService = require("../services/favorites_service");

const router = new Router({ prefix: "/api/favorites" });

// ADD: POST /api/favorites/:bookId
router.post("/:bookId", requireAuth, async (ctx) => {
  try {
    const fav = await FavoritesService.addToFavorites({
      userId: ctx.state.user.id,
      bookId: ctx.params.bookId,
    });

    ctx.status = 201;
    ctx.body = { message: "Added to favorites", favorite: fav };
  } catch (e) {
    ctx.status = 400;
    ctx.body = { message: e.message };
  }
});

// DELETE: DELETE /api/favorites/:bookId
router.delete("/:bookId", requireAuth, async (ctx) => {
  try {
    const ok = await FavoritesService.removeFromFavorites({
      userId: ctx.state.user.id,
      bookId: ctx.params.bookId,
    });

    ctx.status = 200;
    ctx.body = { message: ok ? "Removed from favorites" : "Not found in favorites" };
  } catch (e) {
    ctx.status = 400;
    ctx.body = { message: e.message };
  }
});

// LIST: GET /api/favorites
router.get("/", requireAuth, async (ctx) => {
  const books = await FavoritesService.listMyFavoriteBooks({
    userId: ctx.state.user.id,
  });
  ctx.body = { books };
});

module.exports = router;