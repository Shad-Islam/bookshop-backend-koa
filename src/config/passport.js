const bcrypt = require("bcrypt");
const passport = require("koa-passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

const User = require("../models/user.model");

function normalizeEmail(value) {
  if (!value) return null;
  return String(value).toLowerCase().trim() || null;
}

function pickProfileEmail(profile) {
  // Google uses profile.emails; Facebook sometimes puts it in profile._json.email
  return normalizeEmail(
    profile?.emails?.[0]?.value ||
      profile?._json?.email ||
      profile?._json?.email_address ||
      null
  );
}

async function findOrLinkOAuthUser({
  provider,
  providerIdField,
  providerId,
  email,
  name,
  photo,
}) {
  // 1) already linked by provider id
  let user = await User.findOne({ [providerIdField]: providerId });

  // 2) if not, try link by email
  if (!user && email) {
    user = await User.findOne({ email });
  }

  if (!user) {
    // 3) create new user
    user = await User.create({
      provider,
      [providerIdField]: providerId,
      email,
      name: name || null,
      photo: photo || null,
    });
    return user;
  }

  // 4) update/link missing fields on existing user
  let changed = false;

  // link provider id (googleId/facebookId) into existing account
  if (!user[providerIdField]) {
    user[providerIdField] = providerId;
    changed = true;
  }

  // Fill email later if it was missing before
  if (!user.email && email) {
    user.email = email;
    changed = true;
  }

  // Fill missing name/photo
  if (!user.name && name) {
    user.name = name;
    changed = true;
  }

  if (!user.photo && photo) {
    user.photo = photo;
    changed = true;
  }

  // Keep original provider if it already exists (ex: local). If missing, set it.
  if (!user.provider && provider) {
    user.provider = provider;
    changed = true;
  }

  if (changed) await user.save();
  return user;
}

// Only needed for session support (OAuth later)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Local strategy: email + password
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const normalizedEmail = (email || "").toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return done(null, false, { message: "Invalid credentials" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = pickProfileEmail(profile);

        const user = await findOrLinkOAuthUser({
          provider: "google",
          providerIdField: "googleId",
          providerId: googleId,
          email,
          name: profile.displayName || null,
          photo: profile.photos?.[0]?.value || null,
        });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Facebook Strategy
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
        const facebookId = profile.id;
        const email = pickProfileEmail(profile);

        const user = await findOrLinkOAuthUser({
          provider: "facebook",
          providerIdField: "facebookId",
          providerId: facebookId,
          email,
          name: profile.displayName || null,
          photo: profile.photos?.[0]?.value || null,
        });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;