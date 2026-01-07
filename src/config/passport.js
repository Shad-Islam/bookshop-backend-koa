const bcrypt = require("bcrypt");
const passport = require("koa-passport");
const LocalStrategy = require("passport-local").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const { ObjectId } = require("mongodb");

const { getCollection } = require("./db");

function now() {
  return new Date();
}

function normalizeEmail(email) {
  return (email || "").toLowerCase().trim();
}

// for future session usage (even if session:false now)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const users = getCollection("users");
    const _id =
      typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : id;

    const user = await users.findOne({ _id });
    done(null, user || null);
  } catch (err) {
    done(err);
  }
});

// -------------------- LOCAL STRATEGY --------------------
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const users = getCollection("users");
        const normalizedEmail = normalizeEmail(email);

        const user = await users.findOne({ email: normalizedEmail });
        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid credentials" });
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          return done(null, false, { message: "Invalid credentials" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// -------------------- GOOGLE STRATEGY --------------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const users = getCollection("users");

        const googleId = profile.id;
        const email = normalizeEmail(profile.emails?.[0]?.value);
        const name = profile.displayName || null;
        const photo = profile.photos?.[0]?.value || null;

        let user = await users.findOne({ googleId });

        if (!user && email) {
          user = await users.findOne({ email });
        }

        if (!user) {
          const doc = {
            primaryProvider: "google",
            primaryProviderId: googleId,
            googleId,
            email: email || null,
            name,
            photo,
            role: "user",
            createdAt: now(),
            updatedAt: now(),
          };
          const result = await users.insertOne(doc);
          user = { _id: result.insertedId, ...doc };
        } else {
          const $set = { updatedAt: now() };

          if (!user.googleId) $set.googleId = googleId;
          if (!user.email && email) $set.email = email;
          if (!user.name && name) $set.name = name;
          if (!user.photo && photo) $set.photo = photo;

          if (Object.keys($set).length > 1) {
            await users.updateOne({ _id: user._id }, { $set });
            user = { ...user, ...$set };
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// -------------------- FACEBOOK STRATEGY --------------------
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
        const users = getCollection("users");

        const facebookId = profile.id;
        const email = normalizeEmail(profile.emails?.[0]?.value);
        const name = profile.displayName || null;
        const photo = profile.photos?.[0]?.value || null;

        let user = await users.findOne({ facebookId });

        if (!user && email) {
          user = await users.findOne({ email });
        }

        if (!user) {
          const doc = {
            primaryProvider: "facebook",
            primaryProviderId: facebookId,
            facebookId,
            email: email || null,
            name,
            photo,
            role: "user",
            createdAt: now(),
            updatedAt: now(),
          };
          const result = await users.insertOne(doc);
          user = { _id: result.insertedId, ...doc };
        } else {
          const $set = { updatedAt: now() };
          if (!user.email && email) $set.email = email;
          if (!user.name && name) $set.name = name;
          if (!user.photo && photo) $set.photo = photo;
          if (!user.facebookId) $set.facebookId = facebookId;

          if (Object.keys($set).length > 1) {
            await users.updateOne({ _id: user._id }, { $set });
            user = { ...user, ...$set };
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
