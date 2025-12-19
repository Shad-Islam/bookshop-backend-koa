const bcrypt = require("bcrypt");
const passport = require("koa-passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/user.model");

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

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
        const email = profile.emails?.[0]?.value?.toLowerCase() || null;

        // 1) already linked by googleId
        let user = await User.findOne({ googleId });

        // 2) if not, try link by email
        if (!user && email) user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            provider: "google",
            googleId,
            email,
            name: profile.displayName || null,
            photo: profile.photos?.[0]?.value || null,
          });
        } else if (!user.googleId) {
          user.googleId = googleId;
          if (!user.photo)
            user.photo = profile.photos?.[0]?.value || user.photo;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
