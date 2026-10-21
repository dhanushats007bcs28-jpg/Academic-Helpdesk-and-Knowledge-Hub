import mongoose from 'mongoose';

/**
 * Connect to a real MongoDB instance using Mongoose.
 * Retries a few times so the server can start before mongod is fully up.
 */
export async function connectDB(uri, { retries = 5, delayMs = 2000 } = {}) {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: true,
      });
      console.log(`[db] Connected to MongoDB -> ${mongoose.connection.host}/${mongoose.connection.name}`);
      return mongoose.connection;
    } catch (err) {
      console.error(`[db] Connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
