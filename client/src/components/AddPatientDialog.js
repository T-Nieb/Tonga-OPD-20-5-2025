import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parse } from 'date-fns';
import axios from 'axios';

const AddPatientDialog = ({ open, onClose, appointmentType, selectedDate }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    folderNumber: '',
    referralSource: '',
    appointmentType: appointmentType,
    appointmentDate: selectedDate
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: date ? format(date, 'dd-MM-yyyy') : null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Convert dates to ISO format for API
      const apiData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? format(parse(formData.dateOfBirth, 'dd-MM-yyyy', new Date()), 'yyyy-MM-dd') : null,
        date: format(parse(formData.appointmentDate, 'dd-MM-yyyy', new Date()), 'yyyy-MM-dd'),
        appointmentType: formData.appointmentType || 'new',
        referralSource: formData.referralSource || 'Clinic',
      };
      delete apiData.appointmentDate;

      await axios.post(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/bookings`, apiData);
      onClose(true); // Pass true to indicate success
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add patient');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
      <DialogTitle>Add New Patient</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date of Birth"
                  value={formData.dateOfBirth ? parse(formData.dateOfBirth, 'dd-MM-yyyy', new Date()) : null}
                  onChange={(date) => handleDateChange(date, 'dateOfBirth')}
                  format="dd-MM-yyyy"
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Folder Number"
                name="folderNumber"
                value={formData.folderNumber}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Referral Source</InputLabel>
                <Select
                  name="referralSource"
                  value={formData.referralSource}
                  onChange={handleChange}
                  label="Referral Source"
                >
                  <MenuItem value="Clinic">Clinic</MenuItem>
                  <MenuItem value="Wards">Wards</MenuItem>
                  <MenuItem value="Emergency">Emergency</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Adding...' : 'Add Patient'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddPatientDialog; 