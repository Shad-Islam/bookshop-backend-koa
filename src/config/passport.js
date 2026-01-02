const bcrypt = require("bcrypt");
const passport = require("koa-passport");
const LocalStrategy = require("passport-local").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/user.model");
const AuthLink = require("../models/authLink.model");

// for future session usage (even if session:false now)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// helper: create/get auth link doc
async function getOrCreateAuthLink(userId) {
  let link = await AuthLink.findOne({ userId });
  if (!link) link = await AuthLink.create({ userId, accounts: {} });
  return link;
}

// helper: update missing fields in User + AuthLink
async function updateMissingProfile({ user, link, provider, email, name, photo, providerId }) {
  let changedUser = false;
  let changedLink = false;

  if (email && !user.email) {
    user.email = email;
    changedUser = true;
  }
  if (name && !user.name) {
    user.name = name;
    changedUser = true;
  }
  if (photo && !user.photo) {
    user.photo = photo;
    changedUser = true;
  }

  if (!link.accounts) link.accounts = {};
  if (!link.accounts[provider]) link.accounts[provider] = {};

  if (providerId && !link.accounts[provider].providerId) {
    link.accounts[provider].providerId = providerId;
    changedLink = true;
  }
  if (email && !link.accounts[provider].email) {
    link.accounts[provider].email = email;
    changedLink = true;
  }
  if (photo && !link.accounts[provider].photo) {
    link.accounts[provider].photo = photo;
    changedLink = true;
  }
  if (!link.accounts[provider].linkedAt) {
    link.accounts[provider].linkedAt = new Date();
    changedLink = true;
  }

  if (changedUser) await user.save();
  if (changedLink) await link.save();
}

// -------------------- LOCAL STRATEGY --------------------
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const normalizedEmail = (email || "").toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return done(null, false, { message: "Invalid credentials" });

        const link = await AuthLink.findOne({ userId: user._id });
        const hash = link?.accounts?.local?.passwordHash;

        if (!hash) return done(null, false, { message: "Invalid credentials" });

        const ok = await bcrypt.compare(password, hash);
        if (!ok) return done(null, false, { message: "Invalid credentials" });

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
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase() || null;
        const name = profile.displayName || null;
        const photo = profile.photos?.[0]?.value || null;

        // 1) find by linked googleId inside auth_links
        let link = await AuthLink.findOne({ "accounts.google.providerId": googleId });

        let user = null;

        if (link) {
          user = await User.findById(link.userId);
          if (!user) {
            // edge case: link exists but user deleted
            await AuthLink.deleteOne({ _id: link._id });
            link = null;
          }
        }

        // 2) if not found by googleId, try link by email in users
        if (!user && email) {
          user = await User.findOne({ email });
          if (user) link = await getOrCreateAuthLink(user._id);
        }

        // 3) if still not found, create new user + link
        if (!user) {
          user = await User.create({
            name,
            email,
            photo,
            primaryProvider: "google",
            primaryProviderId: googleId,
          });
          link = await getOrCreateAuthLink(user._id);
        }

        // ensure google account is linked inside the same auth_links doc
        await updateMissingProfile({
          user,
          link,
          provider: "google",
          providerId: googleId,
          email,
          name,
          photo,
        });

        // also ensure primaryProvider is set only if missing
        if (!user.primaryProvider) {
          user.primaryProvider = "google";
          user.primaryProviderId = googleId;
          await user.save();
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
        const facebookId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase() || null;
        const name = profile.displayName || null;
        const photo = profile.photos?.[0]?.value || null;

        // 1) find by linked facebookId inside auth_links
        let link = await AuthLink.findOne({ "accounts.facebook.providerId": facebookId });
        let user = null;

        if (link) {
          user = await User.findById(link.userId);
          if (!user) {
            await AuthLink.deleteOne({ _id: link._id });
            link = null;
          }
        }

        // 2) if not found by facebookId, try link by email
        if (!user && email) {
          user = await User.findOne({ email });
          if (user) link = await getOrCreateAuthLink(user._id);
        }

        // 3) if still not found, create new user + link
        if (!user) {
          user = await User.create({
            name,
            email,
            photo,
            primaryProvider: "facebook",
            primaryProviderId: facebookId,
          });
          link = await getOrCreateAuthLink(user._id);
        }

        await updateMissingProfile({
          user,
          link,
          provider: "facebook",
          providerId: facebookId,
          email,
          name,
          photo,
        });

        if (!user.primaryProvider) {
          user.primaryProvider = "facebook";
          user.primaryProviderId = facebookId;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;