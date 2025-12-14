const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

module.exports = connectDb;
