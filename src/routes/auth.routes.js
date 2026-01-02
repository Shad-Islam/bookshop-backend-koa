const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Router = require("@koa/router");
const passport = require("koa-passport");

const User = require("../models/user.model");
const AuthLink = require("../models/authLink.model");

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

  let user = await User.findOne({ email: normalizedEmail });

  // If user doesn't exist, create it as local-first user
  if (!user) {
    user = await User.create({
      name: name || null,
      email: normalizedEmail,
      primaryProvider: "local",
      primaryProviderId: normalizedEmail,
    });
  } else {
    // If user exists from OAuth, optionally fill name if empty
    if (!user.name && name) {
      user.name = name;
      await user.save();
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let link = await AuthLink.findOne({ userId: user._id });
  if (!link) link = await AuthLink.create({ userId: user._id, accounts: {} });

  if (!link.accounts) link.accounts = {};
  if (!link.accounts.local) link.accounts.local = {};

  link.accounts.local.email = normalizedEmail;
  link.accounts.local.passwordHash = passwordHash;
  link.accounts.local.linkedAt = new Date();

  await link.save();

  ctx.status = 201;
  ctx.body = {
    message: "User registered successfully.",
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
});

/* POST /auth/login */
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

// Facebook OAuth start (request email permission)
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
