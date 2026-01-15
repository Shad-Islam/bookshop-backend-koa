const bcrypt = require("bcrypt");
const { now } = require("../utils/time");
const { normalizeEmail } = require("../utils/normalize");
const UsersRepo = require("../repositories/user_repo");

async function registerLocal({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    const err = new Error("Email is required");
    err.status = 400;
    throw err;
  }

  if (!password) {
    const err = new Error("Password is required");
    err.status = 400;
    throw err;
  }

  const existing = await UsersRepo.findByEmail(normalizedEmail);
  if (existing) {
    const err = new Error("Email is already registered");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const doc = {
    name: name || null,
    email: normalizedEmail,
    passwordHash,
    role: "user",
    primaryProvider: "local",
    primaryProviderId: normalizedEmail, // চাইলে রাখতে পারো
    createdAt: now(),
    updatedAt: now(),
  };

  return UsersRepo.createUser(doc);
}

async function upsertFromGoogle(profile) {
  const googleId = profile.id;
  const email = normalizeEmail(profile.emails?.[0]?.value);
  const name = profile.displayName || null;
  const photo = profile.photos?.[0]?.value || null;

  let user = await UsersRepo.findByGoogleId(googleId);
  if (!user && email) user = await UsersRepo.findByEmail(email);

  if (!user) {
    return UsersRepo.createUser({
      email: email || null,
      name,
      photo,
      role: "user",
      primaryProvider: "google",
      primaryProviderId: googleId,
      googleId,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  const $set = { updatedAt: now() };
  if (!user.googleId) $set.googleId = googleId;
  if (!user.email && email) $set.email = email;
  if (!user.name && name) $set.name = name;
  if (!user.photo && photo) $set.photo = photo;

  if (!user.primaryProvider) $set.primaryProvider = "google";
  if (!user.primaryProviderId) $set.primaryProviderId = googleId;

  if (Object.keys($set).length > 1) {
    user = await UsersRepo.updateUserById(user._id, $set);
  }
  return user;
}

async function upsertFromFacebook(profile) {
  const facebookId = profile.id;
  const email = normalizeEmail(profile.emails?.[0]?.value);
  const name = profile.displayName || null;
  const photo = profile.photos?.[0]?.value || null;

  let user = await UsersRepo.findByFacebookId(facebookId);
  if (!user && email) user = await UsersRepo.findByEmail(email);

  if (!user) {
    return UsersRepo.createUser({
      email: email || null,
      name,
      photo,
      role: "user",
      primaryProvider: "facebook",
      primaryProviderId: facebookId,
      facebookId,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  const $set = { updatedAt: now() };
  if (!user.facebookId) $set.facebookId = facebookId;
  if (!user.email && email) $set.email = email;
  if (!user.name && name) $set.name = name;
  if (!user.photo && photo) $set.photo = photo;

  if (!user.primaryProvider) $set.primaryProvider = "facebook";
  if (!user.primaryProviderId) $set.primaryProviderId = facebookId;

  if (Object.keys($set).length > 1) {
    user = await UsersRepo.updateUserById(user._id, $set);
  }
  return user;
}

module.exports = {
  registerLocal,
  upsertFromGoogle,
  upsertFromFacebook,
};