import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, isBefore, isSameDay, addDays, parse } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ClinicBookingForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    clinicFileNumber: '',
    phoneNumber: '',
    appointmentDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [nextAvailable, setNextAvailable] = useState('');
  const [dateLoading, setDateLoading] = useState(true);
  const [dateCounts, setDateCounts] = useState({});
  const limits = { new: 20 };

  useEffect(() => {
    // Fetch next available date for new patients
    const fetchNextAvailable = async () => {
      setDateLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/bookings/next-available`);
        let next = response.data && response.data.new ? response.data.new : '';
        // Ensure next available date is not today, not weekend, not public holiday, not Tue/Thu, not fully booked
        if (next) {
          let nextDate = new Date(next);
          const today = new Date();
          today.setHours(0,0,0,0);
          while (
            isSameDay(nextDate, today) ||
            isBefore(nextDate, today) ||
            !isDateSelectable(nextDate) ||
            isFullyBooked(nextDate)
          ) {
            nextDate = addDays(nextDate, 1);
          }
          next = format(nextDate, 'dd-MM-yyyy');
        }
        setNextAvailable(next);
        setFormData(prev => ({ ...prev, appointmentDate: next }));
      } catch (err) {
        setError('Could not fetch next available date');
      } finally {
        setDateLoading(false);
      }
    };
    fetchNextAvailable();
  }, []);

  useEffect(() => {
    // Fetch booking counts for the next year for 'new' type
    const fetchCounts = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/bookings/date-counts?type=new`);
        setDateCounts(response.data);
      } catch (err) {
        setDateCounts({});
      }
    };
    fetchCounts();
  }, []);

  const isFullyBooked = (date) => {
    const key = format(date, 'yyyy-MM-dd');
    return dateCounts[key] >= limits.new;
  };

  // Function to check if a date is a South African public holiday
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

  // Function to check if a date is selectable (not weekend, not public holiday, not Tuesday or Thursday)
  const isDateSelectable = (date) => {
    const day = date.getDay();
    // 0 = Sunday, 6 = Saturday, 2 = Tuesday, 4 = Thursday
    if (day === 0 || day === 6 || day === 2 || day === 4) return false;
    return !isPublicHoliday(date);
  };

  const shouldDisableDate = (date) => {
    if (!nextAvailable) return true;
    // Parse DD-MM-YYYY to Date object
    const [day, month, year] = nextAvailable.split('-');
    const nextAvailableDateObj = new Date(`${year}-${month}-${day}`);
    if (!nextAvailableDateObj || isNaN(nextAvailableDateObj)) return true;
    // Normalize both dates to midnight
    const d = new Date(date);
    d.setHours(0,0,0,0);
    nextAvailableDateObj.setHours(0,0,0,0);
    // Disable dates strictly before next available (but allow the next available date itself)
    if (isBefore(d, nextAvailableDateObj)) return true;
    // Disable fully booked dates
    if (isFullyBooked(d)) return true;
    // Disable weekends, public holidays, Tue/Thu
    if (!isDateSelectable(d)) return true;
    return false;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, appointmentDate: date ? format(date, 'dd-MM-yyyy') : '' }));
  };

  const handleDobChange = (date) => {
    setFormData(prev => ({ ...prev, dateOfBirth: date ? format(date, 'dd-MM-yyyy') : '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axios.post(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/bookings`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth.split('-').reverse().join('-')).toISOString() : '',
        folderNumber: formData.clinicFileNumber,
        referralSource: 'Clinic',
        appointmentType: 'new',
        date: formData.appointmentDate ? new Date(formData.appointmentDate.split('-').reverse().join('-')).toISOString() : '',
        phoneNumber: formData.phoneNumber,
      });
      setSuccess('Booking created successfully!');
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        clinicFileNumber: '',
        phoneNumber: '',
        appointmentDate: nextAvailable,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while creating the booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 6 }}>
      <Paper elevation={3} sx={{ p: 4, position: 'relative' }}>
        <IconButton
          onClick={() => navigate('/')}
          sx={{ position: 'absolute', top: 8, left: 8 }}
          color="inherit"
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold', pl: 5 }}>
          Bookings from Clinic
        </Typography>
        {nextAvailable && (
          <Typography variant="subtitle1" sx={{ mb: 3, color: 'success.main', fontWeight: 'bold', pl: 5 }}>
            Next available date: {nextAvailable ? format(nextAvailable.includes('-')
              ? new Date(nextAvailable.split('-').reverse().join('-'))
              : new Date(nextAvailable), 'd MMMM yyyy') : ''}
          </Typography>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Surname"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                <DatePicker
                  label="Date of Birth"
                  value={formData.dateOfBirth ? new Date(formData.dateOfBirth.split('-').reverse().join('-')) : null}
                  onChange={handleDobChange}
                  format="dd-MM-yyyy"
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                      variant: 'outlined',
                      label: 'Date of Birth',
                      InputLabelProps: { shrink: true }
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Clinic File Number"
                name="clinicFileNumber"
                value={formData.clinicFileNumber}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number (optional)"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                <DatePicker
                  label="Appointment Date"
                  value={formData.appointmentDate ? new Date(formData.appointmentDate.split('-').reverse().join('-')) : null}
                  onChange={handleDateChange}
                  shouldDisableDate={shouldDisableDate}
                  format="dd-MM-yyyy"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      variant: 'outlined',
                      helperText: dateLoading ? 'Loading next available date...' : 'You can book for the next available or a later date.'
                    }
                  }}
                  disabled={dateLoading}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="success"
                fullWidth
                disabled={loading || dateLoading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Book Patient'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default ClinicBookingForm; 