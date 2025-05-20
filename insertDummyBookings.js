const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/opd-booking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const patientSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  dateOfBirth: Date,
  folderNumber: String,
  referralSource: String,
  appointmentType: String,
  appointmentDate: Date,
  status: String,
});

const Patient = mongoose.model('Patient', patientSchema);

async function insertDummyData() {
  const date = new Date('2025-04-28T08:00:00Z');
  // Remove any existing bookings for this date
  await Patient.deleteMany({
    appointmentDate: {
      $gte: new Date('2025-04-28T00:00:00Z'),
      $lt: new Date('2025-04-29T00:00:00Z'),
    },
  });

  // Insert 20 new patients (fully booked)
  const newPatients = Array.from({ length: 20 }).map((_, i) => ({
    firstName: `New${i + 1}`,
    lastName: `Patient${i + 1}`,
    dateOfBirth: new Date('1990-01-01'),
    folderNumber: `N20250428${i + 1}`,
    referralSource: 'Clinic',
    appointmentType: 'new',
    appointmentDate: date,
    status: 'pending',
  }));

  // Insert 2 review and 2 chronic (not fully booked)
  const reviewPatients = Array.from({ length: 2 }).map((_, i) => ({
    firstName: `Review${i + 1}`,
    lastName: `Patient${i + 1}`,
    dateOfBirth: new Date('1985-01-01'),
    folderNumber: `R20250428${i + 1}`,
    referralSource: 'Wards',
    appointmentType: 'review',
    appointmentDate: date,
    status: 'pending',
  }));

  const chronicPatients = Array.from({ length: 2 }).map((_, i) => ({
    firstName: `Chronic${i + 1}`,
    lastName: `Patient${i + 1}`,
    dateOfBirth: new Date('1975-01-01'),
    folderNumber: `C20250428${i + 1}`,
    referralSource: 'Emergency Department',
    appointmentType: 'chronic',
    appointmentDate: date,
    status: 'pending',
  }));

  await Patient.insertMany([...newPatients, ...reviewPatients, ...chronicPatients]);
  console.log('Dummy data inserted for 28 April 2025');
  mongoose.disconnect();
}

insertDummyData(); 