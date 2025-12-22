import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { register, login, getMe, logout } from '../src/controllers/auth.controller.js';
import { protect } from '../src/middleware/auth.js';

const app = express();
app.use(express.json());

// Test routes
app.post('/register', register);
app.post('/login', login);
app.get('/me', protect, getMe);
app.post('/logout', protect, logout);

describe('Auth Controller', () => {
  beforeAll(async () => {
    // Connect to test database
    if (process.env.MONGODB_TEST_URI) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123!',
        role: 'viewer'
      };

      const response = await request(app)
        .post('/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
  });

  describe('POST /login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});