const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/careconnect';
const dbName = process.env.MONGO_DB || 'careconnect';

const client = new MongoClient(uri);

let db = null;

async function connectToMongo() {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to MongoDB database: ${dbName}`);
  }
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connectToMongo() first.');
  }
  return db;
}

module.exports = {
  connectToMongo,
  getDb,
  client,
};
