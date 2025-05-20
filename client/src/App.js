import React, { useEffect, useState } from 'react';
import { Container } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BookingForm from './components/BookingForm';
import LandingPage from './components/LandingPage';
import ViewBookings from './components/ViewBookings';
import TestCalendar from './components/TestCalendar';
import ClinicBookingForm from './components/ClinicBookingForm';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';
import { Box } from '@mui/material';



function App() {

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/book" element={<Container><BookingForm /></Container>} />
          <Route path="/view" element={<Container><ViewBookings /></Container>} />
          <Route path="/clinic-booking" element={<Container><ClinicBookingForm /></Container>} />
          <Route path="/test-calendar" element={<Container><TestCalendar /></Container>} />
        </Routes>
      </Router>
    </LocalizationProvider>
  );
}

export default App;
