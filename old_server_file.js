const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet());
app.set('trust proxy', 1); // trust first proxy if behind one

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// CORS and body parsing
app.use(cors({
  credentials: true,
  origin: function(origin, callback) {
    // Allow requests from localhost:3000 and any 127.0.0.1:* or localhost:* (for browser previews)
    if (!origin ||
        origin.startsWith('http://localhost:3000') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://localhost:')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
if (!process.env.MONGODB_URI) {
  throw new Error('Missing MONGODB_URI in environment variables');
}
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Patient Schema (master patient data)
const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  folderNumber: { type: String, required: true, unique: true },
});
const Patient = mongoose.model('Patient', patientSchema);

// Booking Schema (appointment data)
const bookingSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  referralSource: { type: String, required: true },
  appointmentType: {
    type: String,
    required: true,
    enum: ['new', 'review', 'chronic']
  },
  appointmentDate: { type: Date, required: true },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'completed', 'cancelled']
  }
});
const Booking = mongoose.model('Booking', bookingSchema);

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Will hash in future
  role: {
    type: String,
    required: true,
    enum: ['clinic', 'hospital', 'opd_admin', 'master']
  }
});
const User = mongoose.model('User', userSchema);

// Helper to trim all string fields in an object
function trimFields(obj, fields) {
  fields.forEach(field => {
    if (typeof obj[field] === 'string') {
      obj[field] = obj[field].trim();
    }
  });
}

// Use bookingRoutes for /api
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logsDir, 'app.log') })
  ]
});

app.use('/api', bookingRoutes);
app.use('/api', authRoutes);


app.get('/api/bookings', (req, res) => {
  // Authenticate via JWT in cookie or Authorization header
  const token = req.cookies.token || req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    // Only hospital, opd_admin, master can view bookings
    if (!['hospital', 'opd_admin', 'master'].includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    try {
      const { date } = req.query;
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      const bookings = await Booking.find({
        appointmentDate: { $gte: start, $lt: end }
      }).populate('patient');
      // Log access
      logger.info({
        event: 'view_bookings',
        username: user.username,
        role: user.role,
        accessed_date: date,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      // Flatten patient info into booking object for frontend
      const result = bookings.map(b => ({
        _id: b._id,
        firstName: b.patient.firstName,
        lastName: b.patient.lastName,
        dateOfBirth: b.patient.dateOfBirth,
        folderNumber: b.patient.folderNumber,
        referralSource: b.referralSource,
        appointmentType: b.appointmentType,
        appointmentDate: b.appointmentDate,
        status: b.status
      }));
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
});

app.get('/api/bookings/referral-counts', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(date);
    end.setHours(23,59,59,999);
    // Aggregate counts by referralSource
    const counts = await Booking.aggregate([
      {
        $match: {
          appointmentDate: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: '$referralSource',
          count: { $sum: 1 }
        }
      }
    ]);
    // Convert to { Clinic: 2, Wards: 3, ... }
    const result = {};
    counts.forEach(item => {
      result[item._id] = item.count;
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// NEW ENDPOINT: Get booking counts per date for a given type (for the next year)
app.get('/api/bookings/date-counts', async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) return res.status(400).json({ error: 'Type is required' });

    const today = new Date();
    today.setHours(0,0,0,0);
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);

    // Aggregate counts by date for the given type
    const counts = await Booking.aggregate([
      {
        $match: {
          appointmentType: type,
          appointmentDate: { $gte: today, $lt: nextYear }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$appointmentDate" }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    // Convert to { "2025-04-28": 20, ... }
    const result = {};
    counts.forEach(item => {
      result[item._id] = item.count;
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const isPublicHoliday = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const fixedHolidays = [
    `01-01-${year}`,
    `03-21-${year}`,
    `04-27-${year}`,
    `05-01-${year}`,
    `06-16-${year}`,
    `08-09-${year}`,
    `09-24-${year}`,
    `12-16-${year}`,
    `12-25-${year}`,
    `12-26-${year}`,
  ];
  // Calculate Easter Sunday (variable date)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monthEaster = Math.floor((h + l - 7 * m + 114) / 31);
  const dayEaster = ((h + l - 7 * m + 114) % 31) + 1;
  const easterSunday = `${monthEaster.toString().padStart(2, '0')}-${dayEaster.toString().padStart(2, '0')}-${year}`;
  const goodFriday = `${monthEaster.toString().padStart(2, '0')}-${(dayEaster - 2).toString().padStart(2, '0')}-${year}`;
  const familyDay = `${monthEaster.toString().padStart(2, '0')}-${(dayEaster + 1).toString().padStart(2, '0')}-${year}`;
  const currentDate = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}-${year}`;
  return fixedHolidays.includes(currentDate) || 
         currentDate === easterSunday || 
         currentDate === goodFriday || 
         currentDate === familyDay;
};

app.get('/api/bookings/next-available', async (req, res) => {
  try {
    const limits = { new: 20, review: 40, chronic: 40 };
    const result = {};
    const today = new Date();
    for (const type of Object.keys(limits)) {
      let date = new Date(today);
      let found = false;
      let attempts = 0;
      while (!found && attempts < 365) {
        const day = date.getDay();
        // 0 = Sunday, 6 = Saturday, 2 = Tuesday, 4 = Thursday
        if (day !== 0 && day !== 6 && day !== 2 && day !== 4 && !isPublicHoliday(date)) {
          const start = new Date(date);
          start.setHours(0,0,0,0);
          const end = new Date(date);
          end.setHours(23,59,59,999);
          const count = await Booking.countDocuments({
            appointmentDate: { $gte: start, $lt: end },
            appointmentType: type
          });
          if (count < limits[type]) {
            result[type] = date.toISOString().split('T')[0];
            found = true;
            break;
          }
        }
        date.setDate(date.getDate() + 1);
        attempts++;
      }
      if (!found) {
        result[type] = null;
      }
    }
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/patients/by-folder/:folderNumber - get patient by folder number (case-insensitive, trimmed)
app.get('/api/patients/by-folder/:folderNumber', async (req, res) => {
  try {
    let { folderNumber } = req.params;
    folderNumber = folderNumber.trim();
    // Case-insensitive search
    const query = { folderNumber: { $regex: `^${folderNumber}$`, $options: 'i' } };
    const patient = await Patient.findOne(query);
    console.log('[Patient Search]', { search: folderNumber, query, found: !!patient });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  // Find user in DB
  const user = await User.findOne({ username });
  if (!user || user.password !== password) {
    return res.json({ success: false, message: 'Invalid credentials' });
  }
  // Add role to JWT
  const token = jwt.sign({ username, role: user.role }, SECRET, { expiresIn: '30m' });
  res.cookie('token', token, { httpOnly: true, maxAge: 30 * 60 * 1000 });
  return res.json({ success: true, role: user.role });
});

// Auth check endpoint
app.get('/api/check-auth', (req, res) => {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.json({ authenticated: false });
  try {
    const decoded = jwt.verify(token, SECRET);
    return res.json({ authenticated: true, role: decoded.role });
  } catch {
    return res.json({ authenticated: false });
  }
});

// Seed users endpoint (for initial setup/testing only)
app.post('/api/seed-users', async (req, res) => {
  const count = await User.countDocuments();
  if (count > 0) return res.json({ message: 'Users already exist' });
  const user = {
    username: 'admin',
    password: 'admin',
    role: 'master'
  };
  await User.create(user);
  res.json({ message: 'Seeded master user', user });
});

// Delete booking endpoint (only for master users)
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== 'master') {
      return res.status(403).json({ error: 'Only master users can delete bookings' });
    }

    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 