import React, { useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Container, 
  Paper,
  Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import backgroundImg from '../assets/IMG_5230.jpg';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* Overlay for readability */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          bgcolor: 'rgba(255,255,255,0.7)',
          zIndex: 1,
        }}
      />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2 }}>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            py: 4
          }}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              p: 6, 
              width: '100%',
              maxWidth: 600,
              textAlign: 'center',
              background: 'rgba(255,255,255,0.85)'
            }}
          >
            <Typography 
              variant="h3" 
              component="h1" 
              gutterBottom
              sx={{ 
                mb: 4,
                color: 'primary.main',
                fontWeight: 'bold'
              }}
            >
              OPD Booking System
            </Typography>

            <Grid container spacing={4} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<PersonAddIcon />}
                  onClick={() => navigate('/book')}
                  sx={{
                    py: 2,
                    fontSize: '1.2rem',
                    backgroundColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    }
                  }}
                >
                  Book a Patient
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<CalendarMonthIcon />}
                  onClick={() => navigate('/view')}
                  sx={{
                    py: 2,
                    fontSize: '1.2rem',
                    backgroundColor: 'secondary.main',
                    '&:hover': {
                      backgroundColor: 'secondary.dark',
                    }
                  }}
                >
                  View Bookings
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<PersonAddIcon />}
                  onClick={() => navigate('/clinic-booking')}
                  sx={{
                    py: 2,
                    fontSize: '1.2rem',
                    backgroundColor: 'success.main',
                    '&:hover': {
                      backgroundColor: 'success.dark',
                    }
                  }}
                >
                  Bookings from Clinic
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Container>

    </Box>
  );
};

export default LandingPage; 