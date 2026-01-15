const passport = require("koa-passport");
const bcrypt = require("bcrypt");

const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

const { ObjectId } = require("mongodb");
const UsersRepo = require("../repositories/user_repo");
const AuthService = require("../services/auth_service");

function normalizeEmail(email) {
  return (email || "").toString().trim().toLowerCase();
}

// -----------------
// Session support (optional)
// -----------------
passport.serializeUser((user, done) =>
  done(null, user?._id?.toString?.() || null)
);

passport.deserializeUser(async (id, done) => {
  try {
    if (!id || !ObjectId.isValid(id)) return done(null, null);
    const user = await UsersRepo.findById(new ObjectId(id));
    return done(null, user || null);
  } catch (err) {
    return done(err);
  }
});

// -----------------
// Local strategy (email + password)
// NOTE: Requires UsersRepo to expose one of these methods:
// - findByEmail(email)
// - findOne({ email })
// - findByFilter({ email })
// If your repo uses a different name, update the lookup block below.
// -----------------
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const normalizedEmail = normalizeEmail(email);

        let user = null;

        user = await UsersRepo.findByEmail(normalizedEmail);
        if (!user) return done(null, false, { message: "Invalid credentials" });

        // Support a couple of common field names
        const passwordHash = user.passwordHash || user.password_hash || null;
        if (!passwordHash)
          return done(null, false, { message: "Invalid credentials" });

        const ok = await bcrypt.compare(password || "", passwordHash);
        if (!ok) return done(null, false, { message: "Invalid credentials" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// -----------------
// Google OAuth
// -----------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await AuthService.upsertFromGoogle(profile);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// -----------------
// Facebook OAuth
// -----------------
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "displayName", "photos", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await AuthService.upsertFromFacebook(profile);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
