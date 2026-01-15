const Router = require("@koa/router");
const passport = require("koa-passport");

const { signToken } = require("../utils/jwt");
const AuthService = require("../services/auth_service");

const router = new Router();

router.post("/auth/register", async (ctx) => {
  try {
    const { name, email, password } = ctx.request.body || {};

    const user = await AuthService.registerLocal({ name, email, password });

    ctx.status = 201;
    ctx.body = {
      message: "User registered successfully.",
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name || null,
        email: user.email || null,
        role: user.role || "user",
      },
    };
  } catch (err) {
    ctx.status = err.status || 400;
    ctx.body = { message: err.message || "Registration failed" };
  }
});

router.post("/auth/login", async (ctx, next) => {
  return passport.authenticate("local", async (err, user, info) => {
    if (err) ctx.throw(500, err.message);
    if (!user) ctx.throw(401, info?.message || "Invalid credentials");

    ctx.status = 200;
    ctx.body = {
      message: "Login successful.",
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name || null,
        email: user.email || null,
        role: user.role || "user",
      },
    };
  })(ctx, next);
});

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/oauth2/redirect/google",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/failed",
  }),
  async (ctx) => {
    const user = ctx.state.user;

    ctx.body = {
      message: "Google login successful.",
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name || null,
        email: user.email || null,
        role: user.role || "user",
      },
    };
  }
);

router.get(
  "/auth/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
    authType: "rerequest",
  })
);

router.get(
  "/oauth2/redirect/facebook",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: "/auth/failed",
  }),
  async (ctx) => {
    const user = ctx.state.user;

    ctx.body = {
      message: "Facebook login successful.",
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name || null,
        email: user.email || null,
        role: user.role || "user",
      },
    };
  }
);

// optional fail route
router.get("/auth/failed", (ctx) => {
  ctx.status = 401;
  ctx.body = { message: "Authentication failed" };
});

module.exports = router;
