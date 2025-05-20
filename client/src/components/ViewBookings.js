import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  AppBar,
  Toolbar,
  IconButton,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Divider,
  Chip,
  Stack,
  useTheme,
  alpha,
  Button,
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  FormControlLabel,
  Alert,
  Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { enZA } from 'date-fns/locale';
import axios from 'axios';
import { format, parseISO, isWeekend, getDay, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parse } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AddPatientDialog from './AddPatientDialog';

// Function to check if a date is a South African public holiday
const isPublicHoliday = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // List of fixed date public holidays in South Africa
  const fixedHolidays = [
    `01-01-${year}`, // New Year's Day
    `03-21-${year}`, // Human Rights Day
    `04-27-${year}`, // Freedom Day
    `05-01-${year}`, // Workers' Day
    `06-16-${year}`, // Youth Day
    `08-09-${year}`, // National Women's Day
    `09-24-${year}`, // Heritage Day
    `12-16-${year}`, // Day of Reconciliation
    `12-25-${year}`, // Christmas Day
    `12-26-${year}`, // Day of Goodwill
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

// Function to get the next available working day
const getNextWorkingDay = (date) => {
  let nextDate = new Date(date);
  while (!isDateSelectable(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  return nextDate;
};

const getInitialBookingDate = () => {
  const today = new Date();
  today.setHours(0,0,0,0);
  if (isDateSelectable(today)) {
    return format(today, 'dd-MM-yyyy');
  } else {
    const next = getNextWorkingDay(today);
    return format(next, 'dd-MM-yyyy');
  }
};

const ViewBookings = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(getInitialBookingDate());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyCounts, setDailyCounts] = useState({
    new: 0,
    review: 0,
    chronic: 0
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [nextAvailableDate, setNextAvailableDate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState('');

  const limits = {
    new: 20,
    review: 40,
    chronic: 40
  };

  const handleDateClick = (date) => {
    if (isDateSelectable(date)) {
      setSelectedDate(format(date, 'dd-MM-yyyy'));
      setAnchorEl(null);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subDays(startOfMonth(currentMonth), 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addDays(endOfMonth(currentMonth), 1));
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <Box sx={{ p: 2, minWidth: 300 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <IconButton onClick={handlePrevMonth} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6">
            {format(currentMonth, 'MMMM yyyy', { locale: enZA })}
          </Typography>
          <IconButton onClick={handleNextMonth} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Stack>
        <Grid container spacing={1}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <Grid item xs={12/7} key={day}>
              <Typography variant="caption" align="center" color="text.secondary">
                {day}
              </Typography>
            </Grid>
          ))}
          {days.map((day) => {
            const isSelectable = isDateSelectable(day);
            const isSelected = isSameDay(day, new Date(selectedDate));
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <Grid item xs={12/7} key={day.toString()}>
                <Button
                  onClick={() => handleDateClick(day)}
                  disabled={!isSelectable || !isCurrentMonth}
                  sx={{
                    minWidth: 'auto',
                    width: '100%',
                    height: 36,
                    p: 0,
                    borderRadius: 1,
                    color: isCurrentMonth ? 'text.primary' : 'text.disabled',
                    bgcolor: isSelected ? 'primary.main' : 'transparent',
                    '&:hover': {
                      bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                    },
                    '&.Mui-disabled': {
                      color: 'text.disabled',
                    },
                  }}
                >
                  {format(day, 'd')}
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  useEffect(() => {
    // If the selected date is not selectable, move to the next working day
    const date = selectedDate ? new Date(selectedDate.split('-').reverse().join('-')) : null;
    if (date && !isDateSelectable(date)) {
      const nextWorkingDay = getNextWorkingDay(date);
      setSelectedDate(format(nextWorkingDay, 'dd-MM-yyyy'));
    } else if (date) {
      fetchBookings();
    }
  }, [selectedDate]);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      // Convert selectedDate (dd-MM-yyyy) to yyyy-MM-dd for API
      const [day, month, year] = selectedDate.split('-');
      const apiDate = `${year}-${month}-${day}`;
      const response = await axios.get(`http://localhost:3001/api/bookings?date=${apiDate}`);
      setBookings(response.data);
      
      // Calculate daily counts
      const counts = {
        new: 0,
        review: 0,
        chronic: 0
      };
      response.data.forEach(booking => {
        counts[booking.appointmentType]++;
      });
      setDailyCounts(counts);
    } catch (err) {
      if (err.response) {
        setError('Failed to fetch bookings');
      } else {
        setError('Failed to fetch bookings');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const getAppointmentTypeLabel = (type) => {
    switch (type) {
      case 'new':
        return 'New Patient';
      case 'review':
        return 'Review';
      case 'chronic':
        return 'Chronic Script';
      default:
        return type;
    }
  };

  const getAppointmentTypeIcon = (type) => {
    switch (type) {
      case 'new':
        return <PeopleIcon />;
      case 'review':
        return <AssignmentIcon />;
      case 'chronic':
        return <LocalHospitalIcon />;
      default:
        return null;
    }
  };

  const getProgressColor = (count, limit) => {
    const percentage = (count / limit) * 100;
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  const renderStatusCard = (type, count, limit) => {
    const percentage = (count / limit) * 100;
    const color = getProgressColor(count, limit);
    
    return (
      <Card 
        sx={{ 
          mb: 2,
          background: alpha(theme.palette[color].main, 0.1),
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[4]
          }
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            {getAppointmentTypeIcon(type)}
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {getAppointmentTypeLabel(type)}
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h4" sx={{ mr: 2, fontWeight: 'bold' }}>
              {count}/{limit}
            </Typography>
            <Chip 
              label={`${percentage.toFixed(0)}% booked`}
              color={color}
              size="small"
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={percentage} 
            color={color}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4
              }
            }}
          />
        </CardContent>
      </Card>
    );
  };

  const handleAddClick = (type) => {
    setSelectedAppointmentType(type);
    setAddDialogOpen(true);
  };

  const handleAddDialogClose = (success) => {
    setAddDialogOpen(false);
    if (success) {
      fetchBookings(); // Refresh the bookings list
    }
  };

  const renderTable = (type) => {
    const filteredBookings = bookings.filter(b => b.appointmentType === type);
    const count = dailyCounts[type];
    const limit = limits[type];

    return (
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            {type.charAt(0).toUpperCase() + type.slice(1)} Patients ({count}/{limit})
          </Typography>
          <Tooltip title={`Add ${type} patient`}>
            <IconButton
              color="primary"
              onClick={() => handleAddClick(type)}
              disabled={count >= limit}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(count / limit) * 100}
          color={getProgressColor(count, limit)}
          sx={{ mb: 2, height: 10, borderRadius: 5 }}
        />
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Folder Number</TableCell>
                <TableCell>Referral Source</TableCell>
                <TableCell>Date of Birth</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBookings.map((booking) => {
                // Support both flattened and nested patient data
                const firstName = booking.firstName || booking.patient?.firstName || '';
                const lastName = booking.lastName || booking.patient?.lastName || '';
                const folderNumber = booking.folderNumber || booking.patient?.folderNumber || '';
                const dateOfBirth = booking.dateOfBirth || booking.patient?.dateOfBirth || '';
                return (
                  <TableRow key={booking._id}>
                    <TableCell>{`${firstName} ${lastName}`}</TableCell>
                    <TableCell>{folderNumber}</TableCell>
                    <TableCell>{booking.referralSource}</TableCell>
                    <TableCell>{dateOfBirth ? format(new Date(dateOfBirth), 'dd-MM-yyyy') : ''}</TableCell>
                    <TableCell>
                      <Tooltip title="Delete booking">
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteClick(booking)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const findNextAvailableDate = (category) => {
    // Start from today's date instead of selected date
    let currentDate = new Date();
    // Set time to midnight to ensure consistent date comparison
    currentDate.setHours(0, 0, 0, 0);
    
    let found = false;
    let maxAttempts = 365; // Prevent infinite loop

    while (!found && maxAttempts > 0) {
      currentDate = addDays(currentDate, 1);
      if (isDateSelectable(currentDate)) {
        const dateStr = format(currentDate, 'dd-MM-yyyy');
        const count = dailyCounts[category];
        const limit = limits[category];
        
        if (count < limit) {
          found = true;
          setNextAvailableDate(currentDate);
          setSelectedDate(format(currentDate, 'dd-MM-yyyy'));
        }
      }
      maxAttempts--;
    }

    if (!found) {
      setError('No available dates found in the next year');
    }
  };

  const handleNextAvailableClick = () => {
    setCategoryDialogOpen(true);
  };

  const handleCategorySelect = (event) => {
    setSelectedCategory(event.target.value);
  };

  const handleCategoryConfirm = () => {
    if (selectedCategory) {
      findNextAvailableDate(selectedCategory);
      setCategoryDialogOpen(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'new':
        return <PeopleIcon />;
      case 'review':
        return <AssignmentIcon />;
      case 'chronic':
        return <LocalHospitalIcon />;
      default:
        return null;
    }
  };

  const handleDeleteClick = (booking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`http://localhost:3001/api/bookings/${bookingToDelete._id}`);
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
      fetchBookings(); // Refresh the bookings list
    } catch (err) {
      setError('Failed to delete booking');
      console.error(err);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setBookingToDelete(null);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar 
        position="static" 
        color="default" 
        elevation={1}
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            View Bookings
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
        <Grid container spacing={3}>
          {/* Date Picker */}
          <Grid item xs={12} md={6} lg={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
              <DatePicker
                label="Select Date"
                value={selectedDate ? parse(selectedDate, 'dd-MM-yyyy', new Date()) : null}
                onChange={(date) => setSelectedDate(date ? format(date, 'dd-MM-yyyy') : '')}
                format="dd-MM-yyyy"
                sx={{ mb: 3 }}
              />
            </LocalizationProvider>
          </Grid>

          {/* Category Selection Dialog */}
          <Dialog 
            open={categoryDialogOpen} 
            onClose={() => setCategoryDialogOpen(false)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EventAvailableIcon color="primary" />
                <Typography variant="h6">Select Appointment Type</Typography>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <RadioGroup value={selectedCategory} onChange={handleCategorySelect}>
                {Object.entries(limits).map(([category, limit]) => (
                  <FormControlLabel
                    key={category}
                    value={category}
                    control={<Radio />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {getCategoryIcon(category)}
                        <Typography>
                          {getAppointmentTypeLabel(category)}
                        </Typography>
                      </Stack>
                    }
                  />
                ))}
              </RadioGroup>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCategoryConfirm} 
                variant="contained"
                disabled={!selectedCategory}
              >
                Find Next Available Date
              </Button>
            </DialogActions>
          </Dialog>

          {/* Status Cards */}
          <Grid item xs={12} md={4}>
            {renderStatusCard('new', dailyCounts.new, limits.new)}
          </Grid>
          <Grid item xs={12} md={4}>
            {renderStatusCard('review', dailyCounts.review, limits.review)}
          </Grid>
          <Grid item xs={12} md={4}>
            {renderStatusCard('chronic', dailyCounts.chronic, limits.chronic)}
          </Grid>

          {/* Error Alert */}
          {error && (
            <Grid item xs={12}>
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            </Grid>
          )}

          {/* Loading Spinner */}
          {loading ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : (
            <>
              {renderTable('new')}
              {renderTable('review')}
              {renderTable('chronic')}
            </>
          )}
        </Grid>
      </Box>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this booking for {bookingToDelete?.firstName} {bookingToDelete?.lastName}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <AddPatientDialog
        open={addDialogOpen}
        onClose={handleAddDialogClose}
        appointmentType={selectedAppointmentType}
        selectedDate={selectedDate}
      />
    </Box>
  );
};

export default ViewBookings; 