const Router = require("@koa/router");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("koa-passport");
const User = require("../models/user.model");

const router = new Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id?.toString?.() ?? user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

router.post("/auth/register", async (ctx) => {
  const { name, email, password } = ctx.request.body || {};

  if (!email || !password) {
    ctx.status = 400;
    ctx.body = { message: "Email and password are required." };
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    ctx.status = 409;
    ctx.body = { message: "Email is already registered." };
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    provider: "local",
    name: name || null,
    email: normalizedEmail,
    passwordHash,
  });

  ctx.status = 201;
  ctx.body = {
    message: "User registered successfully.",
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
});

/*POST /auth/login  */
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
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  })(ctx, next);
});

// Google OAuth start
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
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
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
);

// Facebook OAuth start
router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: "email", authType: "rerequest" })
);

// Facebook OAuth callback
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
        name: user.name,
        email: user.email,
        role: user.role,
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
