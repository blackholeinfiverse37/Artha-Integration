export default {
  rateLimit: {
    auth: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: 5
    },
    api: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100
    }
  },
  jwt: {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  },
  bcrypt: {
    saltRounds: 12
  }
};