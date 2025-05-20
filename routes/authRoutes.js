const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const winston = require('winston');

const User = mongoose.models.User || mongoose.model('User');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: 'Too many login attempts, please try again later.'
});

router.post('/login',
  loginLimiter,
  [
    body('username').trim().escape().notEmpty(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    logger.info({ event: 'login_attempt', body: req.body, origin: req.headers.origin, cookies: req.cookies });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn({ event: 'login_failed', reason: 'validation', username: req.body.username });
      return res.status(400).json({ error: 'Invalid input' });
    }
    const { username, password } = req.body;
    try {
      logger.info({ event: 'login_db_query', username });
      const user = await User.findOne({ username });
      if (!user) {
        logger.warn({ event: 'login_failed', reason: 'user_not_found', username });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      logger.info({ event: 'login_user_found', username });
      // For demo: plain password, in prod use bcrypt.compare
      const isMatch = password === user.password; // Replace with bcrypt.compare(password, user.password) if hashed
      logger.info({ event: 'login_password_check', username, isMatch });
      if (!isMatch) {
        logger.warn({ event: 'login_failed', reason: 'bad_password', username });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      // Issue JWT
      logger.info({ event: 'login_jwt_sign', username });
      const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '8h' });
      logger.info({ event: 'login_set_cookie', username });
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000
      });
      logger.info({ event: 'login_success', username });
      res.json({ success: true, role: user.role });
    } catch (error) {
      logger.error({ event: 'login_error', error: error.message, username });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
