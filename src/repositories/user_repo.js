const { ObjectId } = require("mongodb");
const { getCollection } = require("../config/db");

function usersCol() {
  return getCollection("users");
}

async function findById(id) {
  const _id = typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : id;
  return usersCol().findOne({ _id });
}

async function findByEmail(email) {
  if (!email) return null;
  return usersCol().findOne({ email });
}

async function findByGoogleId(googleId) {
  return usersCol().findOne({ googleId });
}

async function findByFacebookId(facebookId) {
  return usersCol().findOne({ facebookId });
}

async function createUser(doc) {
  const result = await usersCol().insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

async function updateUserById(id, $set) {
  await usersCol().updateOne({ _id: id }, { $set });
  return usersCol().findOne({ _id: id });
}

module.exports = {
  findById,
  findByEmail,
  findByGoogleId,
  findByFacebookId,
  createUser,
  updateUserById,
};