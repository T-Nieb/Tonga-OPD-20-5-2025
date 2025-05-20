const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { faker } = require('@faker-js/faker');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/opd-booking', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Patient Schema
const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  folderNumber: { type: String, required: true, unique: true }
});
const Patient = mongoose.model('Patient', patientSchema);

// Booking Schema
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

// Referral sources
const referralSources = [
  'General Practice',
  'Emergency Department',
  'Specialist Referral',
  'Self-Referral',
  'Hospital Transfer'
];

// Function to generate random date within a range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Function to generate random patient data
function generatePatient() {
  const dateOfBirth = randomDate(new Date(1920, 0, 1), new Date(2005, 0, 1));
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    dateOfBirth: dateOfBirth,
    folderNumber: faker.string.numeric(6)
  };
}

// Function to generate random booking data for a patient
function generateBooking(patientId, appointmentDate, appointmentType) {
  return {
    patient: patientId,
    referralSource: referralSources[Math.floor(Math.random() * referralSources.length)],
    appointmentType: appointmentType,
    appointmentDate: appointmentDate,
    status: 'pending'
  };
} 

// Function to populate database
async function populateDatabase() {
  try {
    // Clear existing data
    await Booking.deleteMany({});
    await Patient.deleteMany({});
    console.log('Cleared existing data');

    // Generate data from January 2025 to current date
    const startDate = new Date(2025, 0, 1); // January 1, 2025
    const endDate = new Date(); // Current date

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Generate random number of appointments for each type
        const newPatients = Math.floor(Math.random() * 15) + 5; // 5-20 new patients
        const reviews = Math.floor(Math.random() * 30) + 10; // 10-40 reviews
        const chronic = Math.floor(Math.random() * 30) + 10; // 10-40 chronic scripts

        // Helper to create patients and bookings
        async function createBookings(count, type) {
          for (let i = 0; i < count; i++) {
            const patientData = generatePatient();
            const patient = await Patient.create(patientData);
            const bookingData = generateBooking(patient._id, new Date(currentDate), type);
            await Booking.create(bookingData);
          }
        }
        await createBookings(newPatients, 'new');
        await createBookings(reviews, 'review');
        await createBookings(chronic, 'chronic');

        console.log(`Generated data for ${currentDate.toISOString().split('T')[0]}`);
      }
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Database populated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
}

// Install required package
const { execSync } = require('child_process');
try {
  require.resolve('@faker-js/faker');
} catch (e) {
  console.log('Installing @faker-js/faker...');
  execSync('npm install @faker-js/faker');
}

// Run the population script
populateDatabase(); 