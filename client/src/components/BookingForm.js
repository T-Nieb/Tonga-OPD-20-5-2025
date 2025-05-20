import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  CardContent,
  Stack,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import { format, addDays, isWeekend, isSameDay, isBefore, parse } from 'date-fns';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SearchIcon from '@mui/icons-material/Search';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { styled } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';

const REFERRAL_OPTIONS = [
  { value: 'Clinic', label: 'Clinic' },
  { value: 'Wards', label: 'Wards' },
  { value: 'Emergency Department', label: 'Emergency Department' },
  { value: 'OPD (review)', label: 'OPD (review)' },
];

const REFERRAL_LIMITS = {
  'Clinic': 10,
  'Wards': 10,
  'Emergency Department': 10,
  'OPD (review)': 10,
};

const BOOKING_TYPE_LABELS = {
  new: 'New Patient',
  review: 'Review',
  chronic: 'Chronic Follow Up',
};

const BOOKING_TYPE_COLORS = {
  new: 'primary',
  review: 'secondary',
  chronic: 'success',
};

const limits = { new: 20, review: 40, chronic: 40 };

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

const initialFormData = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  folderNumber: '',
  referralSource: '',
  appointmentType: '',
  appointmentDate: format(new Date(), 'yyyy-MM-dd'),
  searchFolderNumber: '',
};

const BookingForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nextAvailable, setNextAvailable] = useState({});
  const [nextLoading, setNextLoading] = useState(true);
  const [nextError, setNextError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [dateCounts, setDateCounts] = useState({});
  const [dateCountsLoading, setDateCountsLoading] = useState(false);
  const [folderNumberError, setFolderNumberError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false); // NEW


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAppointmentDateChange = (date) => {
    setFormData(prev => ({ ...prev, appointmentDate: date ? format(date, 'dd-MM-yyyy') : '' }));
  };

  const handleDobChange = (date) => {
    setFormData(prev => ({ ...prev, dateOfBirth: date ? format(date, 'dd-MM-yyyy') : '' }));
  };

  const validateFolderNumber = (value) => {
    // Format: T**/****** (T = letter, two digits, slash, at least one digit)
    return /^[A-Za-z]\d{2}\/\d+$/.test(value);
  };

  const handleFolderNumberChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, folderNumber: value }));
    if (!validateFolderNumber(value)) {
      setFolderNumberError('Folder number must be in the format T12/123456');
    } else {
      setFolderNumberError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true); // NEW

    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    if (!formData.folderNumber || !validateFolderNumber(formData.folderNumber)) {
      setFolderNumberError('Folder number must be in the format T12/123456');
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/bookings`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth.split('-').reverse().join('-')).toISOString() : '',
        folderNumber: formData.folderNumber,
        referralSource: formData.referralSource,
        appointmentType: formData.appointmentType,
        date: formData.appointmentDate ? new Date(formData.appointmentDate.split('-').reverse().join('-')).toISOString() : ''
      });
      setSuccess('Booking created successfully!');
      setFormData(initialFormData);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while creating the booking');
    } finally {
      setLoading(false);
    }
  };

  const handleBookNext = (type) => {
    if (nextAvailable[type]) {
      setFormData(prev => ({
        ...prev,
        appointmentType: type,
        appointmentDate: nextAvailable[type]
          ? format(parse(nextAvailable[type], 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')
          : ''
      }));
    }
  };

  const handleSearchFolder = async () => {
    setSearchError('');
    if (!formData.searchFolderNumber) return;
    if (!validateFolderNumber(formData.searchFolderNumber)) {
      setFolderNumberError('Folder number must be in the format T12/123456');
      return;
    }
    setSearchLoading(true);
    try {
      const encodedFolderNumber = encodeURIComponent(formData.searchFolderNumber);
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/patients/by-folder/${encodedFolderNumber}`);
      const patient = response.data;
      setFormData(prev => ({
        ...prev,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd-MM-yyyy') : '',
        folderNumber: patient.folderNumber || '',
        searchFolderNumber: patient.folderNumber || '',
      }));
      setFolderNumberError('');
    } catch (err) {
      setSearchError('Patient not found');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearAll = () => {
    setFormData(initialFormData);
    setError('');
    setSuccess('');
    setSearchError('');
    setFolderNumberError('');
  };

  useEffect(() => {
    // Fetch next available dates for each booking type
    const fetchNextAvailable = async () => {
      setNextLoading(true);
      setNextError('');
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/bookings/next-available`);
        const result = { ...response.data };
        const today = new Date();
        today.setHours(0,0,0,0);
        // For each type, ensure next available is not today, not before today, and is selectable
        Object.keys(result).forEach(type => {
          let next = result[type];
          if (next) {
            let nextDate = new Date(next);
            while (
              isSameDay(nextDate, today) ||
              isBefore(nextDate, today) ||
              !isDateSelectable(nextDate)
            ) {
              nextDate = addDays(nextDate, 1);
            }
            result[type] = nextDate.toISOString().slice(0, 10);
          }
        });
        setNextAvailable(result);
      } catch (err) {
        setNextError('Could not fetch next available dates');
      } finally {
        setNextLoading(false);
      }
    };
    fetchNextAvailable();
  }, []);

  // Fetch booking counts for the selected type for the next year
  useEffect(() => {
    if (!formData.appointmentType) return;
    setDateCountsLoading(true);
    const fetchCounts = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/bookings/date-counts?type=${formData.appointmentType}`);
        setDateCounts(response.data);
      } catch (err) {
        setDateCounts({});
      } finally {
        setDateCountsLoading(false);
      }
    };
    fetchCounts();
  }, [formData.appointmentType]);

  // Helper to check if a date is fully booked for the selected type
  const isFullyBooked = (date) => {
    const key = date.toISOString().split('T')[0];
    return dateCounts[key] >= limits[formData.appointmentType];
  };
  // Helper to check if a date is available for the selected type
  const isAvailable = (date) => {
    const key = date.toISOString().split('T')[0];
    return (dateCounts[key] || 0) < limits[formData.appointmentType];
  };

  // Custom day rendering for the date picker
  const CustomDay = styled('div')(({ theme, color }) => ({
    borderRadius: '50%',
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      color === 'red' ? theme.palette.error.main :
      color === 'green' ? theme.palette.success.main :
      color === 'grey' ? theme.palette.action.disabledBackground : 'inherit',
    color: color === 'red' || color === 'green' ? theme.palette.common.white : 'inherit',
    fontWeight: 500,
    margin: '0 auto',
  }));

  return (
    <Box>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            Book a Patient
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Dashboard for next available dates */}
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 3, mb: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          <EventAvailableIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Next Available Dates
        </Typography>
        {nextLoading ? (
          <CircularProgress />
        ) : nextError ? (
          <Alert severity="error">{nextError}</Alert>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {['new', 'review', 'chronic'].map(type => (
              <Card key={type} sx={{ minWidth: 200, flex: 1 }}>
                <CardContent>
                  <Typography variant="subtitle1" color={BOOKING_TYPE_COLORS[type] + ".main"} sx={{ fontWeight: 'bold' }}>
                    {BOOKING_TYPE_LABELS[type]}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {nextAvailable[type] && !isNaN(Date.parse(nextAvailable[type]))
                      ? `Next available: ${format(new Date(nextAvailable[type]), 'd MMMM yyyy')}`
                      : 'No available date in the next year'}
                  </Typography>
                  {nextAvailable[type] && (
                    <Button
                      variant="contained"
                      color={BOOKING_TYPE_COLORS[type]}
                      sx={{ mt: 2 }}
                      onClick={() => handleBookNext(type)}
                      fullWidth
                    >
                      Book for this date
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Folder Number Search Block at the top */}
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Search by Folder number
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      label="Folder Number (Search)"
                      name="searchFolderNumber"
                      value={formData.searchFolderNumber || ''}
                      onChange={e => setFormData(prev => ({ ...prev, searchFolderNumber: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchFolder();
                        }
                      }}
                    />
                    <Button
                      variant="outlined"
                      color="primary"
                      sx={{ ml: 1, minWidth: 40, height: 56 }}
                      onClick={handleSearchFolder}
                      disabled={!formData.searchFolderNumber || searchLoading}
                    >
                      <SearchIcon />
                    </Button>
                  </Box>
                  {searchError && <Alert severity="warning" sx={{ mt: 1 }}>{searchError}</Alert>}
                </Paper>
              </Grid>
              {/* Divider between search and main form */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              {/* First row: First Name, Last Name, Folder Number */}
              <Grid container item xs={12} spacing={3}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    required
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    required
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    required
                    fullWidth
                    label="Folder Number"
                    name="folderNumber"
                    value={formData.folderNumber}
                    onChange={handleFolderNumberChange}
                    error={!!folderNumberError}
                    helperText={folderNumberError || 'Required. Format: T12/123456'}
                  />
                </Grid>
              </Grid>
              {/* Date of Birth on its own row */}
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
              {/* Referral Source on its own row */}
              <Grid item xs={12}>
                <TextField
  required
  fullWidth
  select
  label="Referral Source"
  name="referralSource"
  value={formData.referralSource}
  onChange={handleChange}
  InputLabelProps={{ shrink: true }}
  error={submitAttempted && !formData.referralSource}
  helperText={submitAttempted && !formData.referralSource ? 'Referral source is required' : ''}
  sx={{ minWidth: '200px', minHeight: '56px' }}
>
  <MenuItem value="" disabled>Select referral source</MenuItem>
  {REFERRAL_OPTIONS.map(option => (
    <MenuItem key={option.value} value={option.value}>
      {option.label}
    </MenuItem>
  ))}
</TextField>
              </Grid>
              {/* Appointment Type on its own row */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ width: '100%', display: 'block' }}>
                  <TextField
                    required
                    fullWidth
                    select
                    label="Appointment Type"
                    name="appointmentType"
                    value={formData.appointmentType}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    displayEmpty
                    InputProps={{ notched: true }}
                    sx={{ minWidth: '200px', minHeight: '56px' }}
                  >
                    <MenuItem value="" disabled>Select appointment type</MenuItem>
                    <MenuItem value="new">New Patient (20/day)</MenuItem>
                    <MenuItem value="review">Review (40/day)</MenuItem>
                    <MenuItem value="chronic">Chronic Script (40/day)</MenuItem>
                  </TextField>
                </Box>
              </Grid>
              {/* Appointment Date on its own row */}
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                  <DatePicker
                    label="Appointment Date"
                    value={formData.appointmentDate ? new Date(formData.appointmentDate.split('-').reverse().join('-')) : null}
                    onChange={handleAppointmentDateChange}
                    shouldDisableDate={(date) => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const checkDate = new Date(date);
                      checkDate.setHours(0,0,0,0);
                      if (!isDateSelectable(date)) return true;
                      if (!formData.appointmentType) return true;
                      if (isFullyBooked(date)) return true;
                      // Prevent booking on the same day
                      if (checkDate.getTime() === today.getTime()) return true;
                      // Prevent booking on past dates
                      if (checkDate.getTime() < today.getTime()) return true;
                      return false;
                    }}
                    format="dd-MM-yyyy"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        variant: 'outlined',
                        helperText: !formData.appointmentType ? 'Select booking type first' : 'Only available OPD days are enabled.'
                      }
                    }}
                    disabled={!formData.appointmentType || dateCountsLoading}
                  />
                </LocalizationProvider>
              </Grid>
              {/* Submit and Clear All Buttons */}
              <Grid item xs={12} sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Book Appointment'}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  color="secondary"
                  onClick={handleClearAll}
                  sx={{ mt: 2 }}
                >
                  Clear All
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};

export default BookingForm; 