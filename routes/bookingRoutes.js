const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Import models from main server file
const Patient = mongoose.models.Patient || mongoose.model('Patient');
const Booking = mongoose.models.Booking || mongoose.model('Booking');

// Middleware: authentication (simple JWT check)
function authenticateToken(req, res, next) {
  const token = req.cookies.token || req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  require('jsonwebtoken').verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Middleware: role check
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Rate limiter for booking creation
const rateLimit = require('express-rate-limit');
const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // limit each IP to 10 booking attempts per window
  message: 'Too many booking attempts from this IP, please try again later.'
});

// POST /api/bookings - create a booking (and patient if needed)
router.post('/bookings',
  authenticateToken,
  requireRole(['hospital', 'opd_admin', 'master']),
  bookingLimiter,
  [
    body('firstName').trim().escape().notEmpty(),
    body('lastName').trim().escape().notEmpty(),
    body('dateOfBirth').isISO8601(),
    body('folderNumber').trim().escape().notEmpty(),
    body('referralSource').trim().escape().notEmpty(),
    body('appointmentType').isIn(['new', 'review', 'chronic']),
    body('appointmentDate').isISO8601()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      let { firstName, lastName, dateOfBirth, folderNumber, referralSource, appointmentType, appointmentDate } = req.body;
      // Check daily limits
      const count = await Booking.countDocuments({
        appointmentDate: {
          $gte: new Date(appointmentDate).setHours(0,0,0,0),
          $lt: new Date(appointmentDate).setHours(23,59,59,999)
        },
        appointmentType
      });
      const limits = { new: 20, review: 40, chronic: 40 };
      if (count >= limits[appointmentType]) {
        return res.status(400).json({ error: `Daily limit for ${appointmentType} patients reached` });
      }
      // Find or create patient
      let patient = await Patient.findOne({ folderNumber });
      if (!patient) {
        patient = await Patient.create({ firstName, lastName, dateOfBirth, folderNumber });
      } else {
        // Optionally update patient info if changed
        if (
          patient.firstName !== firstName ||
          patient.lastName !== lastName ||
          patient.dateOfBirth.getTime() !== new Date(dateOfBirth).getTime()
        ) {
          patient.firstName = firstName;
          patient.lastName = lastName;
          patient.dateOfBirth = dateOfBirth;
          await patient.save();
        }
      }
      // Create booking
      const booking = await Booking.create({
        patient: patient._id,
        referralSource,
        appointmentType,
        appointmentDate,
      });
      // Log booking creation
      const winston = require('winston');
      const logger = winston.loggers.get('default') || winston.createLogger({
        transports: [new winston.transports.Console()]
      });
      logger.info({
        event: 'create_booking',
        username: req.user ? req.user.username : 'unknown',
        role: req.user ? req.user.role : 'unknown',
        patient_folderNumber: folderNumber,
        appointmentType,
        appointmentDate,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      res.status(201).json(booking);
    } catch (error) {
      next(error);
    }
  }
);

// Example: Protect other routes with authenticateToken as needed
// router.get('/bookings', authenticateToken, ...);

module.exports = router;
