import request from 'supertest';
import express from 'express';
import { authLimiter, limiter, sanitizeInput, validate } from '../src/middleware/security.js';

const app = express();
app.use(express.json());
app.use(sanitizeInput);

// Test routes
app.post('/test-auth', authLimiter, (req, res) => {
  res.json({ success: true, body: req.body });
});

app.get('/test-api', limiter, (req, res) => {
  res.json({ success: true });
});

describe('Security Middleware', () => {
  describe('Input Sanitization', () => {
    it('should trim whitespace from string inputs', async () => {
      const response = await request(app)
        .post('/test-auth')
        .send({ name: '  test  ', email: ' test@example.com ' });
      
      expect(response.body.body.name).toBe('test');
      expect(response.body.body.email).toBe('test@example.com');
    });

    it('should remove script tags', async () => {
      const response = await request(app)
        .post('/test-auth')
        .send({ name: '<script>alert("xss")</script>test' });
      
      expect(response.body.body.name).toBe('test');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const response = await request(app)
        .get('/test-api');
      
      expect(response.status).toBe(200);
    });
  });
});