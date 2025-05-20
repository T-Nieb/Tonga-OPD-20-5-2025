const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Set MONGODB_URI in your Render dashboard or in a .env file for local development
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/opd-booking';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Booking Schema
const bookingSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  dateOfBirth: Date,
  folderNumber: String,
  referralSource: String,
  appointmentType: String,
  date: Date,
});

const Booking = mongoose.model('Booking', bookingSchema);

// Generate test data
const generateTestData = async () => {
  try {
    // Clear existing data
    await Booking.deleteMany({});

    const startDate = new Date('2025-04-15');
    const endDate = new Date('2025-05-02');
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Generate bookings for each day
        const bookings = [];

        // For 30 April - leave one review slot open
        if (dateStr === '2025-04-30') {
          // Add 39 review appointments (leaving 1 slot open)
          for (let i = 0; i < 39; i++) {
            bookings.push({
              firstName: `Review`,
              lastName: `Patient${i + 1}`,
              dateOfBirth: new Date('1980-01-01'),
              folderNumber: `R${i + 1}`,
              referralSource: 'GP',
              appointmentType: 'review',
              date: new Date(dateStr),
            });
          }
          // Add all new and chronic appointments
          for (let i = 0; i < 20; i++) {
            bookings.push({
              firstName: `New`,
              lastName: `Patient${i + 1}`,
              dateOfBirth: new Date('1980-01-01'),
              folderNumber: `N${i + 1}`,
              referralSource: 'GP',
              appointmentType: 'new',
              date: new Date(dateStr),
            });
          }
          for (let i = 0; i < 40; i++) {
            bookings.push({
              firstName: `Chronic`,
              lastName: `Patient${i + 1}`,
              dateOfBirth: new Date('1980-01-01'),
              folderNumber: `C${i + 1}`,
              referralSource: 'GP',
              appointmentType: 'chronic',
              date: new Date(dateStr),
            });
          }
        }
        // For 29 April - leave one chronic slot open
        else if (dateStr === '2025-04-29') {
          // Add all new and review appointments
          for (let i = 0; i < 20; i++) {
            bookings.push({
              firstName: `New`,
              lastName: `Patient${i + 1}`,
              dateOfBirth: new Date('1980-01-01'),
              folderNumber: `N${i + 1}`,
              referralSource: 'GP',
              appointmentType: 'new',
              date: new Date(dateStr),
            });
          }
          for (let i = 0; i < 40; i++) {
            bookings.push({
              firstName: `Review`,
              lastName: `Patient${i + 1}`,
              dateOfBirth: new Date('1980-01-01'),
              folderNumber: `R${i + 1}`,
              referralSource: 'GP',
              appointmentType: 'review',
              date: new Date(dateStr),
            });
          }
          // Add 39 chronic appointments (leaving 1 slot open)
          for (let i = 0; i < 39; i++) {
            bookings.push({
              firstName: `Chronic`,
              lastName: `Patient${i + 1}`,
              dateOfBirth: new Date('1980-01-01'),
              folderNumber: `C${i + 1}`,
              referralSource: 'GP',
              appointmentType: 'chronic',
              date: new Date(dateStr),
            });
          }
        }
        // For all other days - fully book all slots
        else {
          // Add all appointments
          for (let i = 0; i < 20; i++) {
            bookings.push({
              firstName: `New`,
              lastName: `Patient${i + 1}`,
              dateOfBirth: new Date('1980-01-01'),
              folderNumber: `N${i + 1}`,
              referralSource: 'GP',
              appointmentType: 'new',
              date: new Date(dateStr),
            });
          }
          for (let i = 0; i < 40; i++) {
            bookings.push({
              firstName: `Review`,
              lastName: `Patient${i + 1}`,
              dateOfBirth: new Date('1980-01-01'),
              folderNumber: `R${i + 1}`,
              referralSource: 'GP',
              appointmentType: 'review',
              date: new Date(dateStr),
            });
          }
          for (let i = 0; i < 40; i++) {
            bookings.push({
              firstName: `Chronic`,
              lastName: `Patient${i + 1}`,
              dateOfBirth: new Date('1980-01-01'),
              folderNumber: `C${i + 1}`,
              referralSource: 'GP',
              appointmentType: 'chronic',
              date: new Date(dateStr),
            });
          }
        }

        await Booking.insertMany(bookings);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Test data generated successfully');
  } catch (error) {
    console.error('Error generating test data:', error);
  }
};

// GET /api/patients/by-folder/:folderNumber - Find most recent booking by folder number
app.get('/api/patients/by-folder/:folderNumber', async (req, res) => {
  try {
    const { folderNumber } = req.params;
    const booking = await Booking.findOne({ folderNumber }).sort({ date: -1 });
    if (!booking) {
      return res.status(404).json({ error: 'No patient found for this folder number' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to confirm server is running correct code
app.get('/test', (req, res) => res.send('test ok'));

// API Routes
app.get('/api/bookings', async (req, res) => {
  try {
    const { date } = req.query;
    const bookings = await Booking.find({ date: new Date(date) });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings - Create a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      folderNumber,
      referralSource,
      appointmentType,
      date
    } = req.body;
    if (!firstName || !lastName || !appointmentType || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const booking = new Booking({
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      folderNumber,
      referralSource,
      appointmentType,
      date: new Date(date)
    });
    await booking.save();
    res.status(201).json({ message: 'Booking created', booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bookings/next-available - Find next available date for each type
app.get('/api/bookings/next-available', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Define max slots per type
    const maxSlots = { new: 20, chronic: 40, review: 40 };
    const types = Object.keys(maxSlots);
    const result = {};

    // Search up to 60 days ahead
    for (const type of types) {
      let found = false;
      for (let i = 1; i <= 60; i++) { // skip today, start from tomorrow
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        // Skip weekends (0=Sun, 6=Sat)
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        // Count bookings for this type and date
        const count = await Booking.countDocuments({
          appointmentType: type,
          date: {
            $gte: new Date(date.setHours(0,0,0,0)),
            $lt: new Date(date.setHours(23,59,59,999))
          }
        });
        if (count < maxSlots[type]) {
          result[type] = date.toISOString().slice(0,10);
          found = true;
          break;
        }
      }
      if (!found) result[type] = null;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/bookings/:id - Delete a booking by ID
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Booking.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/bookings/:id - Delete a booking by ID
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Booking.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bookings/date-counts?type=<type>
app.get('/api/bookings/date-counts', async (req, res) => {
  try {
    const { type } = req.query;
    // Group bookings by date, count by type
    const counts = await Booking.aggregate([
      { $match: type ? { appointmentType: type } : {} },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Initialize test data
// generateTestData();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 