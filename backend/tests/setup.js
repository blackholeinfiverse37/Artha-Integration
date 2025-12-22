import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  // Connect to MongoDB Atlas test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  }
});

afterAll(async () => {
  // Clean up and close connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
});

beforeEach(async () => {
  // Clear test collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    if (collection.collectionName.includes('test') || process.env.NODE_ENV === 'test') {
      await collection.deleteMany({});
    }
  }
});