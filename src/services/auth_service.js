const bcrypt = require("bcrypt");

const { now } = require("../utils/time");
const { normalizeEmail } = require("../utils/normalize");

const UsersRepo = require("../repositories/user_repo");
const AuthLinksRepo = require("../repositories/authlinks_repo");

async function ensureUserProfile({ email, name, photo, primaryProvider, primaryProviderId }) {
  let user = null;

  // 1) If we have email, try find user by email (main linking key)
  if (email) user = await UsersRepo.findByEmail(email);

  // 2) If not found, create user
  if (!user) {
    return UsersRepo.createUser({
      email: email || null,
      name: name || null,
      photo: photo || null,
      role: "user",
      primaryProvider,
      primaryProviderId,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  // 3) enrich missing fields only
  const $set = { updatedAt: now() };
  if (!user.email && email) $set.email = email;
  if (!user.name && name) $set.name = name;
  if (!user.photo && photo) $set.photo = photo;

  // keep first login provider as primary (if empty)
  if (!user.primaryProvider) $set.primaryProvider = primaryProvider;
  if (!user.primaryProviderId) $set.primaryProviderId = primaryProviderId;

  if (Object.keys($set).length > 1) {
    user = await UsersRepo.updateUserById(user._id, $set);
  }

  return user;
}

// -------- Google --------
async function upsertFromGoogle(profile) {
  const googleId = profile.id;
  const email = normalizeEmail(profile.emails?.[0]?.value);
  const name = profile.displayName || null;
  const photo = profile.photos?.[0]?.value || null;

  // A) first check authlinks by provider+providerId
  const link = await AuthLinksRepo.findByProvider("google", googleId);

  let user = null;
  if (link) user = await UsersRepo.findById(link.userId);

  // B) if no link-user, link by email (same user for google/facebook/local)
  if (!user) {
    user = await ensureUserProfile({
      email,
      name,
      photo,
      primaryProvider: "google",
      primaryProviderId: googleId,
    });
  }

  // C) ensure authlink doc for google exists (separate document)
  await AuthLinksRepo.upsertLink({
    userId: user._id,
    provider: "google",
    providerId: googleId,
    email,
    photo,
  });

  return user;
}

// -------- Facebook --------
async function upsertFromFacebook(profile) {
  const facebookId = profile.id;
  const email = normalizeEmail(profile.emails?.[0]?.value);
  const name = profile.displayName || null;
  const photo = profile.photos?.[0]?.value || null;

  const link = await AuthLinksRepo.findByProvider("facebook", facebookId);

  let user = null;
  if (link) user = await UsersRepo.findById(link.userId);

  if (!user) {
    user = await ensureUserProfile({
      email,
      name,
      photo,
      primaryProvider: "facebook",
      primaryProviderId: facebookId,
    });
  }

  await AuthLinksRepo.upsertLink({
    userId: user._id,
    provider: "facebook",
    providerId: facebookId,
    email,
    photo,
  });

  return user;
}

// -------- Local register --------
async function registerLocal({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const err = new Error("email is required");
    err.status = 400;
    throw err;
  }
  if (!password || password.length < 6) {
    const err = new Error("password must be at least 6 characters");
    err.status = 400;
    throw err;
  }

  // find user by email; if none create
  let user = await UsersRepo.findByEmail(normalizedEmail);

  if (!user) {
    user = await UsersRepo.createUser({
      email: normalizedEmail,
      name: name || null,
      role: "user",
      primaryProvider: "local",
      primaryProviderId: normalizedEmail,
      createdAt: now(),
      updatedAt: now(),
    });
  } else {
    // enrich name if missing
    const $set = { updatedAt: now() };
    if (!user.name && name) $set.name = name;
    if (!user.primaryProvider) $set.primaryProvider = "local";
    if (!user.primaryProviderId) $set.primaryProviderId = normalizedEmail;

    if (Object.keys($set).length > 1) {
      user = await UsersRepo.updateUserById(user._id, $set);
    }
  }

  // create/update local authlink doc (separate document)
  const passwordHash = await bcrypt.hash(password, 10);
  await AuthLinksRepo.upsertLink({
    userId: user._id,
    provider: "local",
    providerId: normalizedEmail,
    email: normalizedEmail,
    passwordHash,
  });

  return user;
}

module.exports = {
  upsertFromGoogle,
  upsertFromFacebook,
  registerLocal,
};
