const { MongoClient } = require("mongodb");

let client;
let db;

async function connectToDatabase() {
  if (db) {
    return db;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable not set");
  }

  client = new MongoClient(uri, { maxPoolSize: 10 });

  await client.connect();

  const dbName = process.env.DB_NAME;
  db = dbName ? client.db(dbName) : client.db();

  console.log("Connected to MongoDB");
  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase first.");
  }
  return db;
}

function getCollection(collectionName) {
  return getDatabase().collection(collectionName);
}

async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}

module.exports = {
  connectToDatabase,
  getDatabase,
  getCollection,
  closeDatabase,
};
